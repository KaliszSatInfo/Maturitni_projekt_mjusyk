import { Howl, Howler } from "howler";

let howl: Howl | null = null;
let queue: string[] = [];
let index: number = 0;
let fallbackAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

let isPlaying = false;
let loopMode = false;
let shuffleMode = false;
let progressRaf: number | null = null;

const playToggleBtn = document.getElementById('play-toggle') as HTMLButtonElement | null;
const shuffleBtn = document.getElementById('shuffle-btn') as HTMLButtonElement | null;
const loopBtn = document.getElementById('loop-btn') as HTMLButtonElement | null;
const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement | null;
const nextBtn = document.getElementById('next-btn') as HTMLButtonElement | null;
const art = document.getElementById("player-art") as HTMLImageElement;
const titleEl = document.getElementById("track-title")!;
const artistEl = document.getElementById("track-artist")!;
const currentTimeEl = document.getElementById("current-time")!;
const totalTimeEl = document.getElementById("total-time")!;
const progressBar = document.getElementById("progress-bar") as HTMLInputElement;
const volumeSlider = document.getElementById("volume-slider") as HTMLInputElement;

if (window.api && typeof window.api.onLoadQueue === 'function') {
  window.api.onLoadQueue((data: { queue: string[]; index: number }) => {
    if (!data) return;
    queue = data.queue || [];
    index = typeof data.index === 'number' ? data.index : 0;
    window.api.setQueue(queue);
    window.api.setIndex(index);
    playCurrent();
  });
}

async function recordPlay(filePath: string) {
  try {
    const s = await window.api.loadSettings();
    const settings = s || {};
    settings.playCounts = settings.playCounts || {};
    settings.playCounts[filePath] = (settings.playCounts[filePath] || 0) + 1;
    settings.artistCounts = settings.artistCounts || {};
    try {
      const m = await window.api.getMetadata(filePath);
      const artistName = (m && m.artist) ? m.artist : 'Unknown Artist';
      settings.artistCounts[artistName] = (settings.artistCounts[artistName] || 0) + 1;
    } catch (e) {
      settings.artistCounts['Unknown Artist'] = (settings.artistCounts['Unknown Artist'] || 0) + 1;
    }
    await window.api.saveSettings(settings);
  } catch (e) {
  }
}

async function playCurrent() {
  queue = await window.api.getQueue();
  index = await window.api.getCurrentIndex();

  const file = queue[index];
  if (!file) return;

  const metadata = await window.api.getMetadata(file);
  const artData = await window.api.getAlbumArt(file);

  titleEl.textContent = metadata.title || file.split(/[/\\]/).pop()!;
  artistEl.textContent = metadata.artist || "Unknown Artist";
  art.src = artData || "./assets/placeholder.png";
  
  if (howl) {
    howl.unload();
    howl = null;
    try { if (progressRaf !== null) cancelAnimationFrame(progressRaf); } catch {}
    progressRaf = null;
  }

  let srcUrl: string | null = null;
  try {
    srcUrl = await window.api.readFileDataUrl(file);
  } catch (e) {
    srcUrl = null;
  }

  if (!srcUrl) {
    const toFileUrl = (p: string) => {
      if (!p) return p;
      let urlPath = p.replace(/\\/g, '/');
      if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;
      return encodeURI('file://' + urlPath);
    };
    srcUrl = toFileUrl(file);
  }

  if (fallbackAudio) {
    try { fallbackAudio.pause(); fallbackAudio.src = ''; } catch {};
    fallbackAudio = null;
  }

  if (currentObjectUrl) {
    try { URL.revokeObjectURL(currentObjectUrl); } catch {}
    currentObjectUrl = null;
  }

  let srcForHowl = srcUrl as string | null;
  if (srcUrl && srcUrl.startsWith('data:')) {
    try {
      const matches = srcUrl.match(/^data:([^;]+);base64,(.*)$/);
      if (matches) {
        const mime = matches[1];
        const b64 = matches[2];
        const binary = atob(b64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });
        currentObjectUrl = URL.createObjectURL(blob);
        srcForHowl = currentObjectUrl;
      }
    } catch (e) {
    }
  }

  try {
    howl = new Howl({
      src: [srcForHowl || ''],
      html5: true,
      onplay: () => {
        isPlaying = true;
        if (playToggleBtn) playToggleBtn.textContent = '⏸';
        updateProgress();
        if (progressRaf === null) {
          const loop = () => { updateProgress(); progressRaf = requestAnimationFrame(loop); };
          progressRaf = requestAnimationFrame(loop);
        }
      },
      onpause: () => {
        isPlaying = false;
        if (playToggleBtn) playToggleBtn.textContent = '▶️';
        if (progressRaf !== null) { cancelAnimationFrame(progressRaf); progressRaf = null; }
      },
      onload: () => {
        const duration = howl!.duration();
        totalTimeEl.textContent = formatTime(duration);
      },
      onend: () => {
        try { recordPlay(file).catch(()=>{}); } catch {}
        if (loopMode) {
          playCurrent();
        } else {
          playNext();
        }
      },
    });

    howl.play();
  } catch (err) {
    try {
      const a = new Audio(srcUrl || '');
      try { a.volume = mapSliderToVolume(Number(volumeSlider.value)); } catch {}
      fallbackAudio = a;
      a.addEventListener('loadedmetadata', () => {
        totalTimeEl.textContent = formatTime(a.duration || 0);
        updateProgress();
      });
      a.addEventListener('timeupdate', () => {
        currentTimeEl.textContent = formatTime(a.currentTime || 0);
        if (a.duration) progressBar.value = ((a.currentTime / a.duration) * 100).toString();
      });
      a.addEventListener('ended', () => {
        try { recordPlay(file).catch(()=>{}); } catch {}
        if (loopMode) {
          playCurrent();
        } else {
          playNext();
        }
      });
      a.addEventListener('play', () => {
        isPlaying = true;
        if (playToggleBtn) playToggleBtn.textContent = '⏸';
        if (progressRaf === null) {
          const loop = () => { updateProgress(); progressRaf = requestAnimationFrame(loop); };
          progressRaf = requestAnimationFrame(loop);
        }
      });
      a.addEventListener('pause', () => {
        isPlaying = false;
        if (playToggleBtn) playToggleBtn.textContent = '▶️';
        if (progressRaf !== null) { cancelAnimationFrame(progressRaf); progressRaf = null; }
      });
      a.play();
    } catch (e) {
    }
  }
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updateProgress() {
  if (howl) {
    try {
      const seek = howl.seek() as number;
      const duration = howl.duration() || 0;
      progressBar.value = duration > 0 ? ((seek / duration) * 100).toString() : '0';
      currentTimeEl.textContent = formatTime(seek);
      totalTimeEl.textContent = formatTime(duration);
      
    } catch (e) {
    }
    return;
  }
  if (fallbackAudio) {
    const a = fallbackAudio;
    currentTimeEl.textContent = formatTime(a.currentTime || 0);
      if (a.duration) {
      progressBar.value = ((a.currentTime / a.duration) * 100).toString();
    }
    totalTimeEl.textContent = formatTime(a.duration || 0);
  }
}

