export type Playlist = {
  name: string;
  songPaths: string[];
};

export let playlists: Playlist[] = [];
export let currentPlaylist: Playlist | null = null;

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */
export async function loadPlaylistsState() {
  playlists = await window.api.loadPlaylists();
  return playlists;
}

export async function savePlaylistsState() {
  await window.api.savePlaylists(playlists);
}

/* ------------------------------------------------------------------ */
/* State operations                                                    */
/* ------------------------------------------------------------------ */
export function createPlaylist(name: string) {
  const pl: Playlist = { name, songPaths: [] };
  playlists.push(pl);
  return pl;
}

export function deletePlaylist(index: number) {
  const removed = playlists[index];
  playlists.splice(index, 1);

  if (currentPlaylist === removed) {
    currentPlaylist = null;
  }
}

export function selectPlaylist(pl: Playlist | null) {
  currentPlaylist = pl;
}

export function addSongToPlaylist(pl: Playlist, songPath: string) {
  if (!pl.songPaths.includes(songPath)) {
    pl.songPaths.push(songPath);
  }
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */
export function renderPlaylists(
  playlistContainer: HTMLElement,
  onSelect: () => void,
  onDeletePlaylist: (index: number) => Promise<void>
) {
  playlistContainer.innerHTML = '';

  playlists.forEach((pl, index) => {
    const div = document.createElement('div');
    div.className = 'playlist-item';
    div.textContent = pl.name;

    if (currentPlaylist === pl) {
      div.classList.add('selected');
    }

    div.addEventListener('click', () => {
      selectPlaylist(pl);
      onSelect();
    });

    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.addEventListener('click', async e => {
      e.stopPropagation();
      await onDeletePlaylist(index);
    });

    div.appendChild(del);
    playlistContainer.appendChild(div);
  });

  const allBtn = document.createElement('div');
  allBtn.className = 'playlist-item all';
  allBtn.textContent = 'All Songs';

  if (!currentPlaylist) {
    allBtn.classList.add('selected');
  }

  allBtn.addEventListener('click', () => {
    selectPlaylist(null);
    onSelect();
  });

  playlistContainer.appendChild(allBtn);
}
