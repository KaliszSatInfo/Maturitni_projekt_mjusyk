export let folderPaths: string[] = [];

export async function loadFoldersState() {
  folderPaths = await window.api.loadFolders();
  return folderPaths;
}

export async function saveFoldersState() {
  await window.api.saveFolders(folderPaths);
}

export function addFolders(newFolders: string[]) {
  let changed = false;
  for (const folder of newFolders) {
    if (!folderPaths.includes(folder)) {
      folderPaths.push(folder);
      changed = true;
    }
  }
  return changed;
}

export function removeFolderAt(index: number) {
  folderPaths.splice(index, 1);
}

export function renderFolders(
  container: HTMLElement,
  onRemove: (index: number) => void
) {
  container.innerHTML = '';

  folderPaths.forEach((folder, idx) => {
    const div = document.createElement('div');
    div.className = 'folder-item';

    const folderName = folder.split(/[\\/]/).pop() || folder;
    div.textContent = folderName;

    div.setAttribute('data-fullpath', folder);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => onRemove(idx));

    div.appendChild(delBtn);
    container.appendChild(div);
  });
}
