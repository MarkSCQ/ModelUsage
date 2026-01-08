/**
 * Preload script - Exposes IPC to renderer
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getAllUsage: () => ipcRenderer.invoke('get-all-usage'),
  getSessions: (provider) => ipcRenderer.invoke('get-sessions', provider),
  refreshData: () => ipcRenderer.invoke('refresh-data'),
  
  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  windowResize: (width, height) => ipcRenderer.invoke('window-resize', width, height),
  
  // Platform info
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Database stats
  getDbStats: () => ipcRenderer.invoke('get-db-stats'),
  
  // Settings
  saveSetting: (key, value) => ipcRenderer.invoke('save-setting', key, value),
  getSetting: (key, defaultValue) => ipcRenderer.invoke('get-setting', key, defaultValue),
})

