import { Question, Scores } from "@/lib/types";
import { DIFFICULTIES, DIFFICULTY_CONFIG, TEAM_COLORS } from "@/lib/config";
import { Dots } from "@/components/ui/Dots";
import { QuestionManager } from "./QuestionManager";

interface Props {
  questions: Question[];
  onQuestionsChange: (questions: Question[]) => void;
  timeLimit: number;
  onTimeLimitChange: (seconds: number) => void;
  teams: string[];
  scores: Scores;
  onStart: () => void;
}

export function Lobby({ questions, onQuestionsChange, timeLimit, onTimeLimitChange, teams, scores, onStart }: Props) {
  const startLabel = questions.length === 0 ? "Add questions to start" : teams.length === 0 ? "Waiting for players…" : "▶ Start Game";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 14, alignItems: "start" }}>
      <QuestionManager questions={questions} onChange={onQuestionsChange} timeLimit={timeLimit} onTimeLimitChange={onTimeLimitChange} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="card anim-up-1" style={{ padding: "clamp(16px,4vw,20px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="label" style={{ marginBottom: 0 }}>Players</span>
            <span className="badge">{teams.length} joined</span>
          </div>
          {teams.length === 0 ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <Dots style={{ marginBottom: 8 }} />
              <p className="muted" style={{ fontSize: "0.82rem" }}>Waiting for players…</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {teams.map((team, index) => (
                <div key={team} className="list-row">
                  <span style={{ width: 7, height: 7, minWidth: 7, borderRadius: "50%", background: TEAM_COLORS[index % TEAM_COLORS.length] }} />
                  <span className="truncate" style={{ fontSize: "0.86rem", fontWeight: 600, flex: 1 }}>{team}</span>
                  <span className="mono muted" style={{ fontSize: "0.72rem" }}>{scores[team] || 0}pt</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {questions.length > 0 && (
          <div className="card anim-up-2" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-2)", fontWeight: 600 }}>{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
            <div style={{ display: "flex", gap: 10 }}>
              {DIFFICULTIES.map(level => {
                const count = questions.filter(question => (question.difficulty || "easy") === level).length;
                if (!count) return null;
                const config = DIFFICULTY_CONFIG[level];
                return (
                  <span key={level} style={{ fontSize: "0.72rem", fontWeight: 600, color: config.color }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: config.color, display: "inline-block", marginRight: 4 }} />{count}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <button className="btn btn-primary anim-up-3" style={{ width: "100%", padding: 14, fontSize: "0.92rem" }}
          disabled={questions.length === 0 || teams.length === 0} onClick={onStart}>
          {startLabel}
        </button>
      </div>
    </div>
  );
}
