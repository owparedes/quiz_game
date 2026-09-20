import { Scores } from "@/lib/types";
import { sortByScore } from "@/lib/rank";
import { RankList } from "@/components/ui/RankList";

interface Props {
  teams: string[];
  scores: Scores;
  onReset: () => void;
}

export function GameOver({ teams, scores, onReset }: Props) {
  const ranked = sortByScore(teams, scores);
  return (
    <main className="screen center" style={{ gap: 20 }}>
      <div className="anim-float" style={{ fontSize: "3.5rem", lineHeight: 1 }}>🏆</div>
      <div className="anim-up">
        <p style={{ fontWeight: 800, fontSize: "clamp(1.6rem,6vw,2.2rem)", letterSpacing: "-0.02em" }}>Game Over</p>
        <p style={{ color: "var(--gold)", fontWeight: 700, fontSize: "0.95rem", marginTop: 6 }}>🥇 {ranked[0]} wins!</p>
      </div>
      <div className="card anim-up-1" style={{ width: "100%", maxWidth: 380, padding: "18px 20px", textAlign: "left" }}>
        <RankList teams={ranked} scores={scores} />
      </div>
      <button className="btn btn-primary anim-up-2" style={{ padding: "12px 30px" }} onClick={onReset}>New Game</button>
    </main>
  );
}
