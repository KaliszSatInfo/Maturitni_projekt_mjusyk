import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      [x: string]: any;
      playlists: any;
      
      openFolder: (defaultFolder?: string) => Promise<string[] | null>;
      readFolder: (folderPaths: string[]) => Promise<string[]>;
      getAlbumArt: (filePath: string) => Promise<string | null>;
      getMetadata: (filePath: string) => Promise<any>;

      saveFolders: (folders: string[]) => Promise<boolean>;
      loadFolders: () => Promise<string[]>;

      saveSettings: (settings: any) => Promise<boolean>;
      loadSettings: () => Promise<any>;

      loadPlaylists: () => Promise<any[]>;
      savePlaylists: (playlists: any[]) => Promise<boolean>;

      playlists: {
        export: (playlist: any) => Promise<boolean>;
        import: () => Promise<any>;
      };

      setQueue: (queue: string[]) => Promise<boolean>;
      getQueue: () => Promise<string[]>;
      setIndex: (i: number) => Promise<boolean>;
      getCurrentIndex: () => Promise<number>;

      playTrack: (queue: string[], index: number) => void;
      onLoadQueue: (callback: (data: { queue: string[]; index: number }) => void) => void;
    }
  }
}