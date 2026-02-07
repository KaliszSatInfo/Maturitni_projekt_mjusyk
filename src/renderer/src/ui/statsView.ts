export async function showStatsModal() {
  try {
    const existing = document.getElementById('stats-modal');
    if (existing) existing.remove();

    const settings = await window.api.loadSettings();
    const playCounts: Record<string, number> = settings.playCounts || {};
    const artistCounts: Record<string, number> = settings.artistCounts || {};

    const topSongs = Object.entries(playCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);

    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);

    const modal = document.createElement('div');
    modal.id = 'stats-modal';
    modal.innerHTML = `
      <div>
        <h3>Playback Stats</h3>
        <div id="stats-content">
          <div class="stats-section">
            <h4>Top Songs</h4>
            <ul id="top-songs" class="stats-list"></ul>
          </div>
          <div class="stats-section">
            <h4>Top Artists</h4>
            <ul id="top-artists" class="stats-list"></ul>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
          <button id="stats-close">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const topSongsEl = modal.querySelector('#top-songs')!;
    const topArtistsEl = modal.querySelector('#top-artists')!;

    topSongs.forEach(([path, cnt]) => {
      const li = document.createElement('li');
      li.textContent = `${path.split(/[/\\]/).pop() || path} — ${cnt}`;
      topSongsEl.appendChild(li);
    });

    topArtists.forEach(([artist, cnt]) => {
      const li = document.createElement('li');
      li.textContent = `${artist} — ${cnt}`;
      topArtistsEl.appendChild(li);
    });

    modal.querySelector('#stats-close')?.addEventListener('click', () => {
      modal.remove();
    });

    modal.style.display = 'flex';
  } catch (e) {
    console.error('Failed to open stats modal', e);
    alert('Failed to load stats');
  }
}
