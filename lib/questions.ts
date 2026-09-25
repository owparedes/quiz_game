import { ANSWER_KEYS, DIFFICULTIES, MAX_CHOICE_LENGTH, MAX_QUESTION_LENGTH, MAX_QUESTIONS } from "./config";
import { AnswerKey, Difficulty, Question } from "./types";

export const EMPTY_QUESTION: Question = {
  text: "",
  choices: { A: "", B: "", C: "", D: "" },
  correctAnswer: "A",
  difficulty: "easy",
};

export function isComplete(question: Question) {
  return Boolean(question.text.trim())
    && question.text.length <= MAX_QUESTION_LENGTH
    && ANSWER_KEYS.every(key => Boolean(question.choices[key].trim()) && question.choices[key].length <= MAX_CHOICE_LENGTH);
}

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= max ? text : null;
}

export function parseQuestions(raw: unknown): Question[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_QUESTIONS) return null;
  const questions: Question[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const text = cleanText(item.text, MAX_QUESTION_LENGTH);
    if (!text || !item.choices || typeof item.choices !== "object") return null;
    const choices = {} as Question["choices"];
    for (const key of ANSWER_KEYS) {
      const choice = cleanText(item.choices[key], MAX_CHOICE_LENGTH);
      if (!choice) return null;
      choices[key] = choice;
    }
    if (!ANSWER_KEYS.includes(item.correctAnswer)) return null;
    questions.push({
      text,
      choices,
      correctAnswer: item.correctAnswer as AnswerKey,
      difficulty: (DIFFICULTIES.includes(item.difficulty) ? item.difficulty : "easy") as Difficulty,
    });
  }
  return questions;
}
