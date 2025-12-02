import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { getGameInstallDir } from './steam'

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

        console.log(`Launching game: "${gamePath}" with args: ${argsArray} in ${cwd}`)

        try {
            // Use spawn with shell: true to avoid EACCES issues on Windows
            // We quote the gamePath to handle spaces safely when using shell: true
            const child = spawn(`"${gamePath}"`, argsArray, {
                cwd,
                detached: true,
                shell: true,
                windowsVerbatimArguments: true // Helps with argument parsing on Windows
            })

            child.on('error', (err) => {
                console.error('Failed to start game:', err)
            })

            // When using shell: true and detached, we might not get exit codes reliably
            // but we can try to listen for 'close'
            child.on('close', (code) => {
                console.log(`Game process closed with code ${code}`)
                if (mainWindow) {
                    mainWindow.webContents.send('game-exited', code)
                }
            })

            child.unref()

            return { success: true }
        } catch (error: any) {
            console.error('Launch error:', error)
            return { success: false, error: error.message }
        }
    })


    // Handle launching via Steam protocol (now using auto-detected path)
    ipcMain.handle('launch-steam-game', async (_, args: string, gameMode: 'crusader' | 'extreme' = 'crusader') => {
        console.log('Attempting to auto-detect game path...')
        const installDir = getGameInstallDir()

        if (!installDir) {
            console.error('Could not detect game install directory')
            // Fallback to steam:// protocol if detection fails
            const encodedArgs = encodeURIComponent(args).replace(/%2B/g, '+')
            const url = `steam://run/40970//${encodedArgs}`
            console.log('Fallback to Steam URL:', url)
            try {
                await shell.openExternal(url)
                return { success: true }
            } catch (error: any) {
                return { success: false, error: error.message }
            }
        }

        // Determine the executable based on game mode
        const exeName = gameMode === 'extreme' ? 'Stronghold_Crusader_Extreme.exe' : 'Stronghold Crusader.exe'
        const gamePath = path.join(installDir, exeName)
        console.log('Auto-detected game path:', gamePath, '(Mode:', gameMode, ')')

        if (!fs.existsSync(gamePath)) {
            console.error('Executable not found at:', gamePath)
            return { success: false, error: `Executable not found: ${exeName}` }
        }

        // Use the existing spawn logic
        const argsArray = args.split(' ').filter(arg => arg.length > 0)

        try {
            const child = spawn(`"${gamePath}"`, argsArray, {
                cwd: installDir,
                detached: true,
                shell: true,
                windowsVerbatimArguments: true
            })

            child.unref()
            return { success: true }
        } catch (error: any) {
            console.error('Launch error:', error)
            return { success: false, error: error.message }
        }
    })
}
