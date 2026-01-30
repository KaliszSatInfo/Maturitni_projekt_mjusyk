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
  formatDuration
} from './state/settings';

import { songCache, pruneCache } from './state/cache';
import { renderGridView } from './ui/gridView';
import { renderTableView } from './ui/tableView';
import { showSongContextMenu } from './ui/contextMenu';

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
const exportPlaylistBtn = document.getElementById('export-playlist')!;
const importPlaylistBtn = document.getElementById('import-playlist')!;
const statsBtn = document.getElementById('show-stats')!;

// -----------------------------------------------------------------------------------
// Init thingies
// -----------------------------------------------------------------------------------
(async () => {
  await loadFoldersState();
  await loadSettingsState();
  await loadPlaylistsState();

  renderFolderList();
  renderPlaylistList();

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
// Playlists (30.01.2026 RIP 100 lines of code)
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
  const tableRows: HTMLTableRowElement[] = [];

  for (const filePath of files) {
    currentFiles.add(filePath);

    if (!songCache[filePath]) {
      const raw = await window.api.getMetadata(filePath);
      const art = await window.api.getAlbumArt(filePath);
      songCache[filePath] = { metadata: raw, albumArt: art };
    }

    const { metadata } = songCache[filePath];
    const tr = document.createElement('tr');

    for (const field of visibleMetadata) {
      const td = document.createElement('td');
      td.textContent =
        field === 'duration'
          ? formatDuration(metadata[field])
          : metadata[field] ?? '';
      tr.appendChild(td);
    }

    tableRows.push(tr);
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
      tableRows,
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
// Exports, imports, stats (will move into their own file. Trust.)
// -----------------------------------------------------------------------------------
exportPlaylistBtn.addEventListener('click', async () => {
  if (!currentPlaylist) return alert('No playlist selected');
  const ok = await window.api.playlists.export(currentPlaylist);
  if (!ok) console.error('Playlist export failed');
});

importPlaylistBtn.addEventListener('click', async () => {
  const imported = await window.api.playlists.import();
  if (!imported) return;

  await loadPlaylistsState();
  renderPlaylistList();
  await loadAllMusic();
});

statsBtn.addEventListener('click', async () => {
  try {
    const existing = document.getElementById('stats-modal');
    if (existing) existing.remove();

    const settings = await window.api.loadSettings();
    const playCounts: Record<string, number> = settings.playCounts || {};
    const artistCounts: Record<string, number> = settings.artistCounts || {};

    const topSongs = Object.entries(playCounts).sort((a, b) => b[1] - a[1]).slice(0, 50);
    const topArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).slice(0, 50);

    const modal = document.createElement('div');
    modal.id = 'stats-modal';
    modal.innerHTML = `
      <div>
        <h3>Playback Stats</h3>
        <div id="stats-content">
          <div class="stats-section">
            <h4>Top Songs</h4>
            <ul id="top-songs" class="stats-list"></ul>
          </div>
          <div class="stats-section">
            <h4>Top Artists</h4>
            <ul id="top-artists" class="stats-list"></ul>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
          <button id="stats-close">Close</button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    const topSongsEl = modal.querySelector('#top-songs')!;
    const topArtistsEl = modal.querySelector('#top-artists')!;

    topSongs.forEach(([path, cnt]) => {
      const li = document.createElement('li');
      li.textContent = `${path.split(/[/\\]/).pop() || path} — ${cnt}`;
      topSongsEl.appendChild(li);
    });

    topArtists.forEach(([artist, cnt]) => {
      const li = document.createElement('li');
      li.textContent = `${artist} — ${cnt}`;
      topArtistsEl.appendChild(li);
    });

    modal.querySelector('#stats-close')?.addEventListener('click', () => modal.remove());
    modal.style.display = 'flex';
  } catch (e) {
    console.error('Failed to open stats modal', e);
    alert('Failed to load stats');
  }
});
