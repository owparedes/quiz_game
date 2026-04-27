export type Phase =
  | "waiting"
  | "question"
  | "reveal"
  | "answer"
  | "leaderboard"
  | "game_over";

export type AnswerKey = "A" | "B" | "C" | "D";

export interface Question {
  text: string;
  choices: { A: string; B: string; C: string; D: string };
  correctAnswer: AnswerKey;
}

export interface GameState {
  phase: Phase;
  currentQuestion: {
    text: string;
    choices: { A: string; B: string; C: string; D: string };
  } | null;
  questionIndex: number;
  totalQuestions: number;
  timeLimit: number;
  timerValue: number;
  scores: { [teamName: string]: number };
  roundScores: { [teamName: string]: number };
  teams: string[];
  correctAnswer: AnswerKey | null;
  answeredTeams: string[];
}

export interface PlayerAnswer {
  teamName: string;
  answer: AnswerKey;
  timeRemaining: number;
}
