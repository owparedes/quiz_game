// ============================================================
//  QUIZ GAME SOUNDS — Precise timing, clean transitions
//
//  Sound file assignments (per user spec):
//  wrong.mp3       → wrong answer
//  correct.mp3     → correct answer
//  winner.mp3      → winner (game over #1)
//  leaderboard.mp3 → runner ups / leaderboard music
//  countdown.mp3   → countdown / question loop
//  reveal.mp3      → drum roll during reveal phase
//
//  Flow timing (host page):
//  1. question phase  → countdown.mp3 loops
//  2. reveal phase    → reveal.mp3 (drum roll) plays as one-shot
//  3. +3800ms         → answer phase: drum roll stops, correct OR wrong plays
//  4. +5000ms         → leaderboard phase: leaderboard.mp3 loops (runner ups)
//  5. game_over       → winner.mp3 loops (winner celebration)
// ============================================================

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let currentLoop: string | null = null;
let currentDiff: "easy" | "medium" | "hard" = "easy";

// Active background audio (looping bg track)
let bgAudio: HTMLAudioElement | null = null;
// Active one-shot audio (drum roll, correct, wrong)
let oneShotAudio: HTMLAudioElement | null = null;

// Preloaded audio pool
const audioPool: Record<string, HTMLAudioElement[]> = {};

const SOUNDS = {
  question:    "/sounds/countdown.mp3",    // loops during question phase
  countdown:   "/sounds/countdown.mp3",    // same file used for countdown bg
  reveal:      "/sounds/reveal.mp3",       // drum roll — plays once on reveal
  correct:     "/sounds/correct.mp3",      // correct answer sting
  wrong:       "/sounds/wrong.mp3",        // wrong answer sting
  leaderboard: "/sounds/leaderboard.mp3",  // loops on leaderboard phase
  winner:      "/sounds/winner.mp3",       // winner celebration — loops on game_over #1
  runnerup:    "/sounds/runnerup.mp3",     // runner ups — loops on game_over for losers
};

// ── Preload ───────────────────────────────────────────────────
function preload(key: string, url: string, copies = 2) {
  audioPool[key] = [];
  for (let i = 0; i < copies; i++) {
    const a = new Audio(url);
    a.preload = "auto";
    a.load();
    audioPool[key].push(a);
  }
}

function getAudio(key: string): HTMLAudioElement {
  const pool = audioPool[key];
  if (!pool || pool.length === 0) {
    return new Audio(SOUNDS[key as keyof typeof SOUNDS]);
  }
  const free = pool.find(a => a.paused || a.ended);
  if (free) { free.currentTime = 0; return free; }
  const clone = new Audio(pool[0].src);
  clone.preload = "auto";
  pool.push(clone);
  return clone;
}

// ── Web Audio context (ticks/beeps only) ─────────────────────
function ctx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}
function mg(): GainNode { ctx(); return masterGain!; }

function beep(freq: number, dur: number, vol = 0.2) {
  const c = ctx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g); g.connect(mg());
  o.type = "sine"; o.frequency.value = freq;
  const t = c.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.01);
}

// ── Internal fade out ─────────────────────────────────────────
function fadeOut(el: HTMLAudioElement, durationMs = 250, onDone?: () => void) {
  const startVol = el.volume;
  if (startVol <= 0) { el.pause(); el.currentTime = 0; onDone?.(); return; }
  const steps = 12;
  const stepMs = durationMs / steps;
  const volStep = startVol / steps;
  let step = 0;
  const iv = setInterval(() => {
    step++;
    el.volume = Math.max(0, startVol - volStep * step);
    if (step >= steps) {
      clearInterval(iv);
      el.pause();
      el.currentTime = 0;
      onDone?.();
    }
  }, stepMs);
}

// ── Stop background loop ──────────────────────────────────────
export function stopMusic(fadeMs = 250) {
  if (bgAudio) {
    const el = bgAudio;
    bgAudio = null;
    currentLoop = null;
    fadeOut(el, fadeMs);
  }
}

// ── Stop active one-shot (drum roll / sting) ──────────────────
function stopOneShot(fadeMs = 120) {
  if (oneShotAudio) {
    const el = oneShotAudio;
    oneShotAudio = null;
    fadeOut(el, fadeMs);
  }
}

// ── Play a looping background track ──────────────────────────
function playLoop(key: string, volume = 0.75, fadeInMs = 400) {
  stopMusic(200);

  const a = getAudio(key);
  a.loop = true;
  a.volume = 0;
  bgAudio = a;
  currentLoop = key;

  a.play().catch(() => {});

  const steps = 20;
  const stepMs = fadeInMs / steps;
  let step = 0;
  const iv = setInterval(() => {
    step++;
    if (bgAudio === a) a.volume = Math.min(volume, (step / steps) * volume);
    if (step >= steps) clearInterval(iv);
  }, stepMs);
}

// ── Play a one-shot sound ─────────────────────────────────────
function playOneShot(key: string, volume = 1.0, onEnd?: () => void): HTMLAudioElement {
  const a = getAudio(key);
  a.loop = false;
  a.volume = volume;
  oneShotAudio = a;
  a.play().catch(() => {});
  if (onEnd) a.addEventListener("ended", onEnd, { once: true });
  return a;
}

// ============================================================
//  PUBLIC API
// ============================================================

export function initAudio() {
  ctx();
  Object.entries(SOUNDS).forEach(([key, url]) => {
    const copies = (key === "correct" || key === "wrong") ? 3 : 2;
    preload(key, url, copies);
  });
}

export function setDifficulty(d: "easy" | "medium" | "hard") {
  currentDiff = d;
}

// ── QUESTION PHASE ────────────────────────────────────────────
// countdown.mp3 loops as background music during question
export function startQuestionLoop(_urgency = 0) {
  if (currentLoop === "question") return;
  playLoop("question", 0.72, 600);
  currentLoop = "question";
}

// Increases playback rate as urgency climbs past 0.6
export function updateQuestionUrgency(urgency: number) {
  if (bgAudio && currentLoop === "question") {
    bgAudio.playbackRate = 1.0 + (urgency - 0.6) * 0.6;
  }
}

// ── TICKS ─────────────────────────────────────────────────────
export function playTick() {
  const freq = currentDiff === "hard" ? 1100 : currentDiff === "medium" ? 950 : 820;
  beep(freq, 0.04, 0.12);
}

export function playUrgentTick() {
  beep(1400, 0.035, 0.22);
  setTimeout(() => beep(1700, 0.025, 0.14), 40);
}

// playTimeUp removed — drum roll (reveal.mp3) is the time-up signal
export function playTimeUp() { /* no-op */ }

// ── COUNTDOWN 3..2..1 ────────────────────────────────────────
// n=3,2,1 → simple beep each number
// n=0 (GO) → silent; countdown.mp3 fade-in IS the "GO" signal
export function playCountdownBeep(n: number) {
  if (n > 0) {
    const freqs = [523, 659, 784];
    const f = freqs[3 - n] ?? 784;
    beep(f, 0.12, 0.28);
  }
  // n === 0: do nothing — startQuestionLoop() called right after handles the music
}

// ── REVEAL PHASE — DRUM ROLL ──────────────────────────────────
// Plays reveal.mp3 ONCE as a one-shot (not looping, not bg).
// Host page calls playAnswerReveal() after 3800ms to cut it.
export function playRevealMusic() {
  stopMusic(150);   // fade out question loop
  stopOneShot(80);  // clear any leftover one-shot

  const a = getAudio("reveal");
  a.loop = false;   // drum roll plays once — no infinite loop
  a.volume = 0.88;
  oneShotAudio = a;
  a.play().catch(() => {});
}

// ── ANSWER PHASE — CORRECT / WRONG ───────────────────────────
// Stops drum roll cleanly then plays the result sting.
// Call this from host page goToReveal's setTimeout (at 3800ms).
export function playAnswerReveal(isCorrect: boolean) {
  stopOneShot(100);  // cut drum roll with short fade
  stopMusic(80);

  // 80ms gap so the cut lands before the sting — feels intentional
  setTimeout(() => {
    playOneShot(isCorrect ? "correct" : "wrong", 0.92);
  }, 80);
}

// Standalone correct/wrong (backward compat)
export function playCorrect() {
  stopOneShot(100);
  stopMusic(80);
  setTimeout(() => playOneShot("correct", 0.92), 80);
}

export function playWrong() {
  stopOneShot(100);
  stopMusic(80);
  setTimeout(() => playOneShot("wrong", 0.92), 80);
}

// ── LEADERBOARD — RUNNER UPS ──────────────────────────────────
// leaderboard.mp3 loops. Called after answer phase (+5000ms).
export function startLeaderboardMusic(_isTop: boolean) {
  stopOneShot(200);
  playLoop("leaderboard", 0.78, 500);
  currentLoop = "leaderboard";
}

// ── WINNER — GAME OVER ────────────────────────────────────────
// winner.mp3 loops for the champion reveal.
export function playWinnerMusic() {
  stopOneShot(200);
  playLoop("winner", 0.85, 300);
  currentLoop = "winner";
}

// ── RUNNER UP — GAME OVER (losers) ───────────────────────────
// runnerup.mp3 loops for all non-winners at game_over.
export function playRunnerUpMusic() {
  stopOneShot(200);
  playLoop("runnerup", 0.80, 400);
  currentLoop = "runnerup";
}

// ── PAUSE / RESUME ────────────────────────────────────────────
export function playPause() {
  if (bgAudio) bgAudio.volume = 0.2;
  beep(880, 0.06, 0.18);
  setTimeout(() => beep(660, 0.09, 0.18), 80);
  setTimeout(() => beep(440, 0.14, 0.18), 170);
}

export function playResume() {
  if (bgAudio) {
    bgAudio.volume = 0;
    let v = 0;
    const target = currentLoop === "question" ? 0.72 : 0.78;
    const fi = setInterval(() => {
      v += target / 15;
      if (bgAudio) bgAudio.volume = Math.min(target, v);
      if (v >= target) clearInterval(fi);
    }, 30);
  }
  beep(440, 0.06, 0.18);
  setTimeout(() => beep(660, 0.08, 0.18), 80);
  setTimeout(() => beep(880, 0.12, 0.18), 160);
  setTimeout(() => beep(1100, 0.10, 0.15), 240);
}

// ── ALIASES ───────────────────────────────────────────────────
export function playSuspense()    { playRevealMusic(); }
export function playCelebration() { playWinnerMusic(); }
export function playLeaderboard() { startLeaderboardMusic(false); }
