import { GameState } from "@/lib/types";
import { sortByScore, medal, placeLabel } from "@/lib/rank";
import { RankList } from "@/components/ui/RankList";

interface Props {
  game: GameState;
  teamName: string;
}

export function GameOver({ game, teamName }: Props) {
  const ranked = sortByScore(game.teams, game.scores);
  const myRank = ranked.indexOf(teamName) + 1;
  const isWinner = myRank === 1;

  return (
    <main className="screen center" style={{ gap: 18 }}>
      <div className="anim-float" style={{ fontSize: "3.5rem", lineHeight: 1 }}>{myRank <= 3 ? medal(myRank - 1) : "🎯"}</div>
      <div className="anim-up">
        <h1 style={{ fontWeight: 800, fontSize: "clamp(1.5rem,6vw,2rem)", color: isWinner ? "var(--success)" : "var(--text-1)", letterSpacing: "-0.02em" }}>
          {isWinner ? "You Win! 🎉" : "Game Over"}
        </h1>
        <p className="mono" style={{ fontWeight: 700, fontSize: "1.3rem", color: isWinner ? "var(--gold)" : "var(--text-2)", marginTop: 6 }}>{placeLabel(myRank)}</p>
        {!isWinner && (
          <p className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
            🏆 <span style={{ color: "var(--gold)", fontWeight: 700 }}>{ranked[0]}</span> wins!
          </p>
        )}
      </div>
      <div className="card anim-up-1" style={{ width: "100%", maxWidth: 320, padding: "18px 20px", textAlign: "left" }}>
        <p className="label" style={{ marginBottom: 10 }}>Final Standings</p>
        <RankList teams={ranked} scores={game.scores} me={teamName} stagger />
      </div>
      <button className="btn btn-primary anim-up-2" style={{ padding: "12px 28px" }} onClick={() => { window.location.href = "/"; }}>Back to Home</button>
    </main>
  );
}
