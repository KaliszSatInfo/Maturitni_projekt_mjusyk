import { Howl, Howler } from "howler";
import { Equalizer } from "./ui/equalizer";
import { formatDuration } from "./state/settings";

const eqContainer = document.getElementById("equalizer")!;
const eq = new Equalizer(eqContainer);
const audioCtx = new AudioContext();

let howl: Howl | null = null;
let fallbackAudio: HTMLAudioElement | null = null;

let queue: string[] = [];
let index = 0;

let hasLoadedTrack = false;
let isPlaying = false;
let loopMode = false;
let shuffleMode = false;
let progressRaf: number | null = null;
let playStartTime: number | null = null;

const playToggleBtn = document.getElementById('play-toggle') as HTMLButtonElement;
const shuffleBtn = document.getElementById('shuffle-btn') as HTMLButtonElement;
const loopBtn = document.getElementById('loop-btn') as HTMLButtonElement;
const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;

const art = document.getElementById("player-art") as HTMLImageElement;
const titleEl = document.getElementById("track-title")!;
const artistEl = document.getElementById("track-artist")!;
const currentTimeEl = document.getElementById("current-time")!;
const totalTimeEl = document.getElementById("total-time")!;
const progressBar = document.getElementById("progress-bar") as HTMLInputElement;
const volumeSlider = document.getElementById("volume-slider") as HTMLInputElement;
const placeholder = new URL(
  "../assets/placeholder.png",
  import.meta.url
).href;

function mapSliderToVolume(s: number) {
  const clamped = Math.max(0, Math.min(1, s));
  return Math.pow(clamped, 2) * 0.45;
}

