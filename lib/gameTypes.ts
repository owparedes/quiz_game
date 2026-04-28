export type Phase =
  | "waiting"
  | "question"
  | "reveal"
  | "answer"
  | "leaderboard"
  | "game_over";

export type AnswerKey = "A" | "B" | "C" | "D";
export type Difficulty = "easy" | "medium" | "hard";

export interface Question {
  text: string;
  choices: { A: string; B: string; C: string; D: string };
  correctAnswer: AnswerKey;
  difficulty?: Difficulty;
}

export interface GameState {
  phase: Phase;
  currentQuestion: {
    text: string;
    choices: { A: string; B: string; C: string; D: string };
    difficulty?: Difficulty;
  } | null;
  questionIndex: number;
  totalQuestions: number;
  timeLimit: number;
  timerValue: number;
  timerPaused?: boolean;
  scores: { [teamName: string]: number };
  roundScores: { [teamName: string]: number };
  teams: string[];
  correctAnswer: AnswerKey | null;
  answeredTeams: string[];
  difficulty?: Difficulty;
}

export interface PlayerAnswer {
  teamName: string;
  answer: AnswerKey;
  timeRemaining: number;
}

// Points: 1 / 2 / 5
export const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", color: "#4ade80", glow: "rgba(74,222,128,0.3)", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", pts: 1, emoji: "●" },
  medium: { label: "Medium", color: "#fbbf24", glow: "rgba(251,191,36,0.3)", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.25)", pts: 2, emoji: "●" },
  hard: { label: "Hard", color: "#f87171", glow: "rgba(248,113,113,0.3)", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.25)", pts: 3, emoji: "●" },
} as const;