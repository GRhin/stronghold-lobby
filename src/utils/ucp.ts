import yaml from 'js-yaml'

export interface UCPConfig {
    'config-full'?: {
        modules?: Record<string, any>
        plugins?: Record<string, any>
        'load-order'?: Array<{ extension: string, version: string }>
    }
}

// CORE_DLLS are now handled by UCP3 GUI installation and skipped in our sync

// Determine the server URL based on environment
const isDevelopment = import.meta.env.DEV
const CACHED_SERVER_URL = isDevelopment
    ? 'http://localhost:3000'
    : 'https://stronghold-lobby.onrender.com'

const SYNC_HISTORY_FILE = '.ucp-sync-history.json'

const getGameDir = (path: string) => {
    // If path points to an executable, strip it to get directory
    // Basic check for .exe extension
    if (path.toLowerCase().endsWith('.exe')) {
        return path.substring(0, path.lastIndexOf('\\'))
    }
    return path
}

export const getUCPConfig = async (inputPath: string): Promise<UCPConfig | null> => {
    const gamePath = getGameDir(inputPath)
    try {
        const content = await window.electron.ucpReadFile(gamePath + '\\ucp-config.yml')
        return yaml.load(content) as UCPConfig
    } catch (err) {
        console.error('Failed to parse ucp-config:', err)
        return null
    }
}

const UPLOAD_CHUNK_SIZE = 25 * 1024 * 1024 // 25MB (safer for proxy limits)

export const uploadFile = async (lobbyId: string, blob: Blob, filename: string) => {
    // If file is large, use chunked upload
    if (blob.size > UPLOAD_CHUNK_SIZE) {
        const totalChunks = Math.ceil(blob.size / UPLOAD_CHUNK_SIZE)
        console.log(`File ${filename} is too large (${(blob.size / 1024 / 1024).toFixed(2)}MB). Uploading in ${totalChunks} chunks.`)

        for (let i = 0; i < totalChunks; i++) {
            const start = i * UPLOAD_CHUNK_SIZE
            const end = Math.min(start + UPLOAD_CHUNK_SIZE, blob.size)
            const chunk = blob.slice(start, end)

            const formData = new FormData()
            formData.append('chunk', chunk, `chunk-${i}`) // Multer uses this name for temp file
            formData.append('filename', filename)
            formData.append('chunkIndex', i.toString())
            formData.append('totalChunks', totalChunks.toString())

            const response = await fetch(`${CACHED_SERVER_URL}/api/lobby/${lobbyId}/upload_chunk`, {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error(`Chunk ${i}/${totalChunks} upload failed: ${response.status} ${response.statusText}`)
            }
            console.log(`Uploaded chunk ${i + 1}/${totalChunks} for ${filename}`)
        }
        return { success: true }
    } else {
        const formData = new FormData()
        formData.append('file', blob, filename)

        const response = await fetch(`${CACHED_SERVER_URL}/api/lobby/${lobbyId}/upload`, {
            method: 'POST',
            body: formData
        })

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
        }
        return response.json()
    }
}


