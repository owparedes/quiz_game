"use client";
import { usePlayerGame } from "@/hooks/usePlayerGame";
import { JoinForm } from "@/components/play/JoinForm";
import { Lobby } from "@/components/play/Lobby";
import { Countdown } from "@/components/play/Countdown";
import { LiveQuestion } from "@/components/play/LiveQuestion";
import { Result } from "@/components/play/Result";
import { Leaderboard } from "@/components/play/Leaderboard";
import { GameOver } from "@/components/play/GameOver";
import { Revealing } from "@/components/ui/Revealing";

export default function PlayPage() {
  const player = usePlayerGame();
  const { game } = player;

  if (!player.joined) {
    return (
      <JoinForm
        roomCode={player.roomCode} teamName={player.teamName} error={player.error}
        onRoomCodeChange={player.setRoomCode} onTeamNameChange={player.setTeamName} onJoin={player.join} />
    );
  }

  if (!game || game.phase === "waiting") {
    return <Lobby roomCode={player.roomCode} teamName={player.teamName} teams={game?.teams || []} />;
  }

  if (player.counting) {
    return <Countdown count={player.countdown} countKey={player.countdownKey} difficulty={game.currentQuestion?.difficulty} />;
  }

  switch (game.phase) {
    case "question":
      return <LiveQuestion game={game} teamName={player.teamName} answer={player.answer} paused={player.paused} onAnswer={player.submitAnswer} />;
    case "reveal":
      return <main className="screen center"><Revealing /></main>;
    case "answer":
      return <Result game={game} answer={player.answer} points={player.points} />;
    case "leaderboard":
      return <Leaderboard game={game} teamName={player.teamName} />;
    case "game_over":
      return <GameOver game={game} teamName={player.teamName} />;
    default:
      return null;
  }
}
