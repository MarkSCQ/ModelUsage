"use strict";
/**
 * LLM Usage Tracker - Electron Main Process
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const parser_1 = require("./parser");
const database_1 = require("./database");
let mainWindow = null;
const isDev = process.env.NODE_ENV !== 'production' || process.argv.includes('--dev');
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1100,
        height: 750,
        minWidth: 320,
        minHeight: 100,
        frame: false,
        transparent: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
        backgroundColor: '#08080c',
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
}
// Window control handlers
electron_1.ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    }
    else {
        mainWindow?.maximize();
    }
});
electron_1.ipcMain.on('window-close', () => {
    mainWindow?.close();
});
electron_1.ipcMain.handle('window-is-maximized', () => {
    return mainWindow?.isMaximized() ?? false;
});
electron_1.ipcMain.handle('window-resize', (_event, width, height) => {
    if (mainWindow) {
        // Unmaximize first if maximized
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        }
        mainWindow.setSize(width, height);
        mainWindow.center();
    }
});
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// Close database when quitting
electron_1.app.on('will-quit', () => {
    (0, parser_1.closeDatabase)();
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// IPC Handlers for data
const parser = new parser_1.SessionParser();
electron_1.ipcMain.handle('get-all-usage', async () => {
    try {
        const usage = await parser.getAllUsage();
        return { success: true, data: usage };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('get-sessions', async (_event, provider) => {
    try {
        const sessions = await parser.getSessions(provider);
        return { success: true, data: sessions };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('refresh-data', async () => {
    try {
        parser.clearCache();
        const usage = await parser.getAllUsage();
        return { success: true, data: usage };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// Get platform info
electron_1.ipcMain.handle('get-platform', () => {
    return os_1.default.platform(); // 'linux', 'win32', 'darwin'
});
// Get database stats
electron_1.ipcMain.handle('get-db-stats', async () => {
    return await parser.getDbStats();
});
// Settings handlers
electron_1.ipcMain.handle('save-setting', async (_event, key, value) => {
    try {
        const db = await (0, database_1.getDatabase)();
        db.saveSetting(key, value);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('get-setting', async (_event, key, defaultValue = '') => {
    try {
        const db = await (0, database_1.getDatabase)();
        const value = db.getSetting(key, defaultValue);
        return { success: true, value };
    }
    catch (error) {
        return { success: false, error: error.message, value: defaultValue };
    }
});
