import { GameState, AnswerKey } from "@/lib/types";
import { DIFFICULTY_CONFIG } from "@/lib/config";

interface Props {
  game: GameState;
  answer: AnswerKey | null;
  points: number;
}

export function Result({ game, answer, points }: Props) {
  const correct = game.correctAnswer;
  const isCorrect = answer !== null && answer === correct;
  const config = DIFFICULTY_CONFIG[game.currentQuestion?.difficulty || "easy"];
  const title = isCorrect ? "Correct!" : answer ? "Wrong" : "No answer";

  return (
    <main className="screen center" style={{ gap: 18 }}>
      <div className="anim-scale" style={{ fontSize: "3rem", lineHeight: 1 }}>{isCorrect ? "✅" : "❌"}</div>
      <div className="anim-up">
        <h2 style={{ fontWeight: 800, fontSize: "1.5rem", color: isCorrect ? "var(--success)" : "var(--danger)" }}>{title}</h2>
        {isCorrect && (
          <p className="mono" style={{ fontWeight: 700, fontSize: "1.4rem", color: "var(--gold)", marginTop: 4 }}>+{points} pt{points !== 1 ? "s" : ""}</p>
        )}
      </div>
      <div className="card anim-up-1" style={{ width: "100%", maxWidth: 320, padding: "18px 20px" }}>
        <p className="label" style={{ marginBottom: 8 }}>Correct Answer</p>
        <div className="mono" style={{ fontWeight: 700, fontSize: "2rem", color: config.color, marginBottom: 4 }}>{correct}</div>
        <p style={{ fontWeight: 600, fontSize: "0.92rem" }}>{correct && game.currentQuestion?.choices[correct]}</p>
      </div>
      {answer && !isCorrect && (
        <p className="anim-up-2 muted" style={{ fontSize: "0.8rem" }}>
          You answered: <span style={{ fontWeight: 700, color: "var(--danger)" }}>{answer}: {game.currentQuestion?.choices[answer]}</span>
        </p>
      )}
    </main>
  );
}
