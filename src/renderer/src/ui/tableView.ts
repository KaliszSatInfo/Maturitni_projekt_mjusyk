import { reorderMetadataField, saveSettingsState } from '../state/settings';

export function renderTableView(
  gridContainer: HTMLElement,
  files: string[],
  rows: HTMLTableRowElement[],
  visibleMetadata: Set<string>,
  onPlay: (files: string[], index: number) => void,
  onContextMenu: (x: number, y: number, filePath: string) => void,
  onReorder?: () => void
) {
  gridContainer.innerHTML = '';
  gridContainer.classList.add('table-view');

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');

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
    th.textContent = field === 'art' ? 'Art' : field.charAt(0).toUpperCase() + field.slice(1);
    th.dataset.field = field;
    th.draggable = true;

    th.addEventListener('dragstart', onColumnDragStart);
    th.addEventListener('dragover', onColumnDragOver);
    th.addEventListener('drop', onColumnDrop);

    tr.appendChild(th);
  });

  thead.appendChild(tr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((r, idx) => {
    r.addEventListener('contextmenu', e => {
      e.preventDefault();
      onContextMenu(e.pageX, e.pageY, files[idx]);
    });
    r.addEventListener('dblclick', () => onPlay(files, idx));
    tbody.appendChild(r);
  });

  table.appendChild(tbody);
  gridContainer.appendChild(table);
}
