let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgLoopNodes: { stop: () => void }[] = [];
let currentLoop: string | null = null;
let currentDiff: "easy" | "medium" | "hard" = "easy";

function ctx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.65;
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}
function master(): GainNode { ctx(); return masterGain!; }
export function initAudio() { ctx(); }
export function setDifficulty(d: "easy" | "medium" | "hard") { currentDiff = d; }

export function stopMusic() {
  bgLoopNodes.forEach(n => { try { n.stop(); } catch { } });
  bgLoopNodes = []; currentLoop = null;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.25, t0?: number, dest?: AudioNode) {
  const c = ctx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g); g.connect(dest ?? master());
  osc.type = type; osc.frequency.value = freq;
  const t = t0 ?? c.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t); osc.stop(t + dur + 0.01);
}
export function playTick() {
  const c = ctx(), now = c.currentTime;
  const freq = currentDiff === "hard" ? 1100 : currentDiff === "medium" ? 960 : 820;
  tone(freq, 0.032, "square", 0.11, now);
}
export function playUrgentTick() {
  const c = ctx(), now = c.currentTime;
  tone(1300, 0.032, "square", 0.22, now);
  tone(1600, 0.024, "square", 0.14, now + 0.04);
}
export function playTimeUp() {
  stopMusic();
  const c = ctx(), now = c.currentTime;
  [400, 300, 200].forEach((f, i) => tone(f, 0.28, "sawtooth", 0.32, now + i * 0.2));
}
export function playCountdownBeep(n: number) {
  const c = ctx(), now = c.currentTime;
  if (n > 0) {
    const base = 440 + (3 - n) * 120;
    tone(base, 0.12, "square", 0.22, now);
    tone(base * 1.5, 0.08, "sine", 0.12, now + 0.08);
  } else {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, "sine", 0.35, now + i * 0.06));
    tone(130, 0.35, "triangle", 0.3, now);
  }
}
export function startQuestionLoop(urgency = 0) {
  stopMusic(); currentLoop = "question";
  const c = ctx();
  const bpm = (currentDiff === "hard" ? 138 : currentDiff === "medium" ? 118 : 98) + urgency * 44;
  const beat = 60 / bpm;
  let stopped = false;
  const bg = c.createGain(); bg.gain.value = 0; bg.connect(master());
  const bo = c.createOscillator();
  bo.type = "sine";
  bo.frequency.value = currentDiff === "hard" ? 46 : currentDiff === "medium" ? 55 : 62;
  bo.connect(bg); bo.start();

  let nb = c.currentTime;
  function pulse() {
    if (stopped) return;
    const now = c.currentTime;
    if (nb < now) nb = now;
    while (nb < now + 0.5) {
      const v = 0.18 + urgency * 0.12;
      bg.gain.setValueAtTime(v, nb);
      bg.gain.exponentialRampToValueAtTime(0.0001, nb + beat * 0.38);
      if (urgency > 0.45) {
        bg.gain.setValueAtTime(v * 0.5, nb + beat * 0.52);
        bg.gain.exponentialRampToValueAtTime(0.0001, nb + beat * 0.78);
      }
      nb += beat;
    }
    setTimeout(pulse, 200);
  }
  pulse();
  const patterns = {
    easy: [220, 277, 330, 415, 523, 415, 330, 277],
    medium: [185, 233, 311, 370, 466, 554, 466, 370],
    hard: [110, 138, 165, 220, 277, 370, 466, 370, 277, 220],
  };
  const notes = patterns[currentDiff];
  let ai = 0, aStopped = false;
  const aspd = beat * (currentDiff === "hard" ? 0.28 : 0.5);
  function arp() {
    if (aStopped) return;
    tone(notes[ai % notes.length], aspd * 0.8, currentDiff === "hard" ? "sawtooth" : "triangle", 0.055 + urgency * 0.04);
    ai++; setTimeout(arp, aspd * 1000);
  }
  arp();
  let hStopped = false;
  if (currentDiff !== "easy" || urgency > 0.6) {
    const hat = () => {
      if (hStopped) return;
      tone(5500 + Math.random() * 2500, 0.018, "square", 0.035);
      setTimeout(hat, beat * 0.5 * 1000);
    };
    hat();
    bgLoopNodes.push({ stop: () => { hStopped = true; } });
  }

  bgLoopNodes.push({ stop: () => { stopped = true; aStopped = true; try { bo.stop(); } catch { } } });
}

