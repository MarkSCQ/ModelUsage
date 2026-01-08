/**
 * LLM Usage Tracker - Electron Main Process
 */

import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import os from 'os'
import { SessionParser, closeDatabase } from './parser'
import { getDatabase } from './database'

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV !== 'production' || process.argv.includes('--dev')

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 320,
    minHeight: 100,
    frame: false,
    transparent: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#08080c',
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// Window control handlers
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window-close', () => {
  mainWindow?.close()
})

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false
})

ipcMain.handle('window-resize', (_event, width: number, height: number) => {
  if (mainWindow) {
    // Unmaximize first if maximized
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    }
    mainWindow.setSize(width, height)
    mainWindow.center()
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Close database when quitting
app.on('will-quit', () => {
  closeDatabase()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC Handlers for data
const parser = new SessionParser()

ipcMain.handle('get-all-usage', async () => {
  try {
    const usage = await parser.getAllUsage()
    return { success: true, data: usage }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('get-sessions', async (_event, provider: string) => {
  try {
    const sessions = await parser.getSessions(provider as 'claude' | 'codex' | 'gemini')
    return { success: true, data: sessions }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('refresh-data', async () => {
  try {
    parser.clearCache()
    const usage = await parser.getAllUsage()
    return { success: true, data: usage }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Get platform info
ipcMain.handle('get-platform', () => {
  return os.platform() // 'linux', 'win32', 'darwin'
})

// Get database stats
ipcMain.handle('get-db-stats', async () => {
  return await parser.getDbStats()
})

// Settings handlers
ipcMain.handle('save-setting', async (_event, key: string, value: string) => {
  try {
    const db = await getDatabase()
    db.saveSetting(key, value)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('get-setting', async (_event, key: string, defaultValue: string = '') => {
  try {
    const db = await getDatabase()
    const value = db.getSetting(key, defaultValue)
    return { success: true, value }
  } catch (error) {
    return { success: false, error: (error as Error).message, value: defaultValue }
  }
})

