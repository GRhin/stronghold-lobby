import { ipcMain, dialog, BrowserWindow } from 'electron'
import { execFile } from 'child_process'
import path from 'path'
import fs from 'fs'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow) {
    mainWindow = win
}

export function setupGameHandlers() {
    // Handle selecting the game path
    ipcMain.handle('select-game-path', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Executables', extensions: ['exe'] }]
        })

        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0]
        }
        return null
    })

    // Handle launching the game
    ipcMain.handle('launch-game', async (_, gamePath: string, args: string) => {
        if (!fs.existsSync(gamePath)) {
            throw new Error('Game executable not found')
        }

        const argsArray = args.split(' ').filter(arg => arg.length > 0)
        const cwd = path.dirname(gamePath)

        console.log(`Launching game: ${gamePath} with args: ${argsArray} in ${cwd}`)

        try {
            const child = execFile(gamePath, argsArray, { cwd })

            child.on('error', (err) => {
                console.error('Failed to start game:', err)
            })

            child.on('exit', (code) => {
                console.log(`Game exited with code ${code}`)
                if (mainWindow) {
                    mainWindow.webContents.send('game-exited', code)
                }
            })

            return { success: true }
        } catch (error: any) {
            console.error('Launch error:', error)
            return { success: false, error: error.message }
        }
    })
}
