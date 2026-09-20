import { Question } from "@/lib/types";
import { ANSWER_KEYS, DIFFICULTY_CONFIG } from "@/lib/config";
import { DifficultyChip } from "@/components/ui/DifficultyChip";

interface Props {
  question: Question;
  index: number;
  total: number;
  teams: string[];
  answeredTeams: string[];
  timer: number;
  timeLimit: number;
  paused: boolean;
  countdown: number;
  onPause: () => void;
  onSkip: () => void;
  onEnd: () => void;
}

const initials = (name: string) => name.split(" ").map(word => word[0]).join("").toUpperCase().slice(0, 2);

export function LiveQuestion({ question, index, total, teams, answeredTeams, timer, timeLimit, paused, countdown, onPause, onSkip, onEnd }: Props) {
  const config = DIFFICULTY_CONFIG[question.difficulty || "easy"];
  const urgent = timer <= 5 && !paused;
  const timerColor = paused ? "var(--text-2)" : urgent ? "var(--danger)" : config.color;

  if (countdown > 0) {
    return (
      <div className="card anim-scale" style={{ padding: "clamp(28px,6vw,48px)", textAlign: "center", borderColor: config.border }}>
        <p className="label muted" style={{ marginBottom: 12 }}>Get Ready…</p>
        <div className="mono" style={{ fontWeight: 800, fontSize: "clamp(4rem,16vw,7rem)", color: config.color, lineHeight: 1 }}>{countdown}</div>
        <p className="muted" style={{ fontSize: "0.8rem", marginTop: 12 }}>Q{index + 1} of {total} · {config.label}</p>
      </div>
    );
  }

  return (
    <div className="card anim-scale" style={{ padding: "clamp(18px,4vw,26px)", borderColor: config.border }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="badge">{String(index + 1).padStart(2, "0")}/{total}</span>
          <DifficultyChip difficulty={question.difficulty} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="badge badge-neutral">{answeredTeams.length}/{teams.length} answered</span>
          <button className={`btn ${paused ? "btn-primary" : "btn-ghost"} btn-icon`} onClick={onPause} title={paused ? "Resume" : "Pause"}>
            {paused ? "▶" : "⏸"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div className={`mono${urgent ? " timer-warn" : ""}`} style={{ fontWeight: 800, fontSize: "clamp(1.8rem,6vw,2.6rem)", color: timerColor, lineHeight: 1, minWidth: "2.5rem", textAlign: "center" }}>
          {paused ? <span style={{ fontSize: "1.2rem" }}>⏸</span> : timer}
        </div>
        <div style={{ flex: 1 }}>
          <div className="timer-bar">
            <div className="timer-fill" style={{ width: `${(timer / timeLimit) * 100}%`, background: timerColor, transition: paused ? "none" : "width 0.92s linear" }} />
          </div>
          {paused && <p className="muted" style={{ fontSize: "0.72rem", marginTop: 4, fontWeight: 600 }}>Paused. Players are waiting</p>}
        </div>
      </div>

      <p style={{ fontWeight: 700, fontSize: "clamp(1rem,2.5vw,1.25rem)", textAlign: "center", marginBottom: 16, lineHeight: 1.5 }}>{question.text}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,210px),1fr))", gap: 7, marginBottom: 16 }}>
        {ANSWER_KEYS.map(key => (
          <div key={key} className="list-row" style={{ alignItems: "flex-start", gap: 9 }}>
            <span className="mono muted" style={{ fontSize: "0.7rem", fontWeight: 700, marginTop: 1 }}>{key}</span>
            <span style={{ fontSize: "0.84rem", lineHeight: 1.4 }}>{question.choices[key]}</span>
          </div>
        ))}
      </div>

      {teams.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 16 }}>
          {teams.map(team => {
            const answered = answeredTeams.includes(team);
            return (
              <div key={team} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ position: "relative", width: 44, height: 44 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: "0.82rem", transition: "all 0.25s", opacity: answered ? 1 : 0.5,
                    background: answered ? "var(--accent-lo)" : "var(--surface-2)",
                    border: `2px solid ${answered ? "var(--accent)" : "var(--border)"}`,
                    color: answered ? "var(--accent-hi)" : "var(--text-3)",
                  }}>
                    {initials(team)}
                  </div>
                  {answered && (
                    <div style={{ position: "absolute", bottom: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", color: "#ffffff", fontWeight: 800 }}>✓</div>
                  )}
                </div>
                <span className="truncate" style={{ fontSize: "0.64rem", fontWeight: 600, maxWidth: 52, color: answered ? "var(--accent-hi)" : "var(--text-3)" }}>{team}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 7, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={onSkip}>Skip to Reveal</button>
        <button className="btn btn-danger" onClick={onEnd}>End Game</button>
      </div>
    </div>
  );
}
