import { Howl, Howler } from "howler";

let howl: Howl | null = null;
let fallbackAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

let queue: string[] = [];
let index = 0;

let hasLoadedTrack = false;
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
const placeholder = '../assets/placeholder.png';

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function mapSliderToVolume(s: number) {
  const clamped = Math.max(0, Math.min(1, s));
  return Math.pow(clamped, 2) * 0.45;
}

function updateProgress() {
  let current = 0, duration = 0;
  if (howl) { try { current = howl.seek() as number; duration = howl.duration() || 0; } catch {} }
  else if (fallbackAudio) { current = fallbackAudio.currentTime || 0; duration = fallbackAudio.duration || 0; }

  currentTimeEl.textContent = formatTime(current);
  totalTimeEl.textContent = formatTime(duration);
  progressBar.value = duration > 0 ? ((current / duration) * 100).toString() : "0";

  if (isPlaying && progressRaf === null) {
    const loop = () => { updateProgress(); progressRaf = requestAnimationFrame(loop); };
    progressRaf = requestAnimationFrame(loop);
  }
}

async function playFile(file: string) {
  if (howl) { howl.unload(); howl = null; }
  if (fallbackAudio) { fallbackAudio.pause(); fallbackAudio.src = ''; fallbackAudio = null; }
  if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
  if (progressRaf !== null) { cancelAnimationFrame(progressRaf); progressRaf = null; }

  const metadata = await window.api.getMetadata(file);
  const artData = await window.api.getAlbumArt(file);
  titleEl.textContent = metadata.title || file.split(/[/\\]/).pop()!;
  artistEl.textContent = metadata.artist || "Unknown Artist";
  art.src = artData || placeholder;

  let fileUrl = file.replace(/\\/g, '/');
  if (!fileUrl.startsWith('/')) fileUrl = '/' + fileUrl;
  fileUrl = encodeURI('file://' + fileUrl);

  try {
    howl = new Howl({
      src: [fileUrl],
      html5: true,
      onplay: () => { isPlaying = true; playToggleBtn && (playToggleBtn.textContent = '⏸'); updateProgress(); },
      onpause: () => { isPlaying = false; playToggleBtn && (playToggleBtn.textContent = '▶️'); },
      onend: () => { recordPlay(file); loopMode ? playCurrent() : playNext(); },
      onload: () => { totalTimeEl.textContent = formatTime(howl!.duration()); }
    });
    howl.play();
  hasLoadedTrack = true;
    return;
  } catch {}

  fallbackAudio = new Audio(fileUrl);
  fallbackAudio.volume = mapSliderToVolume(Number(volumeSlider.value));
  fallbackAudio.play();
  hasLoadedTrack = true;
  fallbackAudio.addEventListener('timeupdate', updateProgress);
  fallbackAudio.addEventListener('ended', () => { recordPlay(file); loopMode ? playCurrent() : playNext(); });
}

async function playCurrent() {
  queue = await window.api.getQueue();
  index = await window.api.getCurrentIndex();
  const file = queue[index];
  if (file) playFile(file);
}

function playNext() {
  if (!queue.length) return;
  if (shuffleMode) index = Math.floor(Math.random() * queue.length);
  else index = (index < queue.length - 1) ? index + 1 : index;
  window.api.setIndex(index);
  playCurrent();
}

function playPrev() {
  if (!queue.length) return;
  if (shuffleMode) index = Math.floor(Math.random() * queue.length);
  else index = (index > 0) ? index - 1 : 0;
  window.api.setIndex(index);
  playCurrent();
}

async function recordPlay(file: string) {
  try {
    const settings = await window.api.loadSettings() || {};
    settings.playCounts = settings.playCounts || {};
    settings.playCounts[file] = (settings.playCounts[file] || 0) + 1;

    const metadata = await window.api.getMetadata(file);
    const artist = metadata.artist || 'Unknown Artist';
    settings.artistCounts = settings.artistCounts || {};
    settings.artistCounts[artist] = (settings.artistCounts[artist] || 0) + 1;

    await window.api.saveSettings(settings);
  } catch {}
}

playToggleBtn?.addEventListener('click', () => {
  if (isPlayingNow()) {
    pause();
    return;
  }

  if (hasLoadedTrack) {
    if (howl) howl.play();
    else if (fallbackAudio) fallbackAudio.play();
    isPlaying = true;
    playToggleBtn && (playToggleBtn.textContent = '⏸');
    updateProgress();
    return;
  }

  playCurrent();
});

nextBtn?.addEventListener('click', playNext);
prevBtn?.addEventListener('click', playPrev);

function pause() {
  if (howl) howl.pause();
  if (fallbackAudio) fallbackAudio.pause();
  isPlaying = false;
  playToggleBtn && (playToggleBtn.textContent = '▶️');
}

function isPlayingNow() {
  if (howl) return howl.playing();
  if (fallbackAudio) return !fallbackAudio.paused;
  return isPlaying;
}

progressBar.addEventListener('input', () => {
  const pct = Number(progressBar.value) / 100;
  if (howl) howl.seek(howl.duration() * pct);
  else if (fallbackAudio && fallbackAudio.duration) fallbackAudio.currentTime = fallbackAudio.duration * pct;
  updateProgress();
});

volumeSlider.addEventListener('input', () => {
  const mapped = mapSliderToVolume(Number(volumeSlider.value));
  Howler.volume(mapped);
  if (fallbackAudio) fallbackAudio.volume = mapped;
});

loopBtn?.addEventListener('click', () => { loopMode = !loopMode; loopBtn.classList.toggle('active', loopMode); });
shuffleBtn?.addEventListener('click', () => { shuffleMode = !shuffleMode; shuffleBtn.classList.toggle('active', shuffleMode); });

(async function init() {
  const settings = await window.api.loadSettings() || {};
  if (settings.volume !== undefined) volumeSlider.value = settings.volume.toString();
  Howler.volume(mapSliderToVolume(Number(volumeSlider.value)));

  loopMode = !!settings.loop;
  loopBtn?.classList.toggle('active', loopMode);

  shuffleMode = !!settings.shuffle;
  shuffleBtn?.classList.toggle('active', shuffleMode);

  window.api.onLoadQueue?.(({ queue: q, index: i }) => {
    queue = q; index = i; window.api.setQueue(queue); window.api.setIndex(index); playCurrent();
  });
})();
