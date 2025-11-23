const chooseBtn = document.getElementById('choose-folder')!;
const grid = document.getElementById('file-grid')!;
const folderList = document.getElementById('folder-list')!;
const placeholder = '../assets/placeholder.png';
const toggleBtn = document.getElementById('toggle-view')!;


let folderPaths: string[] = [];
let isTableView = false;

// Add the toggle button to the side panel
toggleBtn.id = 'toggle-view';
toggleBtn.textContent = 'Switch to Table View';
folderList.parentElement!.insertBefore(toggleBtn, folderList);

// Load saved folders on startup
window.api.loadFolders().then(async (folders) => {
  folderPaths = folders;
  renderFolders();
  await loadAllMusic();
});

// Select a new folder
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

// Toggle between grid and table view
toggleBtn.addEventListener('click', () => {
  isTableView = !isTableView;
  toggleBtn.textContent = isTableView ? 'Switch to Grid View' : 'Switch to Table View';
  loadAllMusic();
});

// Render the folder list in the side panel
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

// Load all music from all folders
async function loadAllMusic() {
  grid.innerHTML = '';

  if (isTableView) {
    grid.classList.add('table-view');
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Art</th>
        <th>Title</th>
        <th>Artist</th>
        <th>Album</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    for (const folder of folderPaths) {
      const files = await window.api.readFolder(folder);

      for (const filePath of files) {
        const art = await window.api.getAlbumArt(filePath);
        // If you don't have metadata yet, just use filename
        const fileName = filePath.split(/[/\\]/).pop()!;
        const tr = document.createElement('tr');

        tr.innerHTML = `
          <td><img src="${art || placeholder}" class="album-art" /></td>
          <td>${fileName}</td>
          <td>-</td>
          <td>-</td>
        `;
        tbody.appendChild(tr);
      }
    }

    table.appendChild(tbody);
    grid.appendChild(table);
  } else {
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
