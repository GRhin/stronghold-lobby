import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { createWriteStream } from 'fs'
import { Readable } from 'stream'

export function setupDownloaderHandlers() {
    ipcMain.handle('download-file', async (_, url: string, filename: string, targetFolder: string) => {
        try {
            console.log(`Starting download: ${url} -> ${filename}`)

            // Determine target path (default to Downloads if not specified)
            // For this app, we might want specific folders, but we'll let the renderer specify relative paths or absolute
            // If targetFolder is 'maps', we go to Documents/Stronghold Crusader/Maps (example)

            let downloadPath = ''
            if (path.isAbsolute(targetFolder)) {
                downloadPath = targetFolder
            } else if (targetFolder === 'maps') {
                downloadPath = path.join(app.getPath('documents'), 'Stronghold Crusader', 'Maps')
            } else if (targetFolder === 'ucp') {
                downloadPath = path.join(app.getPath('userData'), 'UCP')
            } else {
                downloadPath = path.join(app.getPath('downloads'))
            }

            if (!fs.existsSync(downloadPath)) {
                fs.mkdirSync(downloadPath, { recursive: true })
            }

            const filePath = path.join(downloadPath, filename)

            const response = await fetch(url)
            if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
            if (!response.body) throw new Error('No response body')

            // @ts-ignore - fetch body is a ReadableStream, but pipeline expects Node stream. 
            // In Node 18+, Readable.fromWeb converts it.
            const stream = Readable.fromWeb(response.body as any)
            await pipeline(stream, createWriteStream(filePath))

            console.log(`Download complete: ${filePath}`)
            return filePath
        } catch (error: any) {
            console.error('Download error:', error)
            throw error // Throw so the renderer catch block handles it
        }
    })
}
