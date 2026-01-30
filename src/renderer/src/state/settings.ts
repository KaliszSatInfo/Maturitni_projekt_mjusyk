export let visibleMetadata: Set<string> = new Set(['art', 'title']);
export let isTableView = false;

export async function loadSettingsState() {
  const settings = await window.api.loadSettings();

  if (settings.visibleMetadata) {
    visibleMetadata = new Set(settings.visibleMetadata);
  }

  if (settings.isTableView !== undefined) {
    isTableView = settings.isTableView;
  }

  if (typeof settings.volume === 'number') {
    volume = settings.volume;
  }

  if (typeof settings.loop === 'boolean') {
    loopEnabled = settings.loop;
  }

  if (typeof settings.shuffle === 'boolean') {
    shuffleEnabled = settings.shuffle;
  }

  if (settings.lastPlayback) {
    lastPlayback = settings.lastPlayback;
  }

  if (settings.playCounts) {
    playCounts = settings.playCounts;
  }

  if (settings.artistCounts) {
    artistCounts = settings.artistCounts;
  }
}


export async function saveSettingsState() {
  await window.api.saveSettings({
    visibleMetadata: Array.from(visibleMetadata),
    isTableView,

    volume,
    loop: loopEnabled,
    shuffle: shuffleEnabled,
    lastPlayback,

    playCounts,
    artistCounts
  });
}


export function toggleTableView() {
  isTableView = !isTableView;
  return isTableView;
}

export function reorderMetadataField(from: string, to: string) {
  const order = Array.from(visibleMetadata);
  const fromIndex = order.indexOf(from);
  const toIndex = order.indexOf(to);

  if (fromIndex === -1 || toIndex === -1) return;

  order.splice(fromIndex, 1);
  order.splice(toIndex, 0, from);

  visibleMetadata.clear();
  order.forEach(f => visibleMetadata.add(f));
}

export function formatDuration(sec: number | string | null): string {
  if (!sec) return '';
  const s = typeof sec === 'string' ? parseFloat(sec) : sec;
  if (isNaN(s)) return '';

  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export let volume = 1.0;
export let loopEnabled = false;
export let shuffleEnabled = false;

export let lastPlayback: {
  queue: string[];
  index: number;
  time?: number;
} | null = null;

export let playCounts: Record<string, number> = {};
export let artistCounts: Record<string, number> = {};
