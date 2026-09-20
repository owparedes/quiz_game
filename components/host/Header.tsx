import { Phase } from "@/lib/types";

const PHASE_LABELS: Record<Phase, string> = {
  waiting: "Setup",
  question: "Live",
  reveal: "Reveal",
  answer: "Answer",
  leaderboard: "Scores",
  game_over: "Done",
};

interface Props {
  roomCode: string;
  phase: Phase;
  playerCount: number;
}

export function Header({ roomCode, phase, playerCount }: Props) {
  return (
    <div className="anim-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-1)" }}>QuizLive</span>
        <span className="mono" style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--accent-hi)", background: "var(--accent-lo)", border: "1px solid var(--border-em)", borderRadius: 8, padding: "3px 9px", letterSpacing: "0.1em" }}>{roomCode}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="badge">{PHASE_LABELS[phase]}</span>
        {phase === "question" && <span className="badge badge-neutral">{playerCount} players</span>}
      </div>
    </div>
  );
}
