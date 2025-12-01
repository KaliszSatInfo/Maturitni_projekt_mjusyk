const chooseBtn = document.getElementById('choose-folder')!;
const grid = document.getElementById('file-grid')!;
const folderList = document.getElementById('folder-list')!;
const toggleBtn = document.getElementById('toggle-view')!;
const metadataOptions = document.getElementById('metadata-options')!;
const loader = document.getElementById('loader')!;
const playlistContainer = document.getElementById('playlist-list')!;
const newPlaylistBtn = document.getElementById('new-playlist')!;
const playlistModal = document.getElementById('new-playlist-modal')!;
const playlistInput = document.getElementById('playlist-name-input') as HTMLInputElement;
const playlistCreateBtn = document.getElementById('playlist-create-btn')!;
const playlistCancelBtn = document.getElementById('playlist-cancel-btn')!;
const exportBtn = document.getElementById('export-playlist') as HTMLButtonElement;
const importBtn = document.getElementById('import-playlist') as HTMLButtonElement;

const placeholder = '../assets/placeholder.png';
const metadataFields = ["art","title","artist","album","genre","year","trackNumber","diskNumber","duration"];
const songCache: Record<string, { metadata: any; albumArt: string | null }> = {};

type Playlist = { name: string; songPaths: string[] };
let playlists: Playlist[] = [];
let currentPlaylist: Playlist | null = null;
let isViewingPlaylist = false;
let visibleMetadata: Set<string> = new Set(["art", "title"]);
let folderPaths: string[] = [];
let isTableView = false;
let draggedField: string | null = null;

async function loadAllPlaylists() {
  playlists = await window.api.loadPlaylists();
  renderPlaylists();
}

async function saveAllPlaylists() {
  await window.api.savePlaylists(playlists);
}

exportBtn.addEventListener("click", async () => {
  if (!currentPlaylist) {
    alert("Select a playlist to export.");
    return;
  }

  const ok = await window.api.playlists.export(currentPlaylist);
  if (ok) alert("Playlist exported!");
});

importBtn.addEventListener("click", async () => {
  const imported = await window.api.playlists.import();
  if (!imported) return;

  playlists.push(imported);
  renderPlaylists();
  alert("Playlist imported!");
});


function renderPlaylists() {
  playlistContainer.innerHTML = "";
  playlists.forEach((pl, index) => {
    const div = document.createElement("div");
    div.className = "playlist-item";
    div.textContent = pl.name;
    if (currentPlaylist === pl) div.classList.add("selected");
    div.addEventListener("click", () => {
      currentPlaylist = pl;
      isViewingPlaylist = true;
      renderPlaylists();
      loadAllMusic();
    });
    const del = document.createElement("button");
    del.textContent = "Delete";
    del.addEventListener("click", async (e) => {
      e.stopPropagation();
      playlists.splice(index, 1);
      if (currentPlaylist === pl) {
        currentPlaylist = null;
        isViewingPlaylist = false;
      }
      await saveAllPlaylists();
      renderPlaylists();
      loadAllMusic();
    });
    div.appendChild(del);
    playlistContainer.appendChild(div);
  });
  const allBtn = document.createElement("div");
  allBtn.className = "playlist-item all";
  allBtn.textContent = "All Songs";
  if (!currentPlaylist) allBtn.classList.add("selected");
  allBtn.addEventListener("click", () => {
    currentPlaylist = null;
    isViewingPlaylist = false;
    renderPlaylists();
    loadAllMusic();
  });
  playlistContainer.appendChild(allBtn);
}

newPlaylistBtn.addEventListener('click', () => {
  playlistInput.value = "";
  playlistModal.style.display = "flex";
});

playlistCancelBtn.addEventListener('click', () => {
  playlistModal.style.display = "none";
});

playlistCreateBtn.addEventListener('click', async () => {
  const name = playlistInput.value.trim();
  if (!name) return;
  playlists.push({ name, songPaths: [] });
  await saveAllPlaylists();
  renderPlaylists();
  playlistModal.style.display = "none";
});

function createAddToPlaylistButton(filePath: string) {
  const btn = document.createElement("button");
  btn.textContent = "+";
  btn.title = "Add to selected playlist";
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!currentPlaylist) {
      alert("Select a playlist first!");
      return;
    }
    if (!currentPlaylist.songPaths.includes(filePath)) {
      currentPlaylist.songPaths.push(filePath);
      await saveAllPlaylists();
      alert(`Added to: ${currentPlaylist.name}`);
    }
  });
  return btn;
}

function loadMetadataCheckboxes() {
  metadataOptions.innerHTML = "";
  metadataFields.forEach(field => {
    const wrapper = document.createElement("label");
    wrapper.className = "metadata-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = field;
    checkbox.checked = visibleMetadata.has(field);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) visibleMetadata.add(field);
      else visibleMetadata.delete(field);
      loadAllMusic();
      saveLayoutSettings();
    });
    wrapper.appendChild(checkbox);
    wrapper.appendChild(document.createTextNode(" " + field.charAt(0).toUpperCase() + field.slice(1)));
    metadataOptions.appendChild(wrapper);
  });
}

function formatDuration(seconds: number | string | null): string {
  if (!seconds) return "";
  const total = typeof seconds === "string" ? parseFloat(seconds) : seconds;
  if (isNaN(total)) return "";
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = Math.floor(total % 60);
  return hrs > 0 ? `${hrs}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}` : `${mins}:${secs.toString().padStart(2,'0')}`;
}

window.api.loadFolders().then(async folders => {
  folderPaths = folders;
  renderFolders();
  loadMetadataCheckboxes();
  await loadAllPlaylists();
  await loadAllMusic();
});

chooseBtn.addEventListener('click', async () => {
  const folder = await window.api.openFolder();
  if (!folder || folderPaths.includes(folder)) return;
  folderPaths.push(folder);
  await window.api.saveFolders(folderPaths);
  renderFolders();
  await loadAllMusic();
});

function renderFolders() {
  folderList.innerHTML = '';
  folderPaths.forEach((folder, idx) => {
    const div = document.createElement('div');
    div.className = 'folder-item';
    div.textContent = folder;
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      folderPaths.splice(idx, 1);
      await window.api.saveFolders(folderPaths);
      renderFolders();
      await loadAllMusic();
    });
    div.appendChild(delBtn);
    folderList.appendChild(div);
  });
}

function onColumnDragStart(e: DragEvent) { draggedField = (e.target as HTMLElement).dataset.field || null; }
function onColumnDragOver(e: DragEvent) { e.preventDefault(); }
function onColumnDrop(e: DragEvent) {
  e.preventDefault();
  const targetField = (e.target as HTMLElement).dataset.field;
  if (!draggedField || !targetField || draggedField === targetField) return;
  const newOrder = Array.from(visibleMetadata);
  const draggedIndex = newOrder.indexOf(draggedField);
  const targetIndex = newOrder.indexOf(targetField);
  newOrder.splice(draggedIndex, 1);
  newOrder.splice(targetIndex, 0, draggedField);
  visibleMetadata = new Set(newOrder);
  loadAllMusic();
  saveLayoutSettings();
}

async function saveLayoutSettings() {
  const settings = { visibleMetadata: Array.from(visibleMetadata), isTableView };
  await window.api.saveSettings(settings);
}

window.api.loadSettings().then(settings => {
  if (settings.visibleMetadata) visibleMetadata = new Set(settings.visibleMetadata);
  if (settings.isTableView !== undefined) isTableView = settings.isTableView;
  toggleBtn.textContent = isTableView ? 'Switch to Grid View' : 'Switch to Table View';
  loadMetadataCheckboxes();
  loadAllMusic();
});

toggleBtn.addEventListener('click', () => {
  isTableView = !isTableView;
  toggleBtn.textContent = isTableView ? 'Switch to Grid View' : 'Switch to Table View';
  loadAllMusic();
  saveLayoutSettings();
});

function showAddToPlaylistMenu(filePath: string, x: number, y: number) {
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.top = `${y}px`;
  menu.style.left = `${x}px`;
  playlists.forEach(pl => {
    const item = document.createElement('div');
    item.textContent = pl.name;
    item.className = 'context-item';
    item.addEventListener('click', async () => {
      if (!pl.songPaths.includes(filePath)) {
        pl.songPaths.push(filePath);
        await saveAllPlaylists();
      }
      document.body.removeChild(menu);
    });
    menu.appendChild(item);
  });
  document.body.appendChild(menu);
  const removeMenu = () => { if (menu.parentNode) menu.parentNode.removeChild(menu); };
  document.addEventListener('click', removeMenu, { once: true });
}

async function loadAllMusic() {
  loader.style.display = 'flex';
  grid.innerHTML = '';
  const tableRows: HTMLTableRowElement[] = [];
  const gridCards: HTMLDivElement[] = [];
  const currentFiles = new Set<string>();

  for (const folder of folderPaths) {
    let files = await window.api.readFolder(folder);

    if (isViewingPlaylist && currentPlaylist) {
      files = files.filter(f => currentPlaylist!.songPaths.includes(f));
    }

    for (const filePath of files) {
      currentFiles.add(filePath);

      if (!songCache[filePath]) {
        const rawMetadata = await window.api.getMetadata(filePath);
        const albumArt = await window.api.getAlbumArt(filePath);
        songCache[filePath] = { metadata: { ...rawMetadata, art: "" }, albumArt };
      }

      const { metadata, albumArt } = songCache[filePath];

      if (isTableView) {
        const tr = document.createElement('tr');

        visibleMetadata.forEach(field => {
          const td = document.createElement('td');
          td.innerHTML = field === "art"
            ? `<img src="${albumArt || placeholder}" class="album-art" />`
            : (field === "duration" ? formatDuration(metadata[field]) : metadata[field] ?? "");

          td.addEventListener('contextmenu', e => {
            e.preventDefault();
            showAddToPlaylistMenu(filePath, e.pageX, e.pageY);
          });

          tr.appendChild(td);
        });

        tr.addEventListener('dblclick', () => {
          window.api.playTrack(files, files.indexOf(filePath));
        });

        tableRows.push(tr);
      } else {
        const fileName = filePath.split(/[/\\]/).pop()!;
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `<img src="${albumArt || placeholder}" class="album-art" /><div class="file-label">${fileName}</div>`;

        card.addEventListener('contextmenu', e => {
          e.preventDefault();
          showAddToPlaylistMenu(filePath, e.pageX, e.pageY);
        });

        card.addEventListener('dblclick', () => {
          window.api.playTrack(files, files.indexOf(filePath));
        });

        gridCards.push(card);
      }
    }
  }

  for (const cachedPath of Object.keys(songCache)) {
    if (!currentFiles.has(cachedPath)) delete songCache[cachedPath];
  }

  if (isTableView) {
    grid.classList.add('table-view');
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    visibleMetadata.forEach(field => {
      const th = document.createElement('th');
      th.textContent = field === "art" ? "Art" : field.charAt(0).toUpperCase() + field.slice(1);
      th.draggable = true;
      th.dataset.field = field;
      th.addEventListener("dragstart", onColumnDragStart);
      th.addEventListener("dragover", onColumnDragOver);
      th.addEventListener("drop", onColumnDrop);
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tableRows.forEach(tr => tbody.appendChild(tr));
    table.appendChild(tbody);
    grid.appendChild(table);
  } else {
    grid.classList.remove('table-view');
    gridCards.forEach(card => grid.appendChild(card));
  }

  loader.style.display = 'none';
}