function connectEQToHowl(howl: Howl) {
  try {
    const sound = howl._sounds[0];
    const audioNode = sound._node as HTMLMediaElement;

    const source = audioCtx.createMediaElementSource(audioNode);

    let prev: AudioNode = source;
    eq.bands.forEach(band => {
      const filter = audioCtx.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = band.frequency;
      filter.Q.value = 1;
      filter.gain.value = band.slider ? parseFloat(band.slider.value) : 0;
      band.node = filter;

      prev.connect(filter);
      prev = filter;
    });

    prev.connect(audioCtx.destination);

    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (err) {
    console.warn("EQ connection failed:", err);
  }
}

function updateProgress() {
  let current = 0, duration = 0;

  if (howl) {
    try { current = howl.seek() as number; duration = howl.duration() || 0; } catch {}
  } else if (fallbackAudio) {
    current = fallbackAudio.currentTime || 0;
    duration = fallbackAudio.duration || 0;
  }

  currentTimeEl.textContent = formatDuration(current);
  totalTimeEl.textContent = formatDuration(duration);
  progressBar.value = duration > 0 ? ((current / duration) * 100).toString() : "0";
  
  if (isPlaying && progressRaf === null) {
    const loop = () => { updateProgress(); progressRaf = requestAnimationFrame(loop); };
    progressRaf = requestAnimationFrame(loop);
  }
}

async function playFile(file: string) {
  if (howl) { howl.unload(); howl = null; }
  if (fallbackAudio) { fallbackAudio.pause(); fallbackAudio.src = ''; fallbackAudio = null; }
  if (progressRaf !== null) { cancelAnimationFrame(progressRaf); progressRaf = null; }

  const metadata = await window.api.getMetadata(file);
  const artData = await window.api.getAlbumArt(file);
  titleEl.textContent = metadata.title || file.split(/[/\\]/).pop()!;
  artistEl.textContent = metadata.artist || "Unknown Artist";
  art.src = artData || placeholder;
  const fileUrl = encodeURI("file://" + file.replace(/\\/g, "/"));

  try {
    howl = new Howl({
      src: [fileUrl],
      html5: true,
      onplay: async () => {
        isPlaying = true;
        playToggleBtn.textContent = "⏸";
        updateProgress();
        connectEQToHowl(howl!);

        const playlistName = await window.api.getCurrentPlaylist?.();
        recordPlay(file, playlistName);
      },
      onpause: () => {
        isPlaying = false;
        playToggleBtn.textContent = "▶";
        recordStop();
      },
      onend: () => {
        recordStop();
        loopMode ? playCurrent() : playNext();
      },
      onload: () => updateProgress()
    });

    howl.play();
    hasLoadedTrack = true;
  } catch {}
}

async function playCurrent() {
  queue = await window.api.getQueue();
  index = await window.api.getCurrentIndex();
  const file = queue[index];
  if (file) playFile(file);
}

function playNext() {
  recordStop();
  if (!queue.length) return;
  if (shuffleMode) index = Math.floor(Math.random() * queue.length);
  else index = (index < queue.length - 1) ? index + 1 : index;
  window.api.setIndex(index);
  playCurrent();
}

function playPrev() {
  recordStop();
  if (!queue.length) return;
  if (shuffleMode) index = Math.floor(Math.random() * queue.length);
  else index = (index > 0) ? index - 1 : 0;
  window.api.setIndex(index);
  playCurrent();
}

async function recordPlay(file: string, playlistName?: string) {
  try {
    const settings = await window.api.loadSettings() || {};

    settings.playCounts = settings.playCounts || {};
    settings.artistCounts = settings.artistCounts || {};
    settings.playlistCounts = settings.playlistCounts || {};
    settings.totalListeningTime = settings.totalListeningTime || 0;

    settings.playCounts[file] = (settings.playCounts[file] || 0) + 1;

    const metadata = await window.api.getMetadata(file);
    const artist = metadata.artist || "Unknown Artist";
    settings.artistCounts[artist] = (settings.artistCounts[artist] || 0) + 1;

    if (playlistName) {
      settings.playlistCounts[playlistName] =
        (settings.playlistCounts[playlistName] || 0) + 1;
    }

    playStartTime = Date.now();

    await window.api.saveSettings(settings);
  } catch (err) {
    console.error("recordPlay error:", err);
  }
}

async function recordStop() {
  try {
    if (!playStartTime) return;

    const settings = await window.api.loadSettings() || {};
    settings.totalListeningTime = settings.totalListeningTime || 0;

    let listenedTime = Math.floor((Date.now() - playStartTime) / 1000);

    if (howl) {
      const duration = Math.floor(howl.duration());
      if (listenedTime > duration) listenedTime = duration;
    }

    if (listenedTime < 0 || listenedTime > 60 * 60 * 24) {
      listenedTime = 0;
    }

    settings.totalListeningTime += listenedTime;
    playStartTime = null;

    await window.api.saveSettings(settings);
  } catch (err) {
    console.error("recordStop error:", err);
  }
}

function pause() {
  if (howl) howl.pause();
  if (fallbackAudio) fallbackAudio.pause();
  isPlaying = false;
  playToggleBtn.textContent = '▶';
  recordStop();
}

function isPlayingNow(): boolean {
  if (howl) return howl.playing();
  if (fallbackAudio) return !fallbackAudio.paused;
  return isPlaying;
}

playToggleBtn.addEventListener('click', () => {
  if (isPlayingNow()) { pause(); return; }
  if (hasLoadedTrack) {
    if (howl) howl.play();
    else if (fallbackAudio) fallbackAudio.play();
    isPlaying = true;
    playToggleBtn.textContent = '⏸';
    updateProgress();
    return;
  }
  playCurrent();
});

progressBar.addEventListener('input', () => {
  const pct = Number(progressBar.value) / 100;
  if (howl) howl.seek(howl.duration() * pct);
  else if (fallbackAudio) fallbackAudio.currentTime = (fallbackAudio.duration || 0) * pct;
  updateProgress();
});

volumeSlider.addEventListener('input', () => {
  const mapped = mapSliderToVolume(Number(volumeSlider.value));
  Howler.volume(mapped);
  if (fallbackAudio) fallbackAudio.volume = mapped;
});

loopBtn.addEventListener('click', () => {
  loopMode = !loopMode;
  loopBtn.classList.toggle('active', loopMode);
});

shuffleBtn.addEventListener('click', () => {
  shuffleMode = !shuffleMode;
  shuffleBtn.classList.toggle('active', shuffleMode);
});

prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', playNext);

(async function init() {
  const settings = await window.api.loadSettings() || {};
  if (settings.volume !== undefined) volumeSlider.value = settings.volume.toString();
  Howler.volume(mapSliderToVolume(Number(volumeSlider.value)));

  loopMode = !!settings.loop;
  loopBtn.classList.toggle('active', loopMode);

  shuffleMode = !!settings.shuffle;
  shuffleBtn.classList.toggle('active', shuffleMode);

  window.api.onLoadQueue?.(async ({ queue: q, index: i}) => {
    queue = q;
    index = i;

    window.api.setQueue(queue);
    window.api.setIndex(index);
    playCurrent();
  });
})();
