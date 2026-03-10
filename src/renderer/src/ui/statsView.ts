import { formatDuration } from "../state/settings";

export async function showStatsModal() {
  try {
    const existing = document.getElementById('stats-modal');
    if (existing) existing.remove();

    const settings = await window.api.loadSettings();

    const playCounts: Record<string, number> = settings.playCounts || {};
    const artistCounts: Record<string, number> = settings.artistCounts || {};
    const playlistCounts: Record<string, number> = settings.playlistCounts || {};
    const totalListeningTime: number = settings.totalListeningTime || 0;

    const topSongs = Object.entries(playCounts).sort((a, b) => b[1] - a[1]);
    const topArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]);
    const topPlaylists = Object.entries(playlistCounts).sort((a, b) => b[1] - a[1]);

    const modal = document.createElement('div');
    modal.id = 'stats-modal';
    modal.innerHTML = `
      <div>
        <h3>Playback Statistics</h3>

        <p><strong>Total listening time:</strong> ${formatDuration(totalListeningTime)}</p>

        <div id="stats-content">

          <div class="stats-section">
            <h4>Top Songs</h4>
            <ul id="top-songs" class="stats-list"></ul>
            <button id="songs-show-more" class="stats-play-btn">Show More</button>
          </div>

          <div class="stats-section">
            <h4>Top Artists</h4>
            <ul id="top-artists" class="stats-list"></ul>
            <button id="artists-show-more" class="stats-play-btn">Show More</button>
          </div>

          <div class="stats-section">
            <h4>Most Listened Playlists</h4>
            <ul id="top-playlists" class="stats-list"></ul>
            <button id="playlists-show-more" class="stats-play-btn">Show More</button>
          </div>

        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:12px;">
          <button id="stats-close" class="stats-play-btn">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const topSongsEl = modal.querySelector('#top-songs') as HTMLElement;
    const topArtistsEl = modal.querySelector('#top-artists') as HTMLElement;
    const topPlaylistsEl = modal.querySelector('#top-playlists') as HTMLElement;

    const songsShowMoreBtn = modal.querySelector('#songs-show-more') as HTMLElement;
    const artistsShowMoreBtn = modal.querySelector('#artists-show-more') as HTMLElement;
    const playlistsShowMoreBtn = modal.querySelector('#playlists-show-more') as HTMLElement;

    const closeBtn = modal.querySelector('#stats-close') as HTMLElement;

    const renderList = (listEl: HTMLElement, items: [string, number][], limit = 5) => {
      listEl.innerHTML = '';
      items.forEach(([name, count], idx) => {
        const li = document.createElement('li');
        li.textContent = `${name.split(/[/\\]/).pop() || name} — ${count}`;
        li.style.display = idx < limit ? 'list-item' : 'none';
        listEl.appendChild(li);
      });
    };

    renderList(topSongsEl, topSongs, 5);
    renderList(topArtistsEl, topArtists, 5);
    renderList(topPlaylistsEl, topPlaylists, 5);

    let songsExpanded = false;
    songsShowMoreBtn.addEventListener('click', () => {
      songsExpanded = !songsExpanded;
      Array.from(topSongsEl.children).forEach((el, idx) => {
        (el as HTMLElement).style.display = songsExpanded ? 'list-item' : (idx < 5 ? 'list-item' : 'none');
      });
      songsShowMoreBtn.textContent = songsExpanded ? 'Show Less' : 'Show More';
    });

    let artistsExpanded = false;
    artistsShowMoreBtn.addEventListener('click', () => {
      artistsExpanded = !artistsExpanded;
      Array.from(topArtistsEl.children).forEach((el, idx) => {
        (el as HTMLElement).style.display = artistsExpanded ? 'list-item' : (idx < 5 ? 'list-item' : 'none');
      });
      artistsShowMoreBtn.textContent = artistsExpanded ? 'Show Less' : 'Show More';
    });

    let playlistsExpanded = false;
    playlistsShowMoreBtn.addEventListener('click', () => {
      playlistsExpanded = !playlistsExpanded;
      Array.from(topPlaylistsEl.children).forEach((el, idx) => {
        (el as HTMLElement).style.display = playlistsExpanded ? 'list-item' : (idx < 5 ? 'list-item' : 'none');
      });
      playlistsShowMoreBtn.textContent = playlistsExpanded ? 'Show Less' : 'Show More';
    });

    closeBtn.addEventListener('click', () => modal.remove());

    modal.style.display = 'flex';

  } catch (e) {
    console.error('Failed to open stats modal', e);
    alert('Failed to load stats');
  }
}