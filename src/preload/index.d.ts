import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      openFolder: (defaultFolder?: string) => Promise<string | null>;
      readFolder: (folderPath: string) => Promise<string[]>;
      getAlbumArt: (filePath: string) => Promise<string | null>;
      getMetadata: (filePath: string) => Promise<any>;

      saveFolders: (folders: string[]) => Promise<boolean>;
      loadFolders: () => Promise<string[]>;

      saveSettings: (settings: any) => Promise<boolean>;
      loadSettings: () => Promise<any>;

      loadPlaylists: () => Promise<any[]>;
      savePlaylists: (playlists: any[]) => Promise<boolean>;
    }
  }
}