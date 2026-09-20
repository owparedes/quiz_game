import { GameState, AnswerKey } from "@/lib/types";
import { ANSWER_KEYS, DIFFICULTY_CONFIG } from "@/lib/config";
import { DifficultyChip } from "@/components/ui/DifficultyChip";

interface Props {
  game: GameState;
  teamName: string;
  answer: AnswerKey | null;
  paused: boolean;
  onAnswer: (key: AnswerKey) => void;
}

const KEY_CLASS: Record<AnswerKey, string> = { A: "ans-a", B: "ans-b", C: "ans-c", D: "ans-d" };

export function LiveQuestion({ game, teamName, answer, paused, onAnswer }: Props) {
  const question = game.currentQuestion;
  const config = DIFFICULTY_CONFIG[question?.difficulty || "easy"];
  const percent = Math.max(0, (game.timerValue / game.timeLimit) * 100);
  const urgent = game.timerValue <= 5 && !paused;
  const timerColor = paused ? "var(--text-2)" : urgent ? "var(--danger)" : config.color;
  const timeUp = game.timerValue === 0 && !paused;

  return (
    <main className="screen" style={{ display: "flex", flexDirection: "column", padding: "14px 14px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="badge">{String(game.questionIndex + 1).padStart(2, "0")}/{game.totalQuestions}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {paused && <span className="chip" style={{ background: "var(--warn-lo)", color: "var(--warn)", borderColor: "var(--warn-border)" }}>Paused</span>}
          <span className={`mono${urgent ? " timer-warn" : ""}`} style={{ fontWeight: 700, fontSize: "1.5rem", color: timerColor, lineHeight: 1 }}>
            {paused ? "⏸" : game.timerValue}
          </span>
        </div>
        <span className="badge badge-neutral truncate" style={{ maxWidth: 100 }}>{teamName}</span>
      </div>

      <div className="timer-bar" style={{ marginBottom: 12 }}>
        <div className="timer-fill" style={{ width: `${percent}%`, background: timerColor, transition: paused ? "none" : "width 0.92s linear" }} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <DifficultyChip difficulty={question?.difficulty} />
      </div>

      <div className="card" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 18px", marginBottom: 14, minHeight: 90, borderColor: urgent ? "var(--danger-border)" : undefined }}>
        <p style={{ fontWeight: 700, fontSize: "clamp(1rem,3.5vw,1.2rem)", textAlign: "center", lineHeight: 1.5 }}>{question?.text}</p>
      </div>

      {answer ? (
        <div className="card card-em anim-scale" style={{ padding: "24px 18px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
            <span className="mono" style={{ width: 28, height: 28, borderRadius: 8, background: config.bg, border: `1px solid ${config.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8rem", color: config.color }}>{answer}</span>
            <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>Locked in!</p>
          </div>
          <p className="muted" style={{ fontSize: "0.8rem" }}>Waiting for results…</p>
        </div>
      ) : timeUp ? (
        <div className="card" style={{ padding: "22px 18px", textAlign: "center" }}>
          <p style={{ fontWeight: 700, color: "var(--danger)", fontSize: "0.95rem" }}>Time&apos;s up!</p>
        </div>
      ) : paused ? (
        <div className="card" style={{ padding: "22px 18px", textAlign: "center", borderColor: "var(--warn-border)" }}>
          <div style={{ fontSize: "1.6rem", marginBottom: 8 }}>⏸</div>
          <p style={{ fontWeight: 700, color: "var(--warn)", fontSize: "0.92rem" }}>Game paused</p>
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: 3 }}>Host will resume shortly</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {ANSWER_KEYS.map(key => (
            <button key={key} className={`ans-btn ${KEY_CLASS[key]}`} onClick={() => onAnswer(key)}>
              <span className="ans-key">{key}</span>
              <span>{question?.choices[key]}</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
