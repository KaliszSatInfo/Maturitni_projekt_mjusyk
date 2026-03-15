import { Howl, Howler } from "howler";
import { Equalizer } from "./ui/equalizer";
import { formatDuration, volume } from "./state/settings";
import { currentPlaylist } from "./state/playlists";

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
let saveStateInterval: number | null = null;
let lastSavedListeningTime: number = 0;
let listeningUpdateInterval: number | null = null;

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

async function savePlaybackState() {
  try {
    const settings = await window.api.loadSettings() || {};
    let currentTime = 0;
    
    if (howl) {
      currentTime = howl.seek() as number;
    } else if (fallbackAudio) {
      currentTime = fallbackAudio.currentTime;
    }
    
    settings.lastPlayback = {
      queue,
      index,
      time: currentTime,
      isPlaying
    };
    
    await window.api.saveSettings(settings);
  } catch (err) {
    console.error('Error saving playback state:', err);
  }
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
  stopListeningTimeUpdate();
  if (howl) { howl.unload(); howl = null; }
  if (fallbackAudio) { fallbackAudio.pause(); fallbackAudio.src = ''; fallbackAudio = null; }
  if (progressRaf !== null) { cancelAnimationFrame(progressRaf); progressRaf = null; }
  if (saveStateInterval !== null) { clearInterval(saveStateInterval); saveStateInterval = null; }

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

        const playlistName = currentPlaylist?.name;
        recordPlay(file, playlistName);
        
        if (saveStateInterval !== null) clearInterval(saveStateInterval);
        saveStateInterval = window.setInterval(savePlaybackState, 5000);
      },
      onpause: () => {
        isPlaying = false;
        playToggleBtn.textContent = "▶";
        stopListeningTimeUpdate();
        if (saveStateInterval !== null) { clearInterval(saveStateInterval); saveStateInterval = null; }
        savePlaybackState();
      },
      onend: () => {
        stopListeningTimeUpdate();
        if (saveStateInterval !== null) { clearInterval(saveStateInterval); saveStateInterval = null; }
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
  stopListeningTimeUpdate();
  if (!queue.length) return;
  if (shuffleMode) index = Math.floor(Math.random() * queue.length);
  else index = (index < queue.length - 1) ? index + 1 : index;
  window.api.setIndex(index);
  savePlaybackState();
  playCurrent();
}

function playPrev() {
  stopListeningTimeUpdate();
  if (!queue.length) return;
  if (shuffleMode) index = Math.floor(Math.random() * queue.length);
  else index = (index > 0) ? index - 1 : 0;
  window.api.setIndex(index);
  savePlaybackState();
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
    lastSavedListeningTime = 0;
    startListeningTimeUpdate();

    await window.api.saveSettings(settings);
  } catch (err) {
    console.error("recordPlay error:", err);
  }
}

function startListeningTimeUpdate() {
  if (listeningUpdateInterval !== null) {
    clearInterval(listeningUpdateInterval);
  }

  listeningUpdateInterval = window.setInterval(async () => {
    try {
      if (!playStartTime || !isPlayingNow()) return;

      const elapsedTime = Math.floor((Date.now() - playStartTime) / 1000);
      const timeSinceLastSave = elapsedTime - lastSavedListeningTime;

      if (timeSinceLastSave >= 1) {
        const settings = await window.api.loadSettings() || {};
        settings.totalListeningTime = settings.totalListeningTime || 0;

        let incrementSeconds = timeSinceLastSave;

        if (howl) {
          const duration = Math.floor(howl.duration());
          const currentPosition = Math.floor(howl.seek() as number);

          if (currentPosition > duration) {
            incrementSeconds = Math.min(incrementSeconds, duration - lastSavedListeningTime);
          }
        }

        if (incrementSeconds > 0 && incrementSeconds <= 60) {
          settings.totalListeningTime += incrementSeconds;
          lastSavedListeningTime = elapsedTime;
          await window.api.saveSettings(settings);
        }
      }
    } catch (err) {
      console.error("Error updating listening time:", err);
    }
  }, 1000);
}

function stopListeningTimeUpdate() {
  if (listeningUpdateInterval !== null) {
    clearInterval(listeningUpdateInterval);
    listeningUpdateInterval = null;
  }
  playStartTime = null;
}

function pause() {
  if (howl) howl.pause();
  if (fallbackAudio) fallbackAudio.pause();
  isPlaying = false;
  playToggleBtn.textContent = '▶';
  stopListeningTimeUpdate();
  if (saveStateInterval !== null) { clearInterval(saveStateInterval); saveStateInterval = null; }
  savePlaybackState();
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

volumeSlider.addEventListener('input', async () => {
  const mapped = mapSliderToVolume(Number(volumeSlider.value));
  Howler.volume(mapped);
  if (fallbackAudio) fallbackAudio.volume = mapped;
    try {
    const settings = await window.api.loadSettings() || {};
    settings.volume = Number(volumeSlider.value);
    await window.api.saveSettings(settings);
  } catch (err) {
    console.error('Error saving volume:', err);
  }
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
  
  // Set volume from loaded settings or use the imported default
  const savedVolume = settings.volume !== undefined ? settings.volume : volume;
  volumeSlider.value = savedVolume.toString();
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
  
  if (settings.lastPlayback?.queue?.length > 0) {
    queue = settings.lastPlayback.queue;
    index = Math.min(settings.lastPlayback.index || 0, queue.length - 1);
    
    window.api.setQueue(queue);
    window.api.setIndex(index);
    
    const file = queue[index];
    if (file) {
      await playFile(file);
      
      if (typeof settings.lastPlayback.time === 'number' && howl) {
        const savedTime = Math.max(0, settings.lastPlayback.time);
        howl.seek(savedTime);
      }
      
      if (!settings.lastPlayback.isPlaying) {
        howl?.pause();
        hasLoadedTrack = true;
      }
    }
  }
})();
