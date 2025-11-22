const openFolderBtn = document.getElementById('open-folder')!;
const gridContainer = document.getElementById('file-grid')!;

openFolderBtn.addEventListener('click', async () => {
  const folderPath = await window.api.openFolder();
  if (!folderPath) return;

  const files = await window.api.readFolder(folderPath);

  gridContainer.innerHTML = '';

  files.forEach(async (fileName) => {
    const filePath = `${folderPath}/${fileName}`;

    const card = document.createElement('div');
    card.className = 'file-card';

    const img = document.createElement('img');
    img.className = 'album-art';
    const albumArt = await window.api.getAlbumArt(filePath);
    img.src = albumArt || 'assets/electron.svg';

    const label = document.createElement('div');
    label.className = 'file-label';
    label.textContent = fileName;

    card.appendChild(img);
    card.appendChild(label);
    gridContainer.appendChild(card);
  });
});
