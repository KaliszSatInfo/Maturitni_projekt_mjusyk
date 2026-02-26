import { CachedSong } from '../state/cache';

export function renderGridView(
  gridContainer: HTMLElement,
  files: string[],
  songCache: Record<string, CachedSong>,
  onPlay: (files: string[], index: number) => void,
  onContextMenu: (x: number, y: number, filePath: string) => void
) {
  gridContainer.innerHTML = '';
  gridContainer.classList.add('grid-view');
  gridContainer.classList.remove('table-view');

  for (const filePath of files) {
    const fileName = filePath.split(/[/\\]/).pop()!;
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    const cached = songCache[filePath];

    const displayTitle =
      cached?.metadata.title && cached.metadata.title.trim() !== ''
        ? cached.metadata.title
        : nameWithoutExt;

    const card = document.createElement('div');
    card.className = 'file-card';

    card.innerHTML = `
      <img src="${cached?.albumArt || '../assets/placeholder.png'}" class="album-art">
      <div class="file-label">${displayTitle}</div>
    `;

    card.addEventListener('dblclick', () => onPlay(files, files.indexOf(filePath)));
    card.addEventListener('contextmenu', e => {
      e.preventDefault();
      onContextMenu(e.pageX, e.pageY, filePath);
    });

    gridContainer.appendChild(card);
  }
}
