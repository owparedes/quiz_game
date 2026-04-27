let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgLoopNodes: { stop: () => void }[] = [];
let currentLoop: string | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

function getMaster(): GainNode {
  getCtx();
  return masterGain!;
}

export function initAudio() { getCtx(); }

export function stopMusic() {
  bgLoopNodes.forEach((n) => { try { n.stop(); } catch { } });
  bgLoopNodes = [];
  currentLoop = null;
}

function playTone(
  freq: number, duration: number,
  type: OscillatorType = "sine", gainVal = 0.3,
  startTime?: number, destination?: AudioNode
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(destination ?? getMaster());
  osc.type = type;
  osc.frequency.value = freq;
  const t = startTime ?? ctx.currentTime;
  gain.gain.setValueAtTime(gainVal, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

export function playTick() { playTone(880, 0.04, "square", 0.12); }
export function playUrgentTick() {
  const ctx = getCtx(); const now = ctx.currentTime;
  playTone(1100, 0.04, "square", 0.2, now);
  playTone(1200, 0.03, "square", 0.15, now + 0.05);
}

export function playTimeUp() {
  stopMusic();
  const ctx = getCtx(); const now = ctx.currentTime;
  playTone(440, 0.25, "sawtooth", 0.3, now);
  playTone(330, 0.25, "sawtooth", 0.3, now + 0.25);
  playTone(220, 0.5, "sawtooth", 0.35, now + 0.5);
}

export function playCountdownBeep(num: number) {
  const ctx = getCtx(); const now = ctx.currentTime;
  if (num > 0) {
    const freq = 440 + (3 - num) * 110;
    playTone(freq, 0.12, "square", 0.25, now);
    playTone(freq * 1.5, 0.08, "sine", 0.15, now + 0.1);
  } else {
    [523, 659, 784, 1047].forEach((f, i) => playTone(f, 0.18, "sine", 0.35, now + i * 0.07));
  }
}

export function startQuestionLoop(urgency: number = 0) {
  stopMusic();
  currentLoop = "question";
  const ctx = getCtx();
  const bpm = 100 + urgency * 40;
  const beat = 60 / bpm;
  let stopped = false;

  const bassGain = ctx.createGain();
  bassGain.gain.value = 0;
  bassGain.connect(getMaster());
  const bassOsc = ctx.createOscillator();
  bassOsc.type = "sine";
  bassOsc.frequency.value = 55 + urgency * 20;
  bassOsc.connect(bassGain);
  bassOsc.start();

  let nextBeat = ctx.currentTime;
  function schedulePulse() {
    if (stopped) return;
    const now = ctx.currentTime;
    if (nextBeat < now) nextBeat = now;
    while (nextBeat < now + 0.5) {
      bassGain.gain.setValueAtTime(0.18 + urgency * 0.1, nextBeat);
      bassGain.gain.exponentialRampToValueAtTime(0.001, nextBeat + beat * 0.4);
      if (urgency > 0.5) {
        bassGain.gain.setValueAtTime(0.1, nextBeat + beat * 0.5);
        bassGain.gain.exponentialRampToValueAtTime(0.001, nextBeat + beat * 0.8);
      }
      nextBeat += beat;
    }
    setTimeout(schedulePulse, 200);
  }
  schedulePulse();

  const arpNotes = [220, 277, 330, 415, 523, 415, 330, 277];
  let arpIdx = 0; let arpStopped = false;
  const arpSpeed = beat * 0.5;
  function scheduleArp() {
    if (arpStopped) return;
    playTone(arpNotes[arpIdx % arpNotes.length], arpSpeed * 0.8, "triangle", 0.06 + urgency * 0.04);
    arpIdx++;
    setTimeout(scheduleArp, arpSpeed * 1000);
  }
  scheduleArp();

  bgLoopNodes.push({ stop: () => { stopped = true; arpStopped = true; try { bassOsc.stop(); } catch { } } });
}

export function updateQuestionUrgency(urgency: number) {
  if (currentLoop === "question") { stopMusic(); startQuestionLoop(urgency); }
}

export function playRevealMusic() {
  stopMusic();
  const ctx = getCtx(); const now = ctx.currentTime;
  const rising = [110, 123, 138, 155, 174, 196, 220, 247, 277, 311, 349, 392, 440];
  rising.forEach((freq, i) => {
    playTone(freq, 0.4, "sawtooth", 0.08 + i * 0.008, now + i * 0.22);
    playTone(freq * 4, 0.3, "sine", 0.04, now + i * 0.22 + 0.1);
  });
  let rollStopped = false; let rollTime = now; let rollInterval = 0.12;
  function scheduleRoll() {
    if (rollStopped || rollTime > now + 3.5) return;
    playTone(80, 0.05, "square", 0.15, rollTime);
    rollTime += rollInterval; rollInterval *= 0.94;
    setTimeout(scheduleRoll, 50);
  }
  scheduleRoll();
  bgLoopNodes.push({ stop: () => { rollStopped = true; } });
}

export function playCorrect() {
  stopMusic();
  const ctx = getCtx(); const now = ctx.currentTime;
  [523, 659, 784, 1047, 1319, 1047, 784, 1319].forEach((f, i) => playTone(f, 0.2, "sine", 0.32, now + i * 0.09));
  playTone(130, 0.4, "triangle", 0.35, now);
  playTone(196, 0.3, "triangle", 0.25, now + 0.1);
}

export function playWrong() {
  stopMusic();
  const ctx = getCtx(); const now = ctx.currentTime;
  playTone(220, 0.2, "sawtooth", 0.3, now);
  playTone(196, 0.2, "sawtooth", 0.3, now + 0.2);
  playTone(165, 0.4, "sawtooth", 0.3, now + 0.4);
}

export function startLeaderboardMusic(isTop: boolean) {
  stopMusic();
  currentLoop = "leaderboard";
  const ctx = getCtx(); let stopped = false;
  const chords = isTop
    ? [[523, 659, 784], [587, 740, 880], [659, 784, 988], [523, 659, 784]]
    : [[392, 494, 587], [440, 554, 659], [392, 494, 587], [349, 440, 523]];
  let chordIdx = 0; const chordDur = 0.6;
  function scheduleChord() {
    if (stopped) return;
    const now = ctx.currentTime;
    const chord = chords[chordIdx % chords.length];
    chord.forEach((f, i) => playTone(f, chordDur * 0.85, "sine", 0.12, now + i * 0.025));
    playTone(chord[0] / 2, chordDur * 0.6, "triangle", 0.18, now);
    chordIdx++; setTimeout(scheduleChord, chordDur * 1000);
  }
  scheduleChord();
  let hatStopped = false;
  function scheduleHat() {
    if (hatStopped) return;
    playTone(4000 + Math.random() * 2000, 0.04, "square", 0.04);
    setTimeout(scheduleHat, 300);
  }
  scheduleHat();
  bgLoopNodes.push({ stop: () => { stopped = true; hatStopped = true; } });
}

export function playWinnerMusic() {
  stopMusic();
  const ctx = getCtx(); const now = ctx.currentTime; currentLoop = "winner";
  const melody = [523, 523, 659, 523, 784, 740, 523, 523, 659, 523, 880, 784];
  const timing = [0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 2.25, 2.5, 2.75, 3.0, 3.5];
  melody.forEach((f, i) => { playTone(f, 0.4, "sine", 0.35, now + timing[i]); playTone(f * 2, 0.3, "sine", 0.12, now + timing[i] + 0.02); });
  [130, 196, 261, 196, 130].forEach((f, i) => playTone(f, 0.5, "triangle", 0.3, now + i * 0.75));
  [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5].forEach((t) => { playTone(80, 0.08, "square", 0.25, now + t); playTone(5000, 0.06, "square", 0.05, now + t + 0.25); });
  let stopped = false; let loopTime = now + 4.5;
  function scheduleVictoryLoop() {
    if (stopped) return;
    [523, 659, 784, 1047].forEach((f, i) => playTone(f, 0.5, "sine", 0.15, loopTime + i * 0.03));
    playTone(130, 0.4, "triangle", 0.2, loopTime);
    loopTime += 1.2; setTimeout(scheduleVictoryLoop, 1200);
  }
  scheduleVictoryLoop();
  bgLoopNodes.push({ stop: () => { stopped = true; } });
}

// Legacy aliases
export function playSuspense() { playRevealMusic(); }
export function playCelebration() { playWinnerMusic(); }
export function playLeaderboard() { startLeaderboardMusic(false); }