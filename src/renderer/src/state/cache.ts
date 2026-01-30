export type CachedSong = {
  metadata: any;
  albumArt: string | null;
};

export const songCache: Record<string, CachedSong> = {};

export async function getCachedSong(filePath: string): Promise<CachedSong> {
  if (!songCache[filePath]) {
    const raw = await window.api.getMetadata(filePath);
    const art = await window.api.getAlbumArt(filePath);
    songCache[filePath] = { metadata: raw, albumArt: art };
  }

  return songCache[filePath];
}

export function pruneCache(validPaths: Set<string>) {
  for (const path of Object.keys(songCache)) {
    if (!validPaths.has(path)) {
      delete songCache[path];
    }
  }
}
