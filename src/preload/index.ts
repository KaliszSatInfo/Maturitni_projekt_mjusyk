import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  openFolder: (defaultFolder?: string) => ipcRenderer.invoke('folder:open', defaultFolder),
  readFolder: (folderPath: string) => ipcRenderer.invoke('folder:read', folderPath),
  getAlbumArt: (filePath: string) => ipcRenderer.invoke('file:getAlbumArt', filePath),
  getMetadata: (filePath: string) => ipcRenderer.invoke('file:getMetadata', filePath),
  saveFolders: (folders: string[]) => ipcRenderer.invoke('config:saveFolders', folders),
  loadFolders: () => ipcRenderer.invoke('config:loadFolders'),

  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),
  loadSettings: () => ipcRenderer.invoke('settings:load'),

  loadPlaylists: () => ipcRenderer.invoke('playlist:load'),
  savePlaylists: (playlists: any[]) => ipcRenderer.invoke('playlist:save', playlists),
  playlists: {
    export: (playlist: any) => ipcRenderer.invoke('playlists:export', playlist),
    import: () => ipcRenderer.invoke('playlists:import')
  },

  setQueue: (queue: string[]) => ipcRenderer.invoke("music:setQueue", queue),
  getQueue: () => ipcRenderer.invoke("music:getQueue"),
  setIndex: (i: number) => ipcRenderer.invoke("music:setIndex", i),
  getCurrentIndex: () => ipcRenderer.invoke("music:getCurrentIndex"),

  playTrack: (queue: string[], index: number) => ipcRenderer.send("play-track", { queue, index }),
  onLoadQueue: (callback) => ipcRenderer.on("load-queue", (_, data) => callback(data)),

  readFileDataUrl: (filePath: string) => ipcRenderer.invoke('file:readDataUrl', filePath),
});
