import { Phase, Question, Scores } from "./types";

export interface SavedRoom {
  questions: Question[];
  timeLimit: number;
  teams: string[];
  scores: Scores;
  phase: Phase;
  questionIndex: number;
}

const MAX_AGE_MS = 4 * 60 * 60 * 1000;

const storageKey = (roomCode: string) => `qlive2_${roomCode}`;

export function saveRoom(roomCode: string, room: SavedRoom) {
  try {
    localStorage.setItem(storageKey(roomCode), JSON.stringify({ ...room, savedAt: Date.now() }));
  } catch {}
}

export function loadRoom(roomCode: string): SavedRoom | null {
  try {
    const raw = localStorage.getItem(storageKey(roomCode));
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (Date.now() - saved.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(storageKey(roomCode));
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

export function clearRoom(roomCode: string) {
  try {
    localStorage.removeItem(storageKey(roomCode));
  } catch {}
}
