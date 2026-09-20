import { Difficulty } from "@/lib/types";
import { DifficultyChip } from "@/components/ui/DifficultyChip";

interface Props {
  count: number;
  countKey: number;
  difficulty?: Difficulty;
}

export function Countdown({ count, countKey, difficulty }: Props) {
  return (
    <main className="screen center">
      <p className="label muted" style={{ letterSpacing: "0.12em", marginBottom: 14 }}>Get Ready</p>
      <div key={`${countKey}-${count}`} className="anim-count" style={{ fontWeight: 800, fontSize: "clamp(6rem,24vw,10rem)", color: "var(--accent)", lineHeight: 1, letterSpacing: "-0.04em" }}>
        {count > 0 ? count : "Go!"}
      </div>
      <div style={{ marginTop: 16 }}>
        {difficulty && <DifficultyChip difficulty={difficulty} />}
      </div>
    </main>
  );
}
