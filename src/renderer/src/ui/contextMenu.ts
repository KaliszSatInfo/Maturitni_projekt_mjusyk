import { playlists, currentPlaylist, savePlaylistsState } from '../state/playlists';

let activeContextMenu: HTMLElement | null = null;

export function showPlaylistContextMenu(
  x: number,
  y: number,
  onExport: () => Promise<void>,
  onDelete: () => Promise<void>
) {
  if (activeContextMenu) {
    activeContextMenu.remove();
    activeContextMenu = null;
  }

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  function closeMenu() {
    if (activeContextMenu) {
      activeContextMenu.remove();
      activeContextMenu = null;
    }
    document.removeEventListener('click', closeMenu);
  }

  const exportItem = document.createElement('div');
  exportItem.className = 'context-item';
  exportItem.textContent = 'Export';
  exportItem.addEventListener('click', async () => {
    await onExport();
    closeMenu();
  });
  menu.appendChild(exportItem);

  const sep = document.createElement('div');
  sep.className = 'context-separator';
  menu.appendChild(sep);

  const deleteItem = document.createElement('div');
  deleteItem.className = 'context-item';
  deleteItem.textContent = 'Delete';
  deleteItem.addEventListener('click', async () => {
    await onDelete();
    closeMenu();
  });
  menu.appendChild(deleteItem);

  document.body.appendChild(menu);
  activeContextMenu = menu;

  setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

export function showSongContextMenu(x: number, y: number, filePath: string, selectedFiles: string[], reloadCallback: () => void) {
  if (activeContextMenu) {
    activeContextMenu.remove();
    activeContextMenu = null;
  }

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  function closeMenu() {
    if (activeContextMenu) {
      activeContextMenu.remove();
      activeContextMenu = null;
    }
    document.removeEventListener('click', closeMenu);
  }

  if (currentPlaylist) {
    const removeItem = document.createElement('div');
    removeItem.className = 'context-item';
    removeItem.textContent = 'Remove from playlist';
    removeItem.addEventListener('click', async () => {
      currentPlaylist!.songPaths = currentPlaylist!.songPaths.filter(p => p !== filePath);
      await savePlaylistsState();
      reloadCallback();
      closeMenu();
    });
    menu.appendChild(removeItem);

    const sep = document.createElement('div');
    sep.className = 'context-separator';
    menu.appendChild(sep);
  }

  const addTitle = document.createElement('div');
  addTitle.className = 'context-title';
  addTitle.textContent = 'Add to playlist';
  menu.appendChild(addTitle);

  playlists.forEach(pl => {
    const item = document.createElement('div');
    item.className = 'context-item';
    if (selectedFiles && selectedFiles.length > 1) {
      item.textContent = `${pl.name} (add ${selectedFiles.length})`;
    } else {
      item.textContent = pl.name;
    }
    item.addEventListener('click', async () => {
      const toAdd = (selectedFiles && selectedFiles.length > 0 && selectedFiles.includes(filePath)) ? selectedFiles : [filePath];
      for (const fp of toAdd) {
        if (!pl.songPaths.includes(fp)) pl.songPaths.push(fp);
      }
      await savePlaylistsState();
      closeMenu();
    });
    menu.appendChild(item);
  });

  document.body.appendChild(menu);
  activeContextMenu = menu;

  setTimeout(() => document.addEventListener('click', closeMenu), 0);
}