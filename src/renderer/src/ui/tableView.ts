import { CachedSong } from '../state/cache';
import { reorderMetadataField, saveSettingsState, formatDuration } from '../state/settings';

const placeholder = '../assets/placeholder.png';

export function renderTableView(
  gridContainer: HTMLElement,
  files: string[],
  songCache: Record<string, CachedSong>,
  visibleMetadata: Set<string>,
  onPlay: (files: string[], index: number) => void,
  onContextMenu: (x: number, y: number, filePath: string) => void,
  onReorder?: () => void
) {
  gridContainer.innerHTML = '';
  gridContainer.classList.add('table-view');

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  let draggedField: string | null = null;

  function onColumnDragStart(e: DragEvent) {
    draggedField = (e.target as HTMLElement).dataset.field || null;
  }

  function onColumnDragOver(e: DragEvent) {
    e.preventDefault();
  }

  function onColumnDrop(e: DragEvent) {
    e.preventDefault();
    const targetField = (e.target as HTMLElement).dataset.field;
    if (!draggedField || !targetField || draggedField === targetField) return;

    reorderMetadataField(draggedField, targetField);
    saveSettingsState();

    draggedField = null;
    if (onReorder) onReorder();
  }

  visibleMetadata.forEach(field => {
    const th = document.createElement('th');
    th.textContent =
      field === 'art'
        ? 'Art'
        : field.charAt(0).toUpperCase() + field.slice(1);

    th.dataset.field = field;
    th.draggable = true;

    th.addEventListener('dragstart', onColumnDragStart);
    th.addEventListener('dragover', onColumnDragOver);
    th.addEventListener('drop', onColumnDrop);

    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  files.forEach((filePath, idx) => {
    const cached = songCache[filePath];
    const tr = document.createElement('tr');

    visibleMetadata.forEach(field => {
      const td = document.createElement('td');

      if (field === 'art') {
        const img = document.createElement('img');
        img.src = cached?.albumArt || placeholder;
        img.className = 'album-art';
        td.appendChild(img);

      } else if (field === 'title') {
        const fileName = filePath.split(/[/\\]/).pop() || '';
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

        td.textContent =
          cached?.metadata.title && cached.metadata.title.trim() !== ''
            ? cached.metadata.title
            : nameWithoutExt;

      } else if (field === 'duration') {
        td.textContent = cached?.metadata.duration
          ? formatDuration(cached.metadata.duration)
          : '';

      } else {
        td.textContent = cached?.metadata[field] ?? '';
      }

      tr.appendChild(td);
    });

    tr.addEventListener('contextmenu', e => {
      e.preventDefault();
      onContextMenu(e.pageX, e.pageY, filePath);
    });

    tr.addEventListener('dblclick', () => onPlay(files, idx));

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  gridContainer.appendChild(table);
}
