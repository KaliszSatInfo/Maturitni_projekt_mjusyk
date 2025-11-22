import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      openFolder: () => Promise<string | null>;
      readFolder: (folderPath: string) => Promise<string[]>;
      getAlbumArt: (filePath: string) => Promise<string | null>;
    };
  }
}