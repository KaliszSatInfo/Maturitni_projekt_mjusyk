const chooseBtn = document.getElementById('choose-folder')!;
const grid = document.getElementById('file-grid')!;
const folderList = document.getElementById('folder-list')!;
const toggleBtn = document.getElementById('toggle-view')!;
const metadataOptions = document.getElementById('metadata-options')!;
const loader = document.getElementById('loader')!;

const placeholder = '../assets/placeholder.png';

const metadataFields = [
  "art", "title", "artist", "album", "genre", "year", "trackNumber", "diskNumber", "duration"
];

const songCache: Record<string, { metadata: any; albumArt: string | null }> = {};

let visibleMetadata: Set<string> = new Set(["art", "title"]);
let folderPaths: string[] = [];
let isTableView = false;
let draggedField: string | null = null;

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

function onColumnDragStart(e: DragEvent) {
  const th = e.target as HTMLElement;
  draggedField = th.dataset.field || null;
}

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

async function loadAllMusic() {
  loader.style.display = 'flex';

  grid.innerHTML = '';
  const tableRows: HTMLTableRowElement[] = [];
  const gridCards: HTMLDivElement[] = [];
  const currentFiles = new Set<string>();

  for (const folder of folderPaths) {
    const files = await window.api.readFolder(folder);

    for (const filePath of files) {
      currentFiles.add(filePath);

      if (!songCache[filePath]) {
        const rawMetadata = await window.api.getMetadata(filePath);
        const albumArt = await window.api.getAlbumArt(filePath);

        const normalizedMetadata = {
          title: rawMetadata.title || "",
          artist: rawMetadata.artist || "",
          album: rawMetadata.album || "",
          genre: Array.isArray(rawMetadata.genre) ? rawMetadata.genre.join(', ') : (rawMetadata.genre || ""),
          year: rawMetadata.year || "",
          trackNumber: rawMetadata.trackNumber || "",
          diskNumber: rawMetadata.diskNumber || "",
          duration: rawMetadata.duration || "",
          art: ""
        };

        songCache[filePath] = { metadata: normalizedMetadata, albumArt };
      }

      const { metadata, albumArt } = songCache[filePath];

      if (isTableView) {
        const tr = document.createElement('tr');
        visibleMetadata.forEach(field => {
          const td = document.createElement('td');
          const value = metadata[field] ?? "";

          if (field === "art") td.innerHTML = `<img src="${albumArt || placeholder}" class="album-art" />`;
          else if (field === "duration") td.textContent = formatDuration(value);
          else td.textContent = value;

          tr.appendChild(td);
        });
        tableRows.push(tr);
      } else {
        const fileName = filePath.split(/[/\\]/).pop()!;
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `
          <img src="${albumArt || placeholder}" class="album-art" />
          <div class="file-label">${fileName}</div>
        `;
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
