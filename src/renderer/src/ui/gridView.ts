import { CachedSong } from '../state/cache';
const placeholder = new URL(
  "../../assets/placeholder.png",
  import.meta.url
).href;

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

    const img = document.createElement('img');
    img.src = cached?.albumArt || placeholder;
    img.className = 'album-art';

    const label = document.createElement('div');
    label.className = 'file-label';
    label.textContent = displayTitle;

    card.appendChild(img);
    card.appendChild(label);

    card.addEventListener('dblclick', () => onPlay(files, files.indexOf(filePath)));
    card.addEventListener('contextmenu', e => {
      e.preventDefault();
      onContextMenu(e.pageX, e.pageY, filePath);
    });

    gridContainer.appendChild(card);
  }
}
