import { DIFFICULTY_CONFIG } from "@/lib/config";
import { Difficulty } from "@/lib/types";

export function DifficultyChip({ difficulty = "easy" }: { difficulty?: Difficulty }) {
  const config = DIFFICULTY_CONFIG[difficulty];
  return (
    <span className="chip" style={{ background: config.bg, color: config.color, borderColor: config.border }}>
      {config.label} · {config.points} pt{config.points > 1 ? "s" : ""}
    </span>
  );
}
