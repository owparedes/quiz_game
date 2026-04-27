let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gainVal = 0.3,
  startTime?: number
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainVal, startTime ?? ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    (startTime ?? ctx.currentTime) + duration
  );
  osc.start(startTime ?? ctx.currentTime);
  osc.stop((startTime ?? ctx.currentTime) + duration);
}

export function initAudio() {
  getCtx();
}

export function playTick() {
  playTone(800, 0.05, "square", 0.15);
}

export function playTimeUp() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  playTone(400, 0.3, "sawtooth", 0.3, now);
  playTone(300, 0.3, "sawtooth", 0.3, now + 0.3);
  playTone(200, 0.5, "sawtooth", 0.3, now + 0.6);
}

export function playCorrect() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  playTone(523, 0.15, "sine", 0.3, now);
  playTone(659, 0.15, "sine", 0.3, now + 0.15);
  playTone(784, 0.3, "sine", 0.3, now + 0.3);
}

export function playWrong() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  playTone(200, 0.2, "sawtooth", 0.3, now);
  playTone(180, 0.4, "sawtooth", 0.3, now + 0.2);
}

export function playSuspense() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  [200, 220, 240, 260, 280, 300, 330, 360].forEach((freq, i) => {
    playTone(freq, 0.4, "sine", 0.15, now + i * 0.35);
  });
}

export function playCelebration() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  [523, 659, 784, 1047, 1319].forEach((freq, i) => {
    playTone(freq, 0.2, "sine", 0.35, now + i * 0.15);
  });
}

export function playLeaderboard() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    playTone(freq, 0.2, "sine", 0.25, now + i * 0.2);
  });
}
