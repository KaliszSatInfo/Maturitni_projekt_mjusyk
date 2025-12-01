import { Howl, Howler } from "howler";

let howl: Howl | null = null;
let queue: string[] = [];
let index: number = 0;
let fallbackAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

let isPlaying = false;
let loopMode = false;
let shuffleMode = false;

const playToggleBtn = document.getElementById('play-toggle') as HTMLButtonElement | null;
const shuffleBtn = document.getElementById('shuffle-btn') as HTMLButtonElement | null;
const loopBtn = document.getElementById('loop-btn') as HTMLButtonElement | null;
const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement | null;
const nextBtn = document.getElementById('next-btn') as HTMLButtonElement | null;

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

const art = document.getElementById("player-art") as HTMLImageElement;
const titleEl = document.getElementById("track-title")!;
const artistEl = document.getElementById("track-artist")!;
const currentTimeEl = document.getElementById("current-time")!;
const totalTimeEl = document.getElementById("total-time")!;
const progressBar = document.getElementById("progress-bar") as HTMLInputElement;
const volumeSlider = document.getElementById("volume-slider") as HTMLInputElement;

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
  }

  let srcUrl: string | null = null;
  try {
    srcUrl = await window.api.readFileDataUrl(file);
  } catch (e) {
    console.error('[musicRenderer] readFileDataUrl failed', e);
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
        console.debug('[musicRenderer] created object URL for blob, size=', bytes.length);
      }
    } catch (e) {
      console.error('[musicRenderer] failed to convert data URL to blob', e);
    }
  }

  try {
    howl = new Howl({
      src: [srcForHowl || ''],
      html5: true,
      onplay: () => {
        console.debug('[musicRenderer] Howl onplay');
        isPlaying = true;
        if (playToggleBtn) playToggleBtn.textContent = '⏸';
        updateProgress();
      },
      onload: () => {
        console.debug('[musicRenderer] Howl onload');
        const duration = howl!.duration();
        totalTimeEl.textContent = formatTime(duration);
      },
      onend: () => {
        console.debug('[musicRenderer] Howl onend');
        if (loopMode) {
          playCurrent();
        } else {
          playNext();
        }
      },
      onloaderror: (id, err) => console.error('[musicRenderer] Howl onloaderror', id, err),
      onplayerror: (id, err) => console.error('[musicRenderer] Howl onplayerror', id, err)
    });

    howl.play();
  } catch (err) {
    console.error('[musicRenderer] Howl failed, falling back to Audio()', err);
    try {
      const a = new Audio(srcUrl || '');
      try { a.volume = Number(volumeSlider.value); } catch {}
      fallbackAudio = a;
      a.addEventListener('loadedmetadata', () => {
        console.debug('[musicRenderer] fallback Audio loadedmetadata', a.duration);
        totalTimeEl.textContent = formatTime(a.duration || 0);
      });
      a.addEventListener('timeupdate', () => {
        currentTimeEl.textContent = formatTime(a.currentTime || 0);
        if (a.duration) progressBar.value = ((a.currentTime / a.duration) * 100).toString();
      });
      a.addEventListener('ended', () => {
        console.debug('[musicRenderer] fallback Audio ended');
        if (loopMode) {
          playCurrent();
        } else {
          playNext();
        }
      });
      a.play().then(() => {
        isPlaying = true;
        if (playToggleBtn) playToggleBtn.textContent = '⏸';
      }).catch(e => console.error('[musicRenderer] Audio.play() failed', e));
    } catch (e) {
      console.error('[musicRenderer] fallback Audio failed', e);
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
    const seek = howl.seek() as number;
    const duration = howl.duration();
    progressBar.value = ((seek / duration) * 100).toString();
    currentTimeEl.textContent = formatTime(seek);
    if (howl.playing()) requestAnimationFrame(updateProgress);
    return;
  }
  if (fallbackAudio) {
    const a = fallbackAudio;
    currentTimeEl.textContent = formatTime(a.currentTime || 0);
    if (a.duration) progressBar.value = ((a.currentTime / a.duration) * 100).toString();
  }
}

progressBar.addEventListener("input", () => {
  const pct = Number(progressBar.value) / 100;
  if (howl) {
    try { howl.seek(howl.duration() * pct); } catch {};
  } else if (fallbackAudio) {
    const a = fallbackAudio;
    if (a.duration) a.currentTime = a.duration * pct;
  }
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

if (playToggleBtn) {
  playToggleBtn.addEventListener('click', async () => {
    if (isPlaying) {
      howl?.pause();
      if (fallbackAudio) try { fallbackAudio.pause(); } catch {};
      isPlaying = false;
      playToggleBtn.textContent = '▶️';
    } else {
      if (howl) {
        howl.play();
      } else {
        await playCurrent();
      }
    }
  });
}

if (shuffleBtn) {
  shuffleBtn.addEventListener('click', () => {
    shuffleMode = !shuffleMode;
    shuffleBtn.classList.toggle('active', shuffleMode);
  });
}

if (loopBtn) {
  loopBtn.addEventListener('click', () => {
    loopMode = !loopMode;
    loopBtn.classList.toggle('active', loopMode);
  });
}

if (nextBtn) nextBtn.addEventListener('click', () => { playNext(); });
if (prevBtn) prevBtn.addEventListener('click', () => { playPrev(); });

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
    isPlaying = false;
    if (playToggleBtn) playToggleBtn.textContent = '▶️';
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
  }
}

export function attachPlayListeners(fileElements: HTMLElement[], files: string[]) {
  fileElements.forEach((el, i) => {
    el.addEventListener("dblclick", async () => {
      await window.api.setQueue(files);
      await window.api.setIndex(i);
      playCurrent();
    });
  });
}
