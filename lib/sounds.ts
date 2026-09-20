import { Difficulty } from "./types";

const FILES = {
  question: "/sounds/countdown.mp3",
  reveal: "/sounds/reveal.mp3",
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  leaderboard: "/sounds/leaderboard.mp3",
  winner: "/sounds/winner.mp3",
  runnerup: "/sounds/runnerup.mp3",
};

type SoundName = keyof typeof FILES;

const QUESTION_VOLUME = 0.72;
const LEADERBOARD_VOLUME = 0.78;

let context: AudioContext | null = null;
let gain: GainNode | null = null;
let music: HTMLAudioElement | null = null;
let musicName: SoundName | null = null;
let sting: HTMLAudioElement | null = null;
let difficulty: Difficulty = "easy";
const pool: Partial<Record<SoundName, HTMLAudioElement[]>> = {};

function preload(name: SoundName, copies: number) {
  pool[name] = [];
  for (let i = 0; i < copies; i++) {
    const audio = new Audio(FILES[name]);
    audio.preload = "auto";
    audio.load();
    pool[name]!.push(audio);
  }
}

function take(name: SoundName): HTMLAudioElement {
  const copies = pool[name];
  if (!copies || copies.length === 0) return new Audio(FILES[name]);
  const free = copies.find(audio => audio.paused || audio.ended);
  if (free) {
    free.currentTime = 0;
    return free;
  }
  const extra = new Audio(copies[0].src);
  extra.preload = "auto";
  copies.push(extra);
  return extra;
}

function getContext(): AudioContext {
  if (!context) {
    context = new (window.AudioContext || (window as any).webkitAudioContext)();
    gain = context.createGain();
    gain.gain.value = 0.5;
    gain.connect(context.destination);
  }
  return context;
}

function beep(frequency: number, duration: number, volume = 0.2) {
  const audio = getContext();
  const oscillator = audio.createOscillator();
  const envelope = audio.createGain();
  oscillator.connect(envelope);
  envelope.connect(gain!);
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  const now = audio.currentTime;
  envelope.gain.setValueAtTime(volume, now);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.01);
}

function fadeOut(audio: HTMLAudioElement, durationMs = 250) {
  const startVolume = audio.volume;
  if (startVolume <= 0) {
    audio.pause();
    audio.currentTime = 0;
    return;
  }
  const steps = 12;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    audio.volume = Math.max(0, startVolume - (startVolume / steps) * step);
    if (step >= steps) {
      clearInterval(interval);
      audio.pause();
      audio.currentTime = 0;
    }
  }, durationMs / steps);
}

function fadeIn(audio: HTMLAudioElement, volume: number, durationMs: number) {
  const steps = 20;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    if (music === audio) audio.volume = Math.min(volume, (step / steps) * volume);
    if (step >= steps) clearInterval(interval);
  }, durationMs / steps);
}

export function stopMusic(fadeMs = 250) {
  if (!music) return;
  const audio = music;
  music = null;
  musicName = null;
  fadeOut(audio, fadeMs);
}

function stopSting(fadeMs = 120) {
  if (!sting) return;
  const audio = sting;
  sting = null;
  fadeOut(audio, fadeMs);
}

function playLoop(name: SoundName, volume: number, fadeMs: number) {
  stopMusic(200);
  const audio = take(name);
  audio.loop = true;
  audio.volume = 0;
  music = audio;
  musicName = name;
  audio.play().catch(() => {});
  fadeIn(audio, volume, fadeMs);
}

function playOnce(name: SoundName, volume: number) {
  const audio = take(name);
  audio.loop = false;
  audio.volume = volume;
  sting = audio;
  audio.play().catch(() => {});
}

export function initAudio() {
  getContext();
  (Object.keys(FILES) as SoundName[]).forEach(name => {
    preload(name, name === "correct" || name === "wrong" ? 3 : 2);
  });
}

export function setDifficulty(value: Difficulty) {
  difficulty = value;
}

export function startQuestionLoop() {
  if (musicName === "question") return;
  playLoop("question", QUESTION_VOLUME, 600);
}

export function updateQuestionUrgency(urgency: number) {
  if (music && musicName === "question") music.playbackRate = 1 + (urgency - 0.6) * 0.6;
}

export function playTick() {
  const frequency = difficulty === "hard" ? 1100 : difficulty === "medium" ? 950 : 820;
  beep(frequency, 0.04, 0.12);
}

export function playUrgentTick() {
  beep(1400, 0.035, 0.22);
  setTimeout(() => beep(1700, 0.025, 0.14), 40);
}

export function playCountdownBeep(count: number) {
  if (count <= 0) return;
  const notes = [523, 659, 784];
  beep(notes[3 - count] ?? 784, 0.12, 0.28);
}

export function playRevealMusic() {
  stopMusic(150);
  stopSting(80);
  playOnce("reveal", 0.88);
}

export function playAnswerReveal(correct: boolean) {
  stopSting(100);
  stopMusic(80);
  setTimeout(() => playOnce(correct ? "correct" : "wrong", 0.92), 80);
}

export function startLeaderboardMusic() {
  stopSting(200);
  playLoop("leaderboard", LEADERBOARD_VOLUME, 500);
}

export function playWinnerMusic() {
  stopSting(200);
  playLoop("winner", 0.85, 300);
}

export function playRunnerUpMusic() {
  stopSting(200);
  playLoop("runnerup", 0.8, 400);
}

export function playPause() {
  if (music) music.volume = 0.2;
  beep(880, 0.06, 0.18);
  setTimeout(() => beep(660, 0.09, 0.18), 80);
  setTimeout(() => beep(440, 0.14, 0.18), 170);
}

export function playResume() {
  if (music) {
    music.volume = 0;
    fadeIn(music, musicName === "question" ? QUESTION_VOLUME : LEADERBOARD_VOLUME, 450);
  }
  beep(440, 0.06, 0.18);
  setTimeout(() => beep(660, 0.08, 0.18), 80);
  setTimeout(() => beep(880, 0.12, 0.18), 160);
  setTimeout(() => beep(1100, 0.1, 0.15), 240);
}
