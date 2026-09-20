import { GameState } from "@/lib/types";
import { sortByScore } from "@/lib/rank";
import { RankList } from "@/components/ui/RankList";

interface Props {
  game: GameState;
  teamName: string;
}

export function Leaderboard({ game, teamName }: Props) {
  const ranked = sortByScore(game.teams, game.scores);
  const myRank = ranked.indexOf(teamName) + 1;
  const gained = game.roundScores[teamName] || 0;

  return (
    <main className="screen" style={{ padding: "14px 14px 28px" }}>
      <div style={{ maxWidth: 360, margin: "0 auto" }}>
        <p className="anim-up" style={{ fontWeight: 700, fontSize: "1.15rem", textAlign: "center", marginBottom: 14 }}>Leaderboard</p>
        <div className="card card-em anim-scale" style={{ padding: "16px 18px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p className="label muted" style={{ marginBottom: 2 }}>Your rank</p>
            <p style={{ fontWeight: 800, fontSize: "1.7rem", color: "var(--accent)", lineHeight: 1 }}>#{myRank}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="mono" style={{ fontWeight: 700, fontSize: "1.1rem" }}>{game.scores[teamName] || 0}</p>
            <p className="muted" style={{ fontSize: "0.72rem", fontWeight: 500 }}>total pts</p>
            {gained > 0 && <p style={{ fontSize: "0.72rem", color: "var(--success)", fontWeight: 600 }}>+{gained} this round</p>}
          </div>
        </div>
        <RankList teams={ranked} scores={game.scores} roundScores={game.roundScores} me={teamName} stagger />
        <p className="anim-up-3 muted" style={{ textAlign: "center", fontSize: "0.78rem", marginTop: 16 }}>Next question coming up…</p>
      </div>
    </main>
  );
}
