import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  openFolder: (defaultFolder?: string) => ipcRenderer.invoke('folder:open', defaultFolder),
  readFolder: (folderPath: string) => ipcRenderer.invoke('folder:read', folderPath),
  getAlbumArt: (filePath: string) => ipcRenderer.invoke('file:getAlbumArt', filePath),

  saveFolders: (folders: string[]) => ipcRenderer.invoke('config:saveFolders', folders),
  loadFolders: () => ipcRenderer.invoke('config:loadFolders'),
  getMetadata: (filePath: string) => ipcRenderer.invoke('file:getMetadata', filePath)
});


/*import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
*/
