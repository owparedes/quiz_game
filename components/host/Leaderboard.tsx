import { Scores } from "@/lib/types";
import { sortByScore } from "@/lib/rank";
import { RankList } from "@/components/ui/RankList";

interface Props {
  teams: string[];
  scores: Scores;
  roundScores: Scores;
  isLast: boolean;
  onNext: () => void;
}

export function Leaderboard({ teams, scores, roundScores, isLast, onNext }: Props) {
  return (
    <div className="card anim-scale" style={{ padding: "clamp(18px,4vw,26px)", maxWidth: 460, margin: "0 auto" }}>
      <p style={{ fontWeight: 700, fontSize: "1.1rem", textAlign: "center", marginBottom: 16 }}>Leaderboard</p>
      <div style={{ marginBottom: 18 }}>
        <RankList teams={sortByScore(teams, scores)} scores={scores} roundScores={roundScores} />
      </div>
      <button className="btn btn-primary" style={{ width: "100%", padding: 13, fontSize: "0.92rem" }} onClick={onNext}>
        {isLast ? "End Game →" : "Next Question →"}
      </button>
    </div>
  );
}
