// Web Audio API Procedural Synthesizer
// Generates peaceful wind and bird chirping without needing any external audio files!

let audioCtx = null;
let masterGain = null;
let windBuffer = null;
let windInterval = null;
let birdInterval = null;
let currentVolume = 1.0;

export const initAudio = async () => {
  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = currentVolume;
      masterGain.connect(audioCtx.destination);
    }
    
    // CRITICAL: Web Audio API requires you to await the resume before playing!
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    
    await startWind();
    startBirds();
    console.log("Audio synthesis started successfully.");
  } catch (err) {
    console.error("Failed to initialize audio synthesis:", err);
  }
};

export const setAudioVolume = (volume) => {
  currentVolume = volume;
  if (masterGain && audioCtx) {
    // Smooth transition to new volume
    masterGain.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.5);
  }
};

export const stopAudio = () => {
  if (audioCtx) {
    audioCtx.suspend();
  }
  if (birdInterval) clearInterval(birdInterval);
  if (windInterval) clearInterval(windInterval);
};

const startWind = async () => {
  if (windInterval) return; // Already running

  if (!windBuffer) {
    try {
      const response = await fetch('/dragon-studio-wind-blowing-sfx-01-423673.mp3');
      const arrayBuffer = await response.arrayBuffer();
      windBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.error("Failed to load wind audio file.", err);
      return;
    }
  }

  // The MP3 file has some silence at the end. 
  // We'll crossfade multiple instances of it so there is NEVER a gap.
  const crossfadeDuration = 3; // 3 seconds overlap
  const duration = windBuffer.duration;
  // If the file is extremely short, adjust crossfade to be safe
  const overlap = Math.min(crossfadeDuration, duration / 3);
  
  const playLayer = () => {
    if (audioCtx.state !== 'running') return;
    
    const source = audioCtx.createBufferSource();
    source.buffer = windBuffer;
    
    const localGain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    
    // Fade in
    localGain.gain.setValueAtTime(0, now);
    localGain.gain.linearRampToValueAtTime(1, now + overlap);
    
    // Fade out at the end of the file
    localGain.gain.setValueAtTime(1, now + duration - overlap);
    localGain.gain.linearRampToValueAtTime(0, now + duration);
    
    source.connect(localGain);
    localGain.connect(masterGain);
    
    source.start(0);
    
    // Cleanup nodes after playing
    source.onended = () => {
      source.disconnect();
      localGain.disconnect();
    };
  };

  playLayer(); // Play first layer immediately
  
  // Schedule next layer to start right as the current one begins to fade out
  windInterval = setInterval(playLayer, (duration - overlap) * 1000);
};

const playBirdChirp = () => {
  if (!audioCtx || audioCtx.state !== 'running') return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const panner = audioCtx.createStereoPanner();
  
  osc.connect(gain);
  gain.connect(panner);
  panner.connect(masterGain || audioCtx.destination);
  
  osc.type = 'sine';
  panner.pan.value = (Math.random() - 0.5) * 1.5; 
  
  const now = audioCtx.currentTime;
  const duration = 0.15 + Math.random() * 0.1;
  const baseFreq = 3000 + Math.random() * 2000;
  
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq + 2000, now + duration / 2);
  osc.frequency.exponentialRampToValueAtTime(baseFreq - 500, now + duration);
  
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + duration * 0.2); // Louder chirp
  gain.gain.linearRampToValueAtTime(0, now + duration);
  
  osc.start(now);
  osc.stop(now + duration);
  
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
    panner.disconnect();
  };
};

const startBirds = () => {
  if (birdInterval) clearInterval(birdInterval);
  
  const scheduleNextChirp = () => {
    const delay = 1000 + Math.random() * 3000; 
    birdInterval = setTimeout(() => {
      playBirdChirp();
      if (Math.random() > 0.5) {
        setTimeout(playBirdChirp, 200);
      }
      scheduleNextChirp();
    }, delay);
  };
  
  scheduleNextChirp();
};
