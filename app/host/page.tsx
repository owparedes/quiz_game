"use client";
import { useHostGame } from "@/hooks/useHostGame";
import { Setup } from "@/components/host/Setup";
import { Header } from "@/components/host/Header";
import { Lobby } from "@/components/host/Lobby";
import { LiveQuestion } from "@/components/host/LiveQuestion";
import { AnswerResult } from "@/components/host/AnswerResult";
import { Leaderboard } from "@/components/host/Leaderboard";
import { GameOver } from "@/components/host/GameOver";
import { Revealing } from "@/components/ui/Revealing";

export default function HostPage() {
  const game = useHostGame();
  const question = game.questions[game.questionIndex];

  if (!game.joined) {
    return <Setup creating={game.creating} error={game.error} onCreate={game.create} onResume={game.resume} />;
  }

  if (game.phase === "game_over") {
    return <GameOver teams={game.teams} scores={game.scores} onReset={game.resetGame} />;
  }

  return (
    <main className="screen" style={{ padding: "clamp(12px,3vw,18px)", paddingBottom: 40 }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <Header roomCode={game.roomCode} phase={game.phase} playerCount={game.teams.length} />

        {game.phase === "waiting" && (
          <Lobby
            questions={game.questions} onQuestionsChange={game.setQuestions}
            timeLimit={game.timeLimit} onTimeLimitChange={game.setTimeLimit}
            teams={game.teams} scores={game.scores} onStart={game.startGame} />
        )}

        {game.phase === "question" && question && (
          <LiveQuestion
            question={question} index={game.questionIndex} total={game.questions.length}
            teams={game.teams} answeredTeams={game.answeredTeams}
            timer={game.timer} timeLimit={game.timeLimit} paused={game.paused} countdown={game.countdown}
            onPause={game.togglePause} onSkip={game.skipToReveal} onEnd={game.endGame} />
        )}

        {game.phase === "reveal" && <Revealing card />}

        {game.phase === "answer" && question && (
          <AnswerResult question={question} teams={game.teams} roundScores={game.roundScores} />
        )}

        {game.phase === "leaderboard" && (
          <Leaderboard
            teams={game.teams} scores={game.scores} roundScores={game.roundScores}
            isLast={game.questionIndex + 1 >= game.questions.length} onNext={game.nextQuestion} />
        )}
      </div>
    </main>
  );
}
