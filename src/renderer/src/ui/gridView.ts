import { CachedSong } from '../state/cache';

const placeholder = '../assets/placeholder.png';

export function renderGridView(
  gridContainer: HTMLElement,
  files: string[],
  songCache: Record<string, CachedSong>,
  onPlay: (files: string[], index: number) => void,
  onContextMenu: (x: number, y: number, filePath: string) => void
) {
  gridContainer.innerHTML = '';

  const gridCards: HTMLDivElement[] = [];

  for (const filePath of files) {
    const fileName = filePath.split(/[/\\]/).pop()!;
    const cached = songCache[filePath];

    const card = document.createElement('div');
    card.className = 'file-card';

    card.innerHTML = `
      <img src="${cached?.albumArt || placeholder}" class="album-art">
      <div class="file-label">${cached?.metadata.title || fileName}</div>
    `;

    card.addEventListener('dblclick', () => {
      onPlay(files, files.indexOf(filePath));
    });

    card.addEventListener('contextmenu', e => {
      e.preventDefault();
      onContextMenu(e.pageX, e.pageY, filePath);
    });

    gridCards.push(card);
  }

  gridCards.forEach(c => gridContainer.appendChild(c));
}
