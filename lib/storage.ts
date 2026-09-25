import { Phase, Question, Scores } from "./types";
import { parseQuestions } from "./questions";

export interface SavedRoom {
  hostToken: string;
  questions: Question[];
  timeLimit: number;
  teams: string[];
  players: Record<string, string>;
  scores: Scores;
  phase: Phase;
  questionIndex: number;
}

export interface PlayerIdentity {
  teamName: string;
  playerId: string;
  token: string;
}

const MAX_AGE_MS = 4 * 60 * 60 * 1000;
const PREFIX = "qlive3_";
const LAST_ROOM_KEY = `${PREFIX}last`;

const roomKey = (roomCode: string) => `${PREFIX}room_${roomCode}`;
const playerKey = (roomCode: string) => `${PREFIX}player_${roomCode}`;

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
  } catch {}
}

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (typeof saved?.savedAt !== "number" || Date.now() - saved.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return saved.value ?? null;
  } catch {
    return null;
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return Boolean(value) && typeof value === "object" && Object.values(value as object).every(item => typeof item === "string");
}

function isScores(value: unknown): value is Scores {
  return Boolean(value) && typeof value === "object" && Object.values(value as object).every(item => typeof item === "number" && Number.isFinite(item));
}

export function saveRoom(roomCode: string, room: SavedRoom) {
  write(roomKey(roomCode), room);
  write(LAST_ROOM_KEY, roomCode);
}

export function loadRoom(roomCode: string): SavedRoom | null {
  const room = read(roomKey(roomCode)) as Partial<SavedRoom> | null;
  if (!room || typeof room.hostToken !== "string") return null;
  return {
    hostToken: room.hostToken,
    questions: (room.questions?.length ? parseQuestions(room.questions) : null) || [],
    timeLimit: typeof room.timeLimit === "number" ? room.timeLimit : 0,
    teams: Array.isArray(room.teams) ? room.teams.filter(team => typeof team === "string") : [],
    players: isStringRecord(room.players) ? room.players : {},
    scores: isScores(room.scores) ? room.scores : {},
    phase: room.phase || "waiting",
    questionIndex: typeof room.questionIndex === "number" ? room.questionIndex : 0,
  };
}

export function lastRoomCode(): string | null {
  const code = read(LAST_ROOM_KEY);
  return typeof code === "string" && loadRoom(code) ? code : null;
}

export function clearRoom(roomCode: string) {
  remove(roomKey(roomCode));
  remove(LAST_ROOM_KEY);
}

export function savePlayer(roomCode: string, identity: PlayerIdentity) {
  write(playerKey(roomCode), identity);
}

export function loadPlayer(roomCode: string): PlayerIdentity | null {
  const identity = read(playerKey(roomCode)) as Partial<PlayerIdentity> | null;
  if (!identity || typeof identity.teamName !== "string" || typeof identity.playerId !== "string" || typeof identity.token !== "string") return null;
  return identity as PlayerIdentity;
}

export function clearPlayer(roomCode: string) {
  remove(playerKey(roomCode));
}
