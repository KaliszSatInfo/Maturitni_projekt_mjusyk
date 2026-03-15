import {
  folderPaths,
  loadFoldersState,
  saveFoldersState,
  addFolders,
  removeFolderAt,
  renderFolders
} from './state/folders';

import {
  currentPlaylist,
  loadPlaylistsState,
  savePlaylistsState,
  createPlaylist,
  deletePlaylist,
  renderPlaylists
} from './state/playlists';

import {
  visibleMetadata,
  isTableView,
  loadSettingsState,
  saveSettingsState,
  toggleTableView,
  collapsedSections,
} from './state/settings';

import { songCache, pruneCache } from './state/cache';
import { renderGridView } from './ui/gridView';
import { renderTableView } from './ui/tableView';
import { showSongContextMenu } from './ui/contextMenu';
import { showStatsModal } from './ui/statsView';
import { renderMetadataOptions } from './ui/metadaOptions';

// -----------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------
const chooseBtn = document.getElementById('choose-folder')!;
const grid = document.getElementById('file-grid')!;
const folderList = document.getElementById('folder-list')!;
const toggleBtn = document.getElementById('toggle-view')!;
const loader = document.getElementById('loader')!;
const playlistContainer = document.getElementById('playlist-list')!;
const newPlaylistBtn = document.getElementById('new-playlist')!;
const playlistModal = document.getElementById('new-playlist-modal')!;
const playlistInput = document.getElementById('playlist-name-input') as HTMLInputElement;
const playlistCreateBtn = document.getElementById('playlist-create-btn')!;
const playlistCancelBtn = document.getElementById('playlist-cancel-btn')!;
const importPlaylistBtn = document.getElementById('import-playlist')!;
const statsBtn = document.getElementById('show-stats')!;
const metadataOptions = document.getElementById('metadata-options')!;

// -----------------------------------------------------------------------------------
// Section toggle setup
// -----------------------------------------------------------------------------------
function initSectionToggles() {
  const sections = document.querySelectorAll('.section-header');
  
  sections.forEach(header => {
    const section = header.closest('.section')!;
    const sectionName = header.querySelector('span:nth-child(2)')?.textContent?.toLowerCase() || '';
    const toggle = header.querySelector('.section-toggle')!;
    const content = section.querySelector('.section-content')!;
    
    if (collapsedSections.has(sectionName)) {
      toggle.classList.add('collapsed');
      content.classList.add('hidden');
    }
    
    header.addEventListener('click', async () => {
      const isCollapsed = content.classList.contains('hidden');
      
      if (isCollapsed) {
        collapsedSections.delete(sectionName);
        toggle.classList.remove('collapsed');
        content.classList.remove('hidden');
      } else {
        collapsedSections.add(sectionName);
        toggle.classList.add('collapsed');
        content.classList.add('hidden');
      }
      
      await saveSettingsState();
    });
  });
}

// -----------------------------------------------------------------------------------
// Init thingies
// -----------------------------------------------------------------------------------
(async () => {
  await loadFoldersState();
  await loadSettingsState();
  await loadPlaylistsState();

  initSectionToggles();

  renderFolderList();
  renderPlaylistList();

  renderMetadataOptions(metadataOptions, loadAllMusic);

  toggleBtn.textContent = isTableView ? 'Switch to Grid View' : 'Switch to Table View';

  await loadAllMusic();
})();

// -----------------------------------------------------------------------------------
// Folder stuff
// -----------------------------------------------------------------------------------
chooseBtn.addEventListener('click', async () => {
  const folders = await window.api.openFolder();
  if (!folders) return;

  const changed = addFolders(folders);
  if (changed) {
    await saveFoldersState();
    renderFolderList();
    await loadAllMusic();
  }
});

function renderFolderList() {
  renderFolders(folderList, async (idx) => {
    removeFolderAt(idx);
    await saveFoldersState();
    renderFolderList();
    await loadAllMusic();
  });
}

// -----------------------------------------------------------------------------------
// Playlists
// -----------------------------------------------------------------------------------
function renderPlaylistList() {
  renderPlaylists(
    playlistContainer,
    async () => {
      renderPlaylistList();
      await loadAllMusic();
    },
    async (index) => {
      deletePlaylist(index);
      await savePlaylistsState();
      renderPlaylistList();
      await loadAllMusic();
    },
    async (playlist) => {
      const ok = await window.api.playlists.export(playlist);
      if (!ok) console.error('Playlist export failed');
    }
  );
}

newPlaylistBtn.addEventListener('click', () => {
  playlistInput.value = '';
  playlistModal.style.display = 'flex';
});

playlistCancelBtn.addEventListener('click', () => {
  playlistModal.style.display = 'none';
});

playlistCreateBtn.addEventListener('click', async () => {
  const name = playlistInput.value.trim();
  if (!name) return;

  createPlaylist(name);
  await savePlaylistsState();
  playlistModal.style.display = 'none';
  renderPlaylistList();
});

// -----------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------
async function loadAllMusic() {
  loader.style.display = 'flex';
  grid.innerHTML = '';

  let files = await window.api.readFolder(folderPaths);
  files = currentPlaylist
    ? files.filter(f => currentPlaylist!.songPaths.includes(f))
    : files;

  const currentFiles = new Set<string>();

  for (const filePath of files) {
    currentFiles.add(filePath);

    if (!songCache[filePath]) {
      const raw = await window.api.getMetadata(filePath);
      const art = await window.api.getAlbumArt(filePath);
      songCache[filePath] = { metadata: raw, albumArt: art };
    }
  }

  pruneCache(currentFiles);

  const onPlay = (files: string[], index: number) =>
    window.api.playTrack(files, index);

  const onContextMenu = (x: number, y: number, filePath: string) =>
    showSongContextMenu(x, y, filePath, loadAllMusic);

  if (isTableView) {
    renderTableView(
      grid,
      files,
      songCache,
      visibleMetadata,
      onPlay,
      onContextMenu,
      () => loadAllMusic()
    );
  } else {
    renderGridView(grid, files, songCache, onPlay, onContextMenu);
  }

  loader.style.display = 'none';
}

// -----------------------------------------------------------------------------------
// Switcheroo of views
// -----------------------------------------------------------------------------------
toggleBtn.addEventListener('click', async () => {
  toggleTableView();
  toggleBtn.textContent = isTableView ? 'Switch to Grid View' : 'Switch to Table View';
  await loadAllMusic();
  await saveSettingsState();
});

// -----------------------------------------------------------------------------------
// Imports and stats
// -----------------------------------------------------------------------------------
importPlaylistBtn.addEventListener('click', async () => {
  const imported = await window.api.playlists.import();
  if (!imported) return;

  await loadPlaylistsState();
  renderPlaylistList();
  await loadAllMusic();
});

statsBtn.addEventListener('click', showStatsModal);

// -----------------------------------------------------------------------------------
// Mini-player mode toggler
// -----------------------------------------------------------------------------------
const miniPlayerToggleBtn = document.getElementById('toggle-mini-player')!;
const miniPlayerCloseBtn = document.getElementById('toggle-mini-player-close')!;

miniPlayerToggleBtn.addEventListener('click', async () => {
  await window.api.setMiniPlayer(true);
  document.body.classList.add('mini-player-mode');
  miniPlayerToggleBtn.style.display = 'none';
  miniPlayerCloseBtn.style.display = 'block';
});

miniPlayerCloseBtn.addEventListener('click', async () => {
  await window.api.setMiniPlayer(false);
  document.body.classList.remove('mini-player-mode');
  miniPlayerToggleBtn.style.display = 'block';
  miniPlayerCloseBtn.style.display = 'none';
});
