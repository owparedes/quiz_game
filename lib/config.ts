import { AnswerKey, Difficulty } from "./types";

export const ANSWER_KEYS: AnswerKey[] = ["A", "B", "C", "D"];
export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
export const TIME_OPTIONS = [10, 15, 20, 30, 45];
export const DEFAULT_TIME_LIMIT = 20;

export const COUNTDOWN_SECONDS = 3;
export const REVEAL_DELAY_MS = 3800;
export const ANSWER_DELAY_MS = 5000;

export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string; bg: string; border: string; points: number }> = {
  easy: { label: "Easy", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", points: 1 },
  medium: { label: "Medium", color: "#b45309", bg: "#fffbeb", border: "#fde68a", points: 2 },
  hard: { label: "Hard", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", points: 3 },
};

export const TEAM_COLORS = ["#4f46e5", "#0284c7", "#d97706", "#db2777", "#7c3aed", "#059669", "#dc2626", "#0891b2", "#ca8a04", "#9333ea"];

export const CONFETTI_COLORS = ["#4f46e5", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981", "#ec4899"];

export const MAX_QUESTIONS = 200;
export const MAX_QUESTION_LENGTH = 300;
export const MAX_CHOICE_LENGTH = 120;
export const MAX_TEAM_NAME_LENGTH = 24;
export const MAX_TEAMS = 60;
export const MAX_IMPORT_BYTES = 512 * 1024;
