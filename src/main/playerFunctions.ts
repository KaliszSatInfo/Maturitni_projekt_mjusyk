import fs from 'fs';
import path from 'path';
import musicMetadata from 'music-metadata';
import { app, ipcMain, dialog } from 'electron';

const configPath = path.join(app.getPath('userData'), 'config.json');
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const playlistsPath = path.join(app.getPath('userData'), 'playlists.json');

ipcMain.handle('folder:open', async (_event, defaultFolder: string | null) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    defaultPath: defaultFolder || undefined
  });
  if (canceled) return null;
  return filePaths[0];
});

ipcMain.handle('folder:read', async (_event, folderPath: string) => {
  if (!folderPath) return [];
  const audioExtensions = ['.mp3', '.flac', '.wav', '.ogg'];
  try {
    const files = fs.readdirSync(folderPath).filter(file =>
      audioExtensions.includes(path.extname(file).toLowerCase())
    );
    return files.map(f => path.join(folderPath, f));
  } catch (err) {
    console.error('Error reading folder', err);
    return [];
  }
});

ipcMain.handle('file:getAlbumArt', async (_event, filePath: string) => {
  try {
    const metadata = await musicMetadata.parseFile(filePath);
    const picture = metadata.common.picture?.[0];
    if (!picture) return null;
    return `data:${picture.format};base64,${picture.data.toString('base64')}`;
  } catch (err) {
    console.error('Error reading album art', filePath, err);
    return null;
  }
});

ipcMain.handle('file:getMetadata', async (_event, filePath: string) => {
  try {
    const metadata = await musicMetadata.parseFile(filePath);
    return {
      title: metadata.common.title ?? '',
      artist: metadata.common.artist ?? '',
      album: metadata.common.album ?? '',
      genre: metadata.common.genre?.join(', ') ?? '',
      year: metadata.common.year ?? '',
      trackNumber: metadata.common.track?.no ?? '',
      diskNumber: metadata.common.disk?.no ?? '',
      duration: metadata.format.duration ?? ''
    };
  } catch (err) {
    console.error('Error reading metadata', filePath, err);
    return {};
  }
});

ipcMain.handle('config:saveFolders', async (_event, folders: string[]) => {
  try {
    const uniqueFolders = Array.from(new Set(folders));
    fs.writeFileSync(configPath, JSON.stringify({ musicFolders: uniqueFolders }, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving config:', err);
    return false;
  }
});

ipcMain.handle('config:loadFolders', async () => {
  try {
    if (!fs.existsSync(configPath)) return [];
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw).musicFolders ?? [];
  } catch (err) {
    console.error('Error loading config:', err);
    return [];
  }
});

ipcMain.handle('settings:save', async (_event, settings: any) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving settings', err);
    return false;
  }
});

ipcMain.handle('settings:load', async () => {
  try {
    if (!fs.existsSync(settingsPath)) return {};
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch (err) {
    console.error('Error loading settings', err);
    return {};
  }
});

ipcMain.handle('playlist:load', async () => {
  try {
    return loadPlaylists();
  } catch (err) {
    console.error('Error loading playlists', err);
    return [];
  }
});

ipcMain.handle('playlist:save', async (_event, playlists: any[]) => {
  try {
    savePlaylists(playlists);
    return true;
  } catch (err) {
    console.error('Error saving playlists', err);
    return false;
  }
});

export function loadPlaylists(): any[] {
  if (!fs.existsSync(playlistsPath)) return [];
  return JSON.parse(fs.readFileSync(playlistsPath, 'utf-8'));
}

export function savePlaylists(playlists: any[]) {
  fs.writeFileSync(playlistsPath, JSON.stringify(playlists, null, 2));
}