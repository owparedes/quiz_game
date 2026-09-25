"use client";
import { useState, useRef } from "react";
import { GameState, AnswerKey } from "@/lib/types";
import { COUNTDOWN_SECONDS, CONFETTI_COLORS, MAX_TEAM_NAME_LENGTH } from "@/lib/config";
import { pusher, send, roomChannel, ROOM_CODE_PATTERN } from "@/lib/pusher";
import { sortByScore } from "@/lib/rank";
import { savePlayer, loadPlayer, clearPlayer, PlayerIdentity } from "@/lib/storage";
import * as sounds from "@/lib/sounds";

const PHASES = ["waiting", "question", "reveal", "answer", "leaderboard", "game_over"];

function isGameState(value: unknown): value is GameState {
  const state = value as GameState;
  return Boolean(state) && typeof state === "object"
    && PHASES.includes(state.phase)
    && Array.isArray(state.teams)
    && Boolean(state.scores) && typeof state.scores === "object"
    && Boolean(state.roundScores) && typeof state.roundScores === "object"
    && Array.isArray(state.answeredTeams);
}

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
  const identityRef = useRef<PlayerIdentity | null>(null);
  const rejectedRef = useRef<Set<string>>(new Set());
  const joiningRef = useRef(false);

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
    if (!isGameState(state)) return;
    const teamName = identityRef.current?.teamName;
    const previous = previousPhase.current;
    const current = state.phase;
    timeLimitRef.current = state.timeLimit;
    const leader = sortByScore(state.teams, state.scores)[0];

    if (current === "answer" && previous !== "answer") {
      setAnswer(chosen => {
        const correct = chosen !== null && chosen === state.correctAnswer;
        setPoints(correct && teamName ? state.roundScores[teamName] || 0 : 0);
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
    if (typeof value !== "number" || typeof isPaused !== "boolean") return;
    setPaused(isPaused);
    if (!isPaused) {
      const urgency = 1 - value / timeLimitRef.current;
      if (urgency > 0.55) sounds.updateQuestionUrgency(urgency);
    }
    setGame(previous => previous ? { ...previous, timerValue: value, timerPaused: isPaused } : previous);
  };

  const leave = (code: string, message: string) => {
    pusher.unsubscribe(roomChannel(code));
    clearPlayer(code);
    identityRef.current = null;
    joiningRef.current = false;
    setJoined(false);
    setGame(null);
    setError(message);
  };

  const join = () => {
    initAudioOnce();
    if (joiningRef.current) return;
    const code = roomCode.trim().toUpperCase();
    const name = teamName.replace(/\s+/g, " ").trim();
    if (!ROOM_CODE_PATTERN.test(code)) {
      setError("Invalid room code.");
      return;
    }
    if (!name || name.length > MAX_TEAM_NAME_LENGTH) {
      setError(`Name must be 1 to ${MAX_TEAM_NAME_LENGTH} characters.`);
      return;
    }
    joiningRef.current = true;
    setError("");
    const channel = roomChannel(code);
    const room = pusher.subscribe(channel);
    let announced = false;

    const announce = async () => {
      if (announced) return;
      announced = true;
      const stored = loadPlayer(code);
      const previous = stored && stored.teamName === name ? stored : null;
      const result = await send(code, "player:join", { teamName: name, playerId: previous?.playerId, token: previous?.token });
      if (!result) {
        leave(code, "Could not join. Check the room code and name.");
        return;
      }
      const identity: PlayerIdentity = { teamName: result.teamName, playerId: result.playerId, token: result.token };
      if (rejectedRef.current.has(identity.playerId)) {
        leave(code, "That name is already taken or the room is full.");
        return;
      }
      identityRef.current = identity;
      savePlayer(code, identity);
      setRoomCode(code);
      setTeamName(identity.teamName);
      setJoined(true);
    };

    room.bind("pusher:subscription_error", () => leave(code, "Cannot connect. Check the room code."));
    room.bind("game:state", handleState);
    room.bind("game:timer", handleTimer);
    room.bind("game:join_rejected", ({ playerId }: { playerId: string }) => {
      if (typeof playerId !== "string") return;
      if (identityRef.current?.playerId === playerId) leave(code, "That name is already taken or the room is full.");
      else rejectedRef.current.add(playerId);
    });
    room.bind("pusher:subscription_succeeded", announce);
    setTimeout(announce, 800);
  };

  const submitAnswer = async (chosen: AnswerKey) => {
    const identity = identityRef.current;
    if (answer || paused || !identity) return;
    initAudioOnce();
    setAnswer(chosen);
    await send(roomCode, "player:answer", { ...identity, answer: chosen, timeRemaining: game?.timerValue || 0 });
  };

  return {
    roomCode, setRoomCode, teamName, setTeamName,
    joined, error, game, answer, points, paused,
    countdown, counting, countdownKey: countdownKey.current,
    join, submitAnswer,
  };
}
