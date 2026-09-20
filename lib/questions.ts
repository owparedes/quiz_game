import { ANSWER_KEYS, DIFFICULTIES } from "./config";
import { AnswerKey, Difficulty, Question } from "./types";

export const EMPTY_QUESTION: Question = {
  text: "",
  choices: { A: "", B: "", C: "", D: "" },
  correctAnswer: "A",
  difficulty: "easy",
};

export function isComplete(question: Question) {
  return Boolean(question.text) && ANSWER_KEYS.every(key => Boolean(question.choices[key]));
}

export function parseQuestions(raw: unknown): Question[] | null {
  if (!Array.isArray(raw)) return null;
  const questions: Question[] = [];
  for (const item of raw) {
    if (typeof item.text !== "string" || !item.text.trim()) return null;
    if (!item.choices || typeof item.choices !== "object") return null;
    for (const key of ANSWER_KEYS) {
      if (typeof item.choices[key] !== "string" || !item.choices[key].trim()) return null;
    }
    if (!ANSWER_KEYS.includes(item.correctAnswer)) return null;
    questions.push({
      text: item.text.trim(),
      choices: { A: item.choices.A.trim(), B: item.choices.B.trim(), C: item.choices.C.trim(), D: item.choices.D.trim() },
      correctAnswer: item.correctAnswer as AnswerKey,
      difficulty: (DIFFICULTIES.includes(item.difficulty) ? item.difficulty : "easy") as Difficulty,
    });
  }
  return questions.length ? questions : null;
}