export const syncUCP = async (
    lobbyId: string,
    inputPath: string,
    onProgress: (status: string) => void
) => {
    const gamePath = getGameDir(inputPath)
    onProgress('Reading Configuration...')
    const config = await getUCPConfig(gamePath)
    if (!config) throw new Error('Could not read ucp-config.yml')

    // Fetch GitHub extensions cache
    onProgress('Checking GitHub extensions store...')
    let githubExtensions: Map<string, any> = new Map()
    try {
        const response = await fetch(`${CACHED_SERVER_URL}/api/github_extensions`)
        const data = await response.json()
        if (data.success && data.extensions) {
            githubExtensions = new Map(data.extensions.map((ext: any) => [ext.name, ext]))
            console.log(`Found ${githubExtensions.size} extensions on GitHub - will skip uploading these`)
        } else {
            console.warn('GitHub extensions cache unavailable:', data.error || 'Unknown error')
            console.log('Will upload all files (GitHub cache not available)')
        }
    } catch (err) {
        console.warn('Failed to fetch GitHub extensions cache:', err)
        console.log('Will upload all files (fallback mode)')
    }

    // Upload ucp-config.yml
    onProgress('Uploading Configuration...')
    const configContent = await window.electron.ucpReadFile(gamePath + '\\ucp-config.yml')
    const configBlob = new Blob([configContent], { type: 'text/yaml' })
    await uploadFile(lobbyId, configBlob, 'ucp-config.yml')

    // CORE_DLLS sync removed - handled by external UCP3 GUI setup

    // Process load-order for modules and plugins
    const loadOrder = config['config-full']?.['load-order']
    if (!loadOrder || loadOrder.length === 0) {
        console.log('No modules/plugins in load-order')
        onProgress('Done!')
        return
    }

    onProgress(`Processing ${loadOrder.length} extensions...`)

    // Track what we upload vs skip
    const skipped: string[] = []
    const uploaded: string[] = []

    for (const item of loadOrder) {
        const ext = item.extension
        const ver = item.version
        const zipName = `${ext}-${ver}.zip`

        // Check if available on GitHub
        if (githubExtensions.has(zipName)) {
            const githubInfo = githubExtensions.get(zipName)
            console.log(`Skipping ${zipName} (available on GitHub, ${(githubInfo.size / 1024 / 1024).toFixed(2)}MB)`)
            skipped.push(zipName)
            continue
        }

        // Not on GitHub - need to upload
        const isModule = config['config-full']?.modules && config['config-full'].modules[ext]
        const isPlugin = config['config-full']?.plugins && config['config-full'].plugins[ext]

        if (isModule) {
            const sigName = `${ext}-${ver}.zip.sig`
            try {
                console.log(`Uploading module ${zipName}`)
                const buf = await window.electron.ucpReadBinary(`${gamePath}\\ucp\\modules\\${zipName}`)
                onProgress(`Uploading module ${zipName}...`)
                await uploadFile(lobbyId, new Blob([buf as any]), zipName)
                uploaded.push(zipName)

                // Try upload sig
                try {
                    const sigBuf = await window.electron.ucpReadBinary(`${gamePath}\\ucp\\modules\\${sigName}`)
                    await uploadFile(lobbyId, new Blob([sigBuf as any]), sigName)
                } catch {
                    console.log(`No signature for ${zipName}`)
                }
            } catch (e) {
                console.warn(`Module file missing: ${zipName}`, e)
            }
        } else if (isPlugin) {
            const pluginFolder = `${ext}-${ver}`
            const fullPath = `${gamePath}\\ucp\\plugins\\${pluginFolder}`

            onProgress(`Zipping plugin ${pluginFolder}...`)
            console.log(`Zipping plugin ${pluginFolder} at ${fullPath}`)

            try {
                const zipBuf = await window.electron.ucpZipFolder(fullPath)
                if (zipBuf) {
                    onProgress(`Uploading plugin ${pluginFolder}...`)
                    await uploadFile(lobbyId, new Blob([zipBuf as any]), zipName)
                    uploaded.push(zipName)
                }
            } catch (e) {
                console.warn(`Plugin folder missing: ${pluginFolder}`, e)
            }
        }
    }

    console.log(`Upload complete: ${uploaded.length} uploaded, ${skipped.length} skipped (on GitHub)`)
    onProgress('Done!')
}


export interface FileDiff {
    file: string
    reason: 'missing' | 'size_mismatch' | 'version_mismatch'
    type: 'config' | 'dll' | 'module' | 'plugin'
    serverSize?: number
    sourceUrl?: string
}

export const checkDiff = async (lobbyId: string, inputPath: string): Promise<FileDiff[]> => {
    const gamePath = getGameDir(inputPath)
    console.log(`[UCP Sync] Checking for differences in: ${gamePath}`)
    // 1. Get Server Manifest
    const res = await fetch(`${CACHED_SERVER_URL}/api/lobby/${lobbyId}/manifest`)
    if (!res.ok) return []
    const data = await res.json()
    const serverFiles: Array<{ name: string, size: number }> = data.files

    if (!serverFiles || serverFiles.length === 0) return []

    const diffs: FileDiff[] = []

    // 2. Check UCP Config
    const configName = 'ucp-config.yml'
    const serverConfig = serverFiles.find(f => f.name === configName)
    let remoteConfig: UCPConfig | null = null

    if (serverConfig) {
        const configUrl = `${CACHED_SERVER_URL}/api/lobby/${lobbyId}/file/${configName}`
        const configRes = await fetch(configUrl)
        if (configRes.ok) {
            const serverConfigContent = await configRes.text()
            const localConfigContent = await window.electron.ucpReadFile(gamePath + '\\ucp-config.yml').catch(() => '')

            const localConfig = yaml.load(localConfigContent) as UCPConfig
            remoteConfig = yaml.load(serverConfigContent) as UCPConfig

            let configDifferent = false
            const remoteLoadOrder = remoteConfig['config-full']?.['load-order']
            const localLoadOrder = localConfig?.['config-full']?.['load-order']

            if (remoteLoadOrder) {
                for (const item of remoteLoadOrder) {
                    const localItem = localLoadOrder?.find(i => i.extension === item.extension)
                    if (!localItem || localItem.version !== item.version) {
                        configDifferent = true
                        break
                    }
                }
            }

            if (configDifferent || !localConfig) {
                diffs.push({ file: configName, reason: 'version_mismatch', type: 'config' })
            }
        }
    }

    // 3. Check for specific files required by the remote config
    if (remoteConfig) {
        const remoteLoadOrder = remoteConfig['config-full']?.['load-order'] || []

        // Fetch GitHub extensions cache for verification
        let githubExtensions: Map<string, any> = new Map()
        try {
            const githubRes = await fetch(`${CACHED_SERVER_URL}/api/github_extensions`)
            const githubData = await githubRes.json()
            if (githubData.success && githubData.extensions) {
                githubExtensions = new Map(githubData.extensions.map((ext: any) => [ext.name, ext]))
            }
        } catch (err) {
            console.warn('GitHub extensions cache unavailable during checkDiff')
        }

        for (const item of remoteLoadOrder) {
            const ext = item.extension
            const ver = item.version
            const zipName = `${ext}-${ver}.zip`

            // Determine type
            const isModule = remoteConfig['config-full']?.modules?.[ext] !== undefined
            const type: FileDiff['type'] = isModule ? 'module' : 'plugin'

            if (isModule) {
                // Modules check: ucp/modules/<name>-<ver>.zip
                const localZipPath = gamePath + '\\ucp\\modules\\' + zipName
                const stats = await window.electron.ucpGetStats(localZipPath)
                const sFile = serverFiles.find(f => f.name === zipName)
                const gFile = githubExtensions.get(zipName)

                if (!stats) {
                    diffs.push({
                        file: zipName,
                        reason: 'missing',
                        type,
                        serverSize: sFile?.size || gFile?.size,
                        sourceUrl: sFile ? undefined : gFile?.downloadUrl
                    })
                } else if (sFile && stats.size !== sFile.size) {
                    diffs.push({ file: zipName, reason: 'size_mismatch', type, serverSize: sFile.size })
                }
            } else {
                // Plugins check: ucp/plugins/<name>-<ver> folder
                const folderName = `${ext}-${ver}`
                const localFolderPath = gamePath + '\\ucp\\plugins\\' + folderName
                const stats = await window.electron.ucpGetStats(localFolderPath)
                const gFile = githubExtensions.get(zipName)
                const sFile = serverFiles.find(f => f.name === zipName)

                if (!stats) {
                    diffs.push({
                        file: zipName,
                        reason: 'missing',
                        type,
                        sourceUrl: sFile ? undefined : gFile?.downloadUrl
                    })
                }
            }
        }
    }

    // CORE_DLLS check removed - handled by external UCP3 GUI setup

    console.log(`[UCP Sync] Check complete. Found ${diffs.length} differences.`)
    return diffs
}

