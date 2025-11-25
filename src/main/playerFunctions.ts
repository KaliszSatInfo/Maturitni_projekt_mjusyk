import fs from 'fs';
import path from 'path';
import musicMetadata from 'music-metadata';
import { app, ipcMain, dialog } from 'electron';

const configPath = path.join(app.getPath('userData'), 'config.json');
const settingsPath = path.join(app.getPath('userData'), 'settings.json');


// PICK A FOLDER
ipcMain.handle('folder:open', async (_event, defaultFolder: string | null) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    defaultPath: defaultFolder || undefined
  });

  if (canceled) return null;
  return filePaths[0];
});


// READ AUDIO FILES
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

// LOAD ALBUM ART
ipcMain.handle('file:getAlbumArt', async (_event, filePath: string) => {
  try {
    const metadata = await musicMetadata.parseFile(filePath);
    const picture = metadata.common.picture?.[0];
    if (!picture) return null;
    return `data:${picture.format};base64,${picture.data.toString('base64')}`;
  } catch (err) {
    console.error('Error reading metadata', filePath, err);
    return null;
  }
});


// SAVE MULTIPLE FOLDERS
ipcMain.handle('config:saveFolders', async (_event, folders: string[]) => {
  const uniqueFolders = Array.from(new Set(folders));
  try {
    fs.writeFileSync(configPath, JSON.stringify({ musicFolders: uniqueFolders }, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving config:', err);
    return false;
  }
});


// LOAD MULTIPLE FOLDERS
ipcMain.handle('config:loadFolders', async () => {
  try {
    if (!fs.existsSync(configPath)) return [];
    const raw = fs.readFileSync(configPath, 'utf8');
    const data = JSON.parse(raw);
    return data.musicFolders ?? [];
  } catch (err) {
    console.error('Error loading config:', err);
    return [];
  }
});

//LOAD METADATA
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

// LOAD SETTINGS FOR POŘADÍ OF METADATA COLUMNS
ipcMain.handle('settings:load', async () => {
  try {
    if (!fs.existsSync(settingsPath)) return {};
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading settings', err);
    return {};
  }
});

// SAVE SETTINGS FOR POŘADÍ OF METADATA COLUMNS
ipcMain.handle('settings:save', async (_event, settings: any) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving settings', err);
    return false;
  }
});
