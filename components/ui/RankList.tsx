import { medal } from "@/lib/rank";
import { Scores } from "@/lib/types";

interface Props {
  teams: string[];
  scores: Scores;
  roundScores?: Scores;
  me?: string;
  stagger?: boolean;
}

export function RankList({ teams, scores, roundScores, me, stagger }: Props) {
  return (
    <div className={stagger ? "stagger" : undefined} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {teams.map((team, index) => {
        const isMe = team === me;
        const gained = roundScores?.[team] || 0;
        return (
          <div key={team} className={`rank-row${isMe ? " rank-row-me" : ""}${index === 0 ? " rank-1" : ""}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ fontSize: index < 3 ? "1rem" : "0.8rem", minWidth: "1.4rem", textAlign: "center", flexShrink: 0, color: "var(--text-3)" }}>{medal(index)}</span>
              <span className="truncate" style={{ fontWeight: 600, fontSize: "0.88rem", color: isMe ? "var(--accent-hi)" : "var(--text-1)" }}>{team}</span>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div className="mono" style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-1)" }}>{scores[team] || 0}</div>
              {gained > 0 && <div style={{ fontSize: "0.68rem", color: "var(--success)", fontWeight: 600 }}>+{gained}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
