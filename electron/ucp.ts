import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'

export function setupUCPHandlers() {
    ipcMain.handle('ucp-read-file', async (_, filePath: string) => {
        try {
            return fs.promises.readFile(filePath, 'utf-8')
        } catch (err) {
            console.error('Failed to read file:', err)
            throw err
        }
    })

    ipcMain.handle('ucp-read-binary', async (_, filePath: string) => {
        try {
            return fs.promises.readFile(filePath)
        } catch (err) {
            console.error('Failed to read binary file:', err)
            throw err
        }
    })

    ipcMain.handle('ucp-get-stats', async (_, filePath: string) => {
        try {
            const stats = await fs.promises.stat(filePath)
            return {
                size: stats.size,
                mtime: stats.mtime
            }
        } catch (err) {
            return null
        }
    })

    ipcMain.handle('ucp-zip-folder', async (_, folderPath: string, outputPath?: string) => {
        try {
            if (!fs.existsSync(folderPath)) throw new Error('Folder does not exist')

            const zip = new AdmZip()
            zip.addLocalFolder(folderPath)

            // If output path not provided, return buffer
            if (!outputPath) {
                return zip.toBuffer()
            } else {
                zip.writeZip(outputPath)
                return outputPath
            }
        } catch (err) {
            console.error('Failed to zip folder:', err)
            throw err
        }
    })

    // For joining (client side)
    ipcMain.handle('ucp-backup-file', async (_, filePath: string) => {
        try {
            if (fs.existsSync(filePath)) {
                const backupPath = filePath + '.bak'
                await fs.promises.rename(filePath, backupPath)
                return true
            }
            return false
        } catch (err) {
            console.error('Back up failed:', err)
            throw err
        }
    })

    ipcMain.handle('ucp-restore-file', async (_, filePath: string) => {
        try {
            const backupPath = filePath + '.bak'
            if (fs.existsSync(backupPath)) {
                // Remove current if exists
                if (fs.existsSync(filePath)) {
                    await fs.promises.unlink(filePath)
                }
                await fs.promises.rename(backupPath, filePath)
                return true
            }
            return false
        } catch (err) {
            console.error('Restore failed:', err)
            throw err
        }
    })

    ipcMain.handle('ucp-write-file', async (_, filePath: string, buffer: Buffer) => {
        try {
            // Ensure directory exists
            const dir = path.dirname(filePath)
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true })
            }
            await fs.promises.writeFile(filePath, buffer)
            return true
        } catch (err) {
            console.error('Write failed:', err)
            throw err
        }
    })

    ipcMain.handle('ucp-unzip', async (_, zipPath: string, destPath: string) => {
        try {
            if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true })
            }
            const zip = new AdmZip(zipPath)
            zip.extractAllTo(destPath, true)
            return true
        } catch (err) {
            console.error('Unzip failed:', err)
            throw err
        }
    })
    ipcMain.handle('ucp-delete-file', async (_, filePath: string) => {
        try {
            if (fs.existsSync(filePath)) {
                const stats = await fs.promises.stat(filePath)
                if (stats.isDirectory()) {
                    await fs.promises.rm(filePath, { recursive: true, force: true })
                } else {
                    await fs.promises.unlink(filePath)
                }
                return true
            }
            return false
        } catch (err) {
            console.error('Delete failed:', err)
            throw err
        }
    })
}
