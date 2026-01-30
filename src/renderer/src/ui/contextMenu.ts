import { playlists, currentPlaylist, savePlaylistsState } from '../state/playlists';

let activeContextMenu: HTMLElement | null = null;

export function showSongContextMenu(x: number, y: number, filePath: string, reloadCallback: () => void) {
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
    item.textContent = pl.name;
    item.addEventListener('click', async () => {
      if (!pl.songPaths.includes(filePath)) pl.songPaths.push(filePath);
      await savePlaylistsState();
      closeMenu();
    });
    menu.appendChild(item);
  });

  document.body.appendChild(menu);
  activeContextMenu = menu;

  setTimeout(() => document.addEventListener('click', closeMenu), 0);
}