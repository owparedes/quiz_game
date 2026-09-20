export type Phase = "waiting" | "question" | "reveal" | "answer" | "leaderboard" | "game_over";
export type AnswerKey = "A" | "B" | "C" | "D";
export type Difficulty = "easy" | "medium" | "hard";
export type Choices = Record<AnswerKey, string>;
export type Scores = Record<string, number>;

export interface Question {
  text: string;
  choices: Choices;
  correctAnswer: AnswerKey;
  difficulty?: Difficulty;
}

export interface LiveQuestion {
  text: string;
  choices: Choices;
  difficulty?: Difficulty;
}

export interface GameState {
  phase: Phase;
  currentQuestion: LiveQuestion | null;
  questionIndex: number;
  totalQuestions: number;
  timeLimit: number;
  timerValue: number;
  timerPaused?: boolean;
  scores: Scores;
  roundScores: Scores;
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