export function updateQuestionUrgency(urgency: number) {
  if (currentLoop === "question") { stopMusic(); startQuestionLoop(urgency); }
}
export function playRevealMusic() {
  stopMusic();
  const c = ctx(), now = c.currentTime;
  const freqs = currentDiff === "hard"
    ? [82, 98, 110, 138, 165, 196, 220, 277, 330, 392, 440, 523, 659]
    : [110, 130, 155, 185, 220, 261, 311, 370, 440, 523];
  freqs.forEach((f, i) => {
    tone(f, 0.42, "sawtooth", 0.055 + i * 0.006, now + i * (currentDiff === "hard" ? 0.17 : 0.2));
    tone(f * 4, 0.28, "sine", 0.03, now + i * 0.2 + 0.08);
  });
  let rollT = now, rollI = currentDiff === "hard" ? 0.17 : 0.13, rStopped = false;
  function roll() {
    if (rStopped || rollT > now + 4) return;
    tone(72, 0.055, "square", 0.18, rollT);
    rollT += rollI; rollI *= (currentDiff === "hard" ? 0.87 : 0.92);
    setTimeout(roll, 35);
  }
  roll();
  bgLoopNodes.push({ stop: () => { rStopped = true; } });
}
export function playCorrect() {
  stopMusic();
  const c = ctx(), now = c.currentTime;
  const melody = currentDiff === "hard"
    ? [523, 659, 784, 1047, 1319, 1568, 1319, 1047, 1319, 1568]
    : [523, 659, 784, 1047, 1319, 1047, 784, 1319];
  melody.forEach((f, i) => tone(f, 0.22, "sine", 0.34, now + i * 0.08));
  tone(130, 0.45, "triangle", 0.36, now);
  if (currentDiff === "hard") { tone(80, 0.08, "square", 0.42, now); }
}
export function playWrong() {
  stopMusic();
  const c = ctx(), now = c.currentTime;
  if (currentDiff === "hard") {
    [220, 196, 165, 130].forEach((f, i) => tone(f, 0.22, "sawtooth", 0.38, now + i * 0.16));
  } else {
    [220, 196, 165].forEach((f, i) => tone(f, 0.22, "sawtooth", 0.3, now + i * 0.2));
  }
}
export function startLeaderboardMusic(isTop: boolean) {
  stopMusic(); currentLoop = "leaderboard";
  const c = ctx(); let stopped = false;
  const win = [[523, 659, 784], [587, 740, 880], [659, 784, 988], [523, 659, 784]];
  const los = [[392, 494, 587], [440, 554, 659], [392, 494, 587], [349, 440, 523]];
  const chords = isTop ? win : los;
  let ci = 0;
  const dur = currentDiff === "hard" ? 0.44 : 0.58;
  function chord() {
    if (stopped) return;
    const now = c.currentTime;
    chords[ci % chords.length].forEach((f, i) => tone(f, dur * 0.88, "sine", 0.11, now + i * 0.02));
    tone(chords[ci % chords.length][0] / 2, dur * 0.6, "triangle", 0.16, now);
    ci++; setTimeout(chord, dur * 1000);
  }
  chord();
  let hStopped = false;
  function hat() { if (hStopped) return; tone(4200 + Math.random() * 2000, 0.038, "square", 0.032); setTimeout(hat, 280); }
  hat();
  bgLoopNodes.push({ stop: () => { stopped = true; hStopped = true; } });
}
export function playWinnerMusic() {
  stopMusic(); currentLoop = "winner";
  const c = ctx(), now = c.currentTime;
  const melody = [523, 523, 659, 523, 784, 740, 523, 523, 659, 523, 880, 784];
  const timing = [0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 2.25, 2.5, 2.75, 3.0, 3.5];
  melody.forEach((f, i) => { tone(f, 0.38, "sine", 0.36, now + timing[i]); tone(f * 2, 0.28, "sine", 0.12, now + timing[i] + 0.02); });
  [130, 196, 261, 196, 130].forEach((f, i) => tone(f, 0.48, "triangle", 0.28, now + i * 0.75));
  [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].forEach(t => { tone(78, 0.07, "square", 0.24, now + t); tone(5000, 0.055, "square", 0.05, now + t + 0.25); });
  let stopped = false, lt = now + 4.5;
  function loop() {
    if (stopped) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.48, "sine", 0.14, lt + i * 0.03));
    tone(130, 0.38, "triangle", 0.18, lt);
    lt += 1.2; setTimeout(loop, 1200);
  }
  loop();
  bgLoopNodes.push({ stop: () => { stopped = true; } });
}
export function playPause() {
  const c = ctx(), now = c.currentTime;
  tone(660, 0.08, "sine", 0.2, now);
  tone(440, 0.12, "sine", 0.2, now + 0.1);
}
export function playResume() {
  const c = ctx(), now = c.currentTime;
  tone(440, 0.08, "sine", 0.2, now);
  tone(660, 0.12, "sine", 0.2, now + 0.1);
  tone(880, 0.1, "sine", 0.18, now + 0.2);
}

export function playSuspense() { playRevealMusic(); }
export function playCelebration() { playWinnerMusic(); }
export function playLeaderboard() { startLeaderboardMusic(false); }