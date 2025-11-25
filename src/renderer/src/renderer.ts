const chooseBtn = document.getElementById('choose-folder')!;
const grid = document.getElementById('file-grid')!;
const folderList = document.getElementById('folder-list')!;
const toggleBtn = document.getElementById('toggle-view')!;
const metadataOptions = document.getElementById('metadata-options')!;

const placeholder = '../assets/placeholder.png';

const metadataFields = [
  "art",
  "title",
  "artist",
  "album",
  "genre",
  "year",
  "trackNumber",
  "diskNumber",
  "duration"
];

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

      if (isTableView) loadAllMusic();
      saveLayoutSettings();
    });

    const niceName = field.charAt(0).toUpperCase() + field.slice(1);

    wrapper.appendChild(checkbox);
    wrapper.appendChild(document.createTextNode(" " + niceName));
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

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

window.api.loadFolders().then(async (folders) => {
  folderPaths = folders;
  renderFolders();
  loadMetadataCheckboxes();
  await loadAllMusic();
});


chooseBtn.addEventListener('click', async () => {
  const folder = await window.api.openFolder();
  if (!folder) return;

  if (!folderPaths.includes(folder)) {
    folderPaths.push(folder);
    await window.api.saveFolders(folderPaths);
    renderFolders();
    await loadAllMusic();
  }
});


toggleBtn.addEventListener('click', () => {
  isTableView = !isTableView;
  toggleBtn.textContent = isTableView ? 'Switch to Grid View' : 'Switch to Table View';
  loadAllMusic();
  saveLayoutSettings();
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

function onColumnDragOver(e: DragEvent) {
  e.preventDefault();
}

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


// Save layout
async function saveLayoutSettings() {
  const settings = {
    visibleMetadata: Array.from(visibleMetadata),
    isTableView,
  };
  await window.api.saveSettings(settings);
}

// Load layout on startup
window.api.loadSettings().then((settings) => {
  if (settings.visibleMetadata) visibleMetadata = new Set(settings.visibleMetadata);
  if (settings.isTableView !== undefined) isTableView = settings.isTableView;

  loadMetadataCheckboxes();
  loadAllMusic();
});

async function loadAllMusic() {
  grid.innerHTML = '';

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

    for (const folder of folderPaths) {
      const files = await window.api.readFolder(folder);

      for (const filePath of files) {
        const metadata = await window.api.getMetadata(filePath);
        const art = await window.api.getAlbumArt(filePath);

        const tr = document.createElement('tr');

        visibleMetadata.forEach(field => {
          const td = document.createElement('td');
          
          let value = metadata[field] ?? "";

          if (field === "art") {
            td.innerHTML = `<img src="${art || placeholder}" class="album-art" />`;
          } else if (field === "duration") {
            td.textContent = formatDuration(value);
          } else {
            td.textContent = value;
          }

          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      }
    }

    table.appendChild(tbody);
    grid.appendChild(table);

  } else {
    // Grid view
    grid.classList.remove('table-view');

    for (const folder of folderPaths) {
      const files = await window.api.readFolder(folder);

      for (const filePath of files) {
        const art = await window.api.getAlbumArt(filePath);
        const fileName = filePath.split(/[/\\]/).pop()!;

        const card = document.createElement('div');
        card.className = 'file-card';

        card.innerHTML = `
          <img src="${art || placeholder}" class="album-art" />
          <div class="file-label">${fileName}</div>
        `;

        grid.appendChild(card);
      }
    }
  }
}
