import { Scores } from "./types";

const MEDALS = ["🥇", "🥈", "🥉"];

export function sortByScore(teams: string[], scores: Scores) {
  return [...teams].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
}

export function medal(index: number) {
  return MEDALS[index] ?? `${index + 1}.`;
}

export function placeLabel(rank: number) {
  if (rank === 1) return "1st Place";
  if (rank === 2) return "2nd Place";
  if (rank === 3) return "3rd Place";
  return `${rank}th Place`;
}
