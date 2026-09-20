import { Question, Scores } from "@/lib/types";
import { DIFFICULTY_CONFIG } from "@/lib/config";

interface Props {
  question: Question;
  teams: string[];
  roundScores: Scores;
}

export function AnswerResult({ question, teams, roundScores }: Props) {
  const config = DIFFICULTY_CONFIG[question.difficulty || "easy"];
  return (
    <div className="card anim-scale" style={{ padding: "clamp(24px,5vw,40px) clamp(18px,5vw,28px)", textAlign: "center", borderColor: config.border }}>
      <p className="label" style={{ marginBottom: 8 }}>Correct Answer</p>
      <div className="mono anim-scale" style={{ fontWeight: 800, fontSize: "clamp(2.5rem,8vw,3.5rem)", color: config.color, marginBottom: 4 }}>{question.correctAnswer}</div>
      <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 22 }}>{question.choices[question.correctAnswer]}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 7 }}>
        {teams.map(team => {
          const gained = roundScores[team] || 0;
          return (
            <div key={team} className="rank-row" style={{ padding: "10px 13px" }}>
              <span className="truncate" style={{ fontSize: "0.84rem", fontWeight: 600, flex: 1 }}>{team}</span>
              <span className="mono" style={{ fontWeight: 700, fontSize: "0.84rem", flexShrink: 0, color: gained > 0 ? config.color : "var(--text-3)" }}>
                {gained > 0 ? `+${gained}` : "0"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