export const downloadUpdates = async (
    lobbyId: string,
    inputPath: string,
    diffs: FileDiff[],
    onProgress: (status: string) => void
) => {
    const gamePath = getGameDir(inputPath)
    console.log(`[UCP Sync] Starting download of ${diffs.length} updates to: ${gamePath}`)
    // 1. Download Config if needed
    const configDiff = diffs.find(d => d.type === 'config')
    if (configDiff) {
        onProgress('Backing up config...')
        await window.electron.ucpBackupFile(gamePath + '\\ucp-config.yml')

        onProgress('Downloading config...')
        console.log(`[UCP Sync] Downloading config...`)
        await window.electron.downloadFile(
            `${CACHED_SERVER_URL}/api/lobby/${lobbyId}/file/ucp-config.yml`,
            'ucp-config.yml',
            gamePath
        )
    }

    // 2. Download others
    const addedFiles: string[] = []

    for (const diff of diffs) {
        if (diff.type === 'config') continue

        let targetDir = gamePath
        if (diff.type === 'dll') targetDir = gamePath
        if (diff.type === 'module') targetDir = gamePath + '\\ucp\\modules'
        if (diff.type === 'plugin') targetDir = gamePath + '\\ucp\\plugins'

        const filename = diff.file
        const fullPath = targetDir + '\\' + filename

        console.log(`[UCP Sync] Processing ${diff.type}: ${filename} (${diff.reason})`)

        // Check if file exists before downloading (to track additions)
        const stats = await window.electron.ucpGetStats(fullPath)
        const exists = !!stats

        // Backup if exists (and size mismatch)
        if (exists && diff.reason === 'size_mismatch' && diff.type !== 'plugin') {
            await window.electron.ucpBackupFile(fullPath)
        } else if (!exists) {
            // Track as added
            if (diff.type === 'plugin') {
                addedFiles.push(targetDir + '\\' + filename.replace('.zip', ''))
            } else {
                addedFiles.push(fullPath)
            }
        }

        onProgress(`Downloading ${filename}...`)
        const downloadUrl = diff.sourceUrl || `${CACHED_SERVER_URL}/api/lobby/${lobbyId}/file/${filename}`

        if (diff.type === 'plugin') {
            const zipPath = await window.electron.downloadFile(
                downloadUrl,
                filename,
                targetDir
            )
            onProgress(`Installing plugin ${filename}...`)
            const pluginDir = targetDir + '\\' + filename.replace('.zip', '')
            await window.electron.ucpUnzip(zipPath, pluginDir)
            // Cleanup the zip itself since we track the folder
            await window.electron.ucpDeleteFile(zipPath)
        } else {
            await window.electron.downloadFile(
                downloadUrl,
                filename,
                targetDir
            )
        }
    }

    // Save added files history
    if (addedFiles.length > 0) {
        try {
            const historyPath = gamePath + '\\' + SYNC_HISTORY_FILE
            const existingHistoryData = await window.electron.ucpReadFile(historyPath).catch(() => '{"addedFiles":[]}')
            const history = JSON.parse(existingHistoryData)
            history.addedFiles = Array.from(new Set([...history.addedFiles, ...addedFiles]))
            const buffer = new TextEncoder().encode(JSON.stringify(history))
            await window.electron.ucpWriteFile(historyPath, (buffer as any)) // Cast to any to bypass potential Electron Buffer mismatch
        } catch (err) {
            console.error('Failed to save sync history:', err)
        }
    }

    onProgress('Sync Complete!')
    console.log('[UCP Sync] Download updates finished successfully')
}

export const restoreBackups = async (inputPath: string) => {
    const gamePath = getGameDir(inputPath)

    // 1. Restore Backup Files
    // Config
    await window.electron.ucpRestoreFile(gamePath + '\\ucp-config.yml')

    // DLLs restore removed - handled by external UCP3 GUI setup

    // 2. Cleanup Added Files
    try {
        const historyPath = gamePath + '\\' + SYNC_HISTORY_FILE
        const historyData = await window.electron.ucpReadFile(historyPath).catch(() => null)
        if (historyData) {
            const history = JSON.parse(historyData)
            if (history.addedFiles && Array.isArray(history.addedFiles)) {
                console.log(`Cleaning up ${history.addedFiles.length} added files/folders...`)
                for (const filePath of history.addedFiles) {
                    await window.electron.ucpDeleteFile(filePath)
                }
            }
            // Delete history file itself
            await window.electron.ucpDeleteFile(historyPath)
        }
    } catch (err) {
        console.error('Failed to cleanup sync history:', err)
    }
}

export const downloadConfigToPath = async (lobbyId: string, customPath: string, onProgress: (status: string) => void) => {
    const gamePath = getGameDir(customPath)
    console.log(`Starting Unified Test Download to: ${gamePath}`)
    onProgress('Starting sync...')
    try {
        // 1. Download Config (matches start of joiner sync)
        onProgress('Downloading configuration...')
        await window.electron.downloadFile(
            `${CACHED_SERVER_URL}/api/lobby/${lobbyId}/file/ucp-config.yml`,
            'ucp-config.yml',
            gamePath
        )

        // 2. Run Difference Check
        onProgress('Analyzing requirements...')
        const diffs = await checkDiff(lobbyId, customPath)
        console.log('Sync differences identified:', diffs)

        // 3. Download Updates (The main sync step)
        if (diffs.length > 0) {
            onProgress(`Syncing ${diffs.length} components...`)
            await downloadUpdates(lobbyId, customPath, diffs, onProgress)
        } else {
            console.log('No differences found, everything up to date.')
            onProgress('Already up to date!')
        }

        console.log('Unified Test Download completed successfully')
        onProgress('Done!')
    } catch (err: any) {
        console.error('Unified Test Download failed:', err)
        onProgress('Error: ' + err.message)
        throw err
    }
}
