import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  openFolder: (defaultFolder?: string) => ipcRenderer.invoke('folder:open', defaultFolder),
  readFolder: (folderPath: string) => ipcRenderer.invoke('folder:read', folderPath),
  getAlbumArt: (filePath: string) => ipcRenderer.invoke('file:getAlbumArt', filePath),

  saveFolders: (folders: string[]) => ipcRenderer.invoke('config:saveFolders', folders),
  loadFolders: () => ipcRenderer.invoke('config:loadFolders'),
  getMetadata: (filePath: string) => ipcRenderer.invoke('file:getMetadata', filePath),
  
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),
  loadSettings: () => ipcRenderer.invoke('settings:load')
});