progressBar.addEventListener("input", () => {
  const pct = Number(progressBar.value) / 100;
  if (howl) {
    try { howl.seek(howl.duration() * pct); } catch {}
  } else if (fallbackAudio) {
    const a = fallbackAudio;
    if (a.duration) a.currentTime = a.duration * pct;
  }
  try { updateProgress(); } catch {}
});

function mapSliderToVolume(s: number) {
  const clamped = Math.max(0, Math.min(1, s));
  return Math.pow(clamped, 2) * 0.45;
}

volumeSlider.addEventListener("input", () => {
  const sliderVal = Number(volumeSlider.value);
  const mapped = mapSliderToVolume(sliderVal);
  Howler.volume(mapped);
  if (fallbackAudio) try { fallbackAudio.volume = mapped; } catch {}
});

Howler.volume(mapSliderToVolume(Number(volumeSlider.value)));

function isPlayingNow() {
  try {
    if (howl) {
      const playing = howl.playing();
      return typeof playing === 'boolean' ? playing : !!playing;
    }
    if (fallbackAudio) return !fallbackAudio.paused;
  } catch (e) {
  }
  return isPlaying;
}


playToggleBtn?.addEventListener('click', async () => {
  const nowPlaying = isPlayingNow();
  try {
    if (nowPlaying) {
      try { howl?.pause(); } catch {}
      if (fallbackAudio) try { fallbackAudio.pause(); } catch {};
      isPlaying = false;
      playToggleBtn.textContent = '▶️';
    } else {
      if (howl) {
        try { howl.play(); } catch (e) { await playCurrent(); }
      } else if (fallbackAudio) {
        try { await fallbackAudio.play(); } catch (e) { await playCurrent(); }
      } else {
        await playCurrent();
      }
    }
  } catch (e) {
  }
});


if (shuffleBtn) {
  shuffleBtn.addEventListener('click', () => {
    shuffleMode = !shuffleMode;
    if (shuffleMode) shuffleBtn.classList.add('active');
    else shuffleBtn.classList.remove('active');
  });
}

if (loopBtn) {
  loopBtn.addEventListener('click', () => {
    loopMode = !loopMode;
    if (loopMode) loopBtn.classList.add('active');
    else loopBtn.classList.remove('active');
  });
}

nextBtn?.addEventListener('click', () => { playNext(); });
prevBtn?.addEventListener('click', () => { playPrev(); });

function playNext() {
  if (!queue || queue.length === 0) return;
  if (shuffleMode) {
    const next = Math.floor(Math.random() * queue.length);
    index = next;
    window.api.setIndex(index);
    playCurrent();
    return;
  }

  if (index < queue.length - 1) {
    index++;
    window.api.setIndex(index);
    playCurrent();
  } else {
    try { if (howl) { howl.stop(); howl.unload(); howl = null; } } catch {}
    try { if (fallbackAudio) { fallbackAudio.pause(); fallbackAudio.src = ''; fallbackAudio = null; } } catch {}
    isPlaying = false;
    playToggleBtn!.textContent = '▶️';
  }
}

function playPrev() {
  if (!queue || queue.length === 0) return;
  if (shuffleMode) {
    const prev = Math.floor(Math.random() * queue.length);
    index = prev;
    window.api.setIndex(index);
    playCurrent();
    return;
  }

  if (index > 0) {
    index--;
    window.api.setIndex(index);
    playCurrent();
  } else {
    try {
      if (howl) {
        try { howl.seek(0); } catch {}
      } else if (fallbackAudio) {
        try { fallbackAudio.currentTime = 0; } catch {}
      }
      updateProgress();
    } catch (e) {}
  }
}