"use client";
import { useState, useRef } from "react";
import { GameState, AnswerKey } from "@/lib/types";
import { COUNTDOWN_SECONDS, CONFETTI_COLORS } from "@/lib/config";
import { pusher, broadcast, roomChannel } from "@/lib/pusher";
import { sortByScore } from "@/lib/rank";
import * as sounds from "@/lib/sounds";

function spawnConfetti() {
  for (let i = 0; i < 90; i++) {
    const piece = document.createElement("div");
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const size = 6 + Math.random() * 6;
    piece.className = "confetti-piece";
    piece.style.cssText = `left:${Math.random() * 100}vw;top:-12px;background:${color};border-radius:${Math.random() > 0.5 ? "50%" : "3px"};width:${size}px;height:${size}px;animation-duration:${2.5 + Math.random() * 2.5}s;animation-delay:${Math.random() * 1.2}s;`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 6000);
  }
}

export function usePlayerGame() {
  const [roomCode, setRoomCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [game, setGame] = useState<GameState | null>(null);
  const [answer, setAnswer] = useState<AnswerKey | null>(null);
  const [points, setPoints] = useState(0);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [counting, setCounting] = useState(false);
  const [paused, setPaused] = useState(false);

  const audioReady = useRef(false);
  const previousPhase = useRef("");
  const countdownKey = useRef(0);
  const timeLimitRef = useRef(0);

  const initAudioOnce = () => {
    if (audioReady.current) return;
    sounds.initAudio();
    audioReady.current = true;
  };

  const startCountdown = (state: GameState) => {
    setCounting(true);
    countdownKey.current++;
    setCountdown(COUNTDOWN_SECONDS);
    sounds.setDifficulty(state.currentQuestion?.difficulty || "easy");
    sounds.playCountdownBeep(COUNTDOWN_SECONDS);
    let count = COUNTDOWN_SECONDS;
    const interval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      sounds.playCountdownBeep(count);
      if (count <= 0) {
        clearInterval(interval);
        setCounting(false);
        sounds.startQuestionLoop();
      }
    }, 1000);
  };

  const handleState = (state: GameState) => {
    const previous = previousPhase.current;
    const current = state.phase;
    timeLimitRef.current = state.timeLimit;
    const leader = sortByScore(state.teams, state.scores)[0];

    if (current === "answer" && previous !== "answer") {
      setAnswer(chosen => {
        const correct = chosen !== null && chosen === state.correctAnswer;
        setPoints(correct ? state.roundScores[teamName] || 0 : 0);
        sounds.playAnswerReveal(correct);
        return chosen;
      });
    }
    if (current === "reveal" && previous !== "reveal") {
      sounds.stopMusic();
      sounds.playRevealMusic();
    }
    if (current === "leaderboard" && previous !== "leaderboard") {
      sounds.startLeaderboardMusic();
    }
    if (current === "game_over" && previous !== "game_over") {
      if (leader === teamName) {
        spawnConfetti();
        sounds.playWinnerMusic();
      } else {
        sounds.stopMusic();
        sounds.playRunnerUpMusic();
      }
    }
    if (current === "question" && previous !== "question") {
      setAnswer(null);
      if (previous === "leaderboard" || previous === "game_over" || previous === "") startCountdown(state);
    }

    setPaused(state.timerPaused || false);
    previousPhase.current = current;
    setGame(state);
  };

  const handleTimer = ({ value, paused: isPaused }: { value: number; paused: boolean }) => {
    setPaused(isPaused);
    if (!isPaused) {
      const urgency = 1 - value / timeLimitRef.current;
      if (urgency > 0.55) sounds.updateQuestionUrgency(urgency);
    }
    setGame(previous => previous ? { ...previous, timerValue: value, timerPaused: isPaused } : previous);
  };

  const join = () => {
    initAudioOnce();
    if (!roomCode || !teamName) return;
    setError("");
    const channel = roomChannel(roomCode);
    const room = pusher.subscribe(channel);
    const announce = () => broadcast(channel, "player:join", { teamName });

    room.bind("pusher:subscription_error", () => setError("Cannot connect. Check the room code."));
    room.bind("game:state", handleState);
    room.bind("game:timer", handleTimer);
    room.bind("pusher:subscription_succeeded", () => {
      setJoined(true);
      announce();
    });

    setTimeout(() => {
      setJoined(alreadyJoined => {
        if (!alreadyJoined) announce();
        return true;
      });
    }, 800);
  };

  const submitAnswer = async (chosen: AnswerKey) => {
    if (answer || paused) return;
    initAudioOnce();
    setAnswer(chosen);
    await broadcast(roomChannel(roomCode), "player:answer", { teamName, answer: chosen, timeRemaining: game?.timerValue || 0 });
  };

  return {
    roomCode, setRoomCode, teamName, setTeamName,
    joined, error, game, answer, points, paused,
    countdown, counting, countdownKey: countdownKey.current,
    join, submitAnswer,
  };
}
