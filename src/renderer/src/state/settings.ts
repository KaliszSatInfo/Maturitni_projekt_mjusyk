export const metadataFields = [
  "art",
  "title",
  "artist",
  "album",
  "genre",
  "year",
  "duration",
  "trackNumber",
  "diskNumber"
];

export let visibleMetadata: Set<string> = new Set(['art', 'title']);
export let isTableView = false;

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
export let playlistCounts: Record<string, number> = {};
export let totalListeningTime: number = 0;


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

  if (settings.playlistCounts) {
    playlistCounts = settings.playlistCounts;
  }

  if (typeof settings.totalListeningTime === 'number') {
    totalListeningTime = settings.totalListeningTime;
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
    artistCounts,
    playlistCounts,
    totalListeningTime
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
  if (sec == null) return '';

  const s = typeof sec === 'string' ? parseFloat(sec) : sec;
  if (isNaN(s) || s < 0) return '';

  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = Math.floor(s % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
