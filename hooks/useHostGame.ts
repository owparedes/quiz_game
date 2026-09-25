"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { GameState, Question, PlayerAnswer, Phase, Scores, AnswerKey } from "@/lib/types";
import { ANSWER_KEYS, DIFFICULTY_CONFIG, DEFAULT_TIME_LIMIT, COUNTDOWN_SECONDS, REVEAL_DELAY_MS, ANSWER_DELAY_MS, MAX_TEAMS, MAX_TEAM_NAME_LENGTH, TIME_OPTIONS } from "@/lib/config";
import { pusher, send, roomChannel, createRoom } from "@/lib/pusher";
import { saveRoom, loadRoom, clearRoom } from "@/lib/storage";

const PLAYER_ID_PATTERN = /^[a-f0-9]{32}$/;

function isValidTeamName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_TEAM_NAME_LENGTH && !(value in Object.prototype);
}
import * as sounds from "@/lib/sounds";

export function useHostGame() {
  const [roomCode, setRoomCode] = useState("");
  const [hostToken, setHostToken] = useState("");
  const [joined, setJoined] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [players, setPlayers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeLimit, setTimeLimit] = useState(DEFAULT_TIME_LIMIT);
  const [teams, setTeams] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [scores, setScores] = useState<Scores>({});
  const [roundScores, setRoundScores] = useState<Scores>({});
  const [timer, setTimer] = useState(0);
  const [paused, setPaused] = useState(false);
  const [answers, setAnswers] = useState<PlayerAnswer[]>([]);
  const [countdown, setCountdown] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedRef = useRef(false);
  const remainingRef = useRef(0);
  const answersRef = useRef<PlayerAnswer[]>([]);
  const scoresRef = useRef<Scores>({});
  const questionsRef = useRef<Question[]>([]);
  const timeLimitRef = useRef(DEFAULT_TIME_LIMIT);
  const teamsRef = useRef<string[]>([]);
  const playersRef = useRef<Record<string, string>>({});
  const tokenRef = useRef("");
  const acceptingRef = useRef(false);

  const channel = roomChannel(roomCode);
  const answeredTeams = answers.map(answer => answer.teamName);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { scoresRef.current = scores; }, [scores]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { timeLimitRef.current = timeLimit; }, [timeLimit]);
  useEffect(() => { teamsRef.current = teams; }, [teams]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { tokenRef.current = hostToken; }, [hostToken]);

  useEffect(() => {
    if (!joined || !roomCode || !hostToken) return;
    saveRoom(roomCode, { hostToken, questions, timeLimit, teams, players, scores, phase, questionIndex });
  }, [joined, roomCode, hostToken, questions, timeLimit, teams, players, scores, phase, questionIndex]);

  const broadcast = useCallback((event: string, data: object) => send(roomCode, event, data as Record<string, unknown>, tokenRef.current), [roomCode]);

  const buildState = useCallback((overrides: Partial<GameState>): GameState => ({
    phase: "waiting",
    currentQuestion: null,
    questionIndex: 0,
    totalQuestions: questionsRef.current.length,
    timeLimit: timeLimitRef.current,
    timerValue: 0,
    scores: scoresRef.current,
    roundScores: {},
    teams: teamsRef.current,
    correctAnswer: null,
    answeredTeams: [],
    ...overrides,
  }), []);

  const questionState = useCallback((question: Question, index: number, overrides: Partial<GameState>) => buildState({
    currentQuestion: { text: question.text, choices: question.choices, difficulty: question.difficulty },
    questionIndex: index,
    difficulty: question.difficulty,
    ...overrides,
  }), [buildState]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((seconds: number, onEnd: () => void) => {
    stopTimer();
    setPaused(false);
    pausedRef.current = false;
    setTimer(seconds);
    remainingRef.current = seconds;
    acceptingRef.current = true;
    timerRef.current = setInterval(async () => {
      if (pausedRef.current) return;
      remainingRef.current -= 1;
      const remaining = remainingRef.current;
      setTimer(remaining);
      if (remaining <= 5 && remaining > 0) sounds.playUrgentTick();
      else sounds.playTick();
      const urgency = 1 - remaining / seconds;
      if (urgency > 0.6) sounds.updateQuestionUrgency(urgency);
      if (remaining <= 0) {
        acceptingRef.current = false;
        stopTimer();
        onEnd();
      }
      await broadcast("game:timer", { value: remaining, paused: false });
    }, 1000);
  }, [broadcast, stopTimer]);

  const reveal = useCallback(async (index: number) => {
    acceptingRef.current = false;
    stopTimer();
    const question = questionsRef.current[index];
    if (!question) return;
    const currentAnswers = answersRef.current;
    const currentScores = scoresRef.current;
    const answered = currentAnswers.map(answer => answer.teamName);

    setPhase("reveal");
    sounds.playRevealMusic();
    await broadcast("game:state", questionState(question, index, { phase: "reveal", scores: currentScores, answeredTeams: answered }));

    setTimeout(async () => {
      const correct = question.correctAnswer;
      const points = DIFFICULTY_CONFIG[question.difficulty || "easy"].points;
      const winner = currentAnswers.find(answer => answer.answer === correct)?.teamName;
      const round: Scores = {};
      const total = { ...currentScores };
      teamsRef.current.forEach(team => {
        round[team] = team === winner ? points : 0;
        if (team === winner) total[team] = (total[team] || 0) + points;
      });

      setRoundScores(round);
      setScores(total);
      setPhase("answer");
      sounds.playAnswerReveal(Boolean(winner));

      const answerState = questionState(question, index, { phase: "answer", scores: total, roundScores: round, correctAnswer: correct, answeredTeams: answered });
      await broadcast("game:state", answerState);

      setTimeout(async () => {
        sounds.startLeaderboardMusic();
        setPhase("leaderboard");
        await broadcast("game:state", { ...answerState, phase: "leaderboard" });
      }, ANSWER_DELAY_MS);
    }, REVEAL_DELAY_MS);
  }, [broadcast, questionState, stopTimer]);

  const startQuestion = useCallback(async (index: number, currentScores: Scores) => {
    acceptingRef.current = false;
    setPhase("question");
    answersRef.current = [];
    setAnswers([]);
    pausedRef.current = false;
    setPaused(false);
    const question = questionsRef.current[index];
    sounds.setDifficulty(question.difficulty || "easy");
    await broadcast("game:state", questionState(question, index, { phase: "question", timerValue: timeLimitRef.current, scores: currentScores }));

    setCountdown(COUNTDOWN_SECONDS);
    let count = COUNTDOWN_SECONDS;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        return;
      }
      clearInterval(interval);
      setCountdown(0);
      sounds.startQuestionLoop();
      startTimer(timeLimitRef.current, () => reveal(index));
    }, 1000);
  }, [broadcast, questionState, startTimer, reveal]);

  const endGame = useCallback(async (index: number, celebrate: boolean) => {
    acceptingRef.current = false;
    stopTimer();
    if (celebrate) sounds.playWinnerMusic();
    else sounds.stopMusic();
    setPhase("game_over");
    await broadcast("game:state", buildState({ phase: "game_over", questionIndex: index, scores, roundScores, answeredTeams }));
  }, [broadcast, buildState, stopTimer, scores, roundScores, answeredTeams]);

  const create = async () => {
    if (creating) return;
    setCreating(true);
    setError("");
    const room = await createRoom();
    setCreating(false);
    if (!room) {
      setError("Could not create a room. Please try again.");
      return;
    }
    tokenRef.current = room.hostToken;
    setHostToken(room.hostToken);
    setRoomCode(room.roomCode);
    setJoined(true);
  };

  const resume = (code: string) => {
    const saved = loadRoom(code);
    if (!saved) {
      setError("That room has expired.");
      return;
    }
    tokenRef.current = saved.hostToken;
    setHostToken(saved.hostToken);
    setRoomCode(code);
    setQuestions(saved.questions);
    setTimeLimit(TIME_OPTIONS.includes(saved.timeLimit) ? saved.timeLimit : DEFAULT_TIME_LIMIT);
    setTeams(saved.teams);
    setPlayers(saved.players);
    setScores(saved.scores);
    setJoined(true);
  };

  const startGame = () => {
    const fresh = Object.fromEntries(teams.map(team => [team, 0]));
    setScores(fresh);
    setRoundScores({});
    setQuestionIndex(0);
    startQuestion(0, fresh);
  };

  const nextQuestion = async () => {
    const index = questionIndex + 1;
    if (index >= questions.length) {
      await endGame(index, true);
      return;
    }
    setQuestionIndex(index);
    await startQuestion(index, scores);
  };

  const skipToReveal = () => {
    stopTimer();
    setPaused(false);
    pausedRef.current = false;
    sounds.stopMusic();
    reveal(questionIndex);
  };

  const togglePause = async () => {
    if (!timerRef.current) return;
    const nextPaused = !pausedRef.current;
    pausedRef.current = nextPaused;
    setPaused(nextPaused);
    if (nextPaused) {
      sounds.playPause();
      sounds.stopMusic();
    } else {
      sounds.playResume();
      sounds.startQuestionLoop();
    }
    await broadcast("game:timer", { value: remainingRef.current, paused: nextPaused });
  };

  const resetGame = () => {
    clearRoom(roomCode);
    window.location.href = "/";
  };

  useEffect(() => {
    if (!joined || !roomCode) return;
    sounds.initAudio();
    const room = pusher.subscribe(channel);

    const sendLobby = () => broadcast("game:state", buildState({ scores: scoresRef.current, teams: teamsRef.current }));

    room.bind("player:join", ({ teamName, playerId }: { teamName: unknown; playerId: unknown }) => {
      if (!isValidTeamName(teamName) || typeof playerId !== "string" || !PLAYER_ID_PATTERN.test(playerId)) return;
      const owner = playersRef.current[teamName];
      if (owner && owner !== playerId) {
        broadcast("game:join_rejected", { playerId });
        return;
      }
      if (!owner) {
        if (teamsRef.current.length >= MAX_TEAMS) {
          broadcast("game:join_rejected", { playerId });
          return;
        }
        playersRef.current = { ...playersRef.current, [teamName]: playerId };
        setPlayers(playersRef.current);
      }
      if (!teamsRef.current.includes(teamName)) {
        teamsRef.current = [...teamsRef.current, teamName];
        setTeams(teamsRef.current);
      }
      if (scoresRef.current[teamName] === undefined) {
        scoresRef.current = { ...scoresRef.current, [teamName]: 0 };
        setScores(scoresRef.current);
      }
      sendLobby();
    });

    room.bind("player:answer", (answer: { teamName: unknown; playerId: unknown; answer: unknown; timeRemaining: unknown }) => {
      if (!acceptingRef.current || pausedRef.current) return;
      if (!isValidTeamName(answer.teamName) || playersRef.current[answer.teamName] !== answer.playerId) return;
      if (typeof answer.answer !== "string" || !ANSWER_KEYS.includes(answer.answer as AnswerKey)) return;
      const entry: PlayerAnswer = {
        teamName: answer.teamName,
        answer: answer.answer as AnswerKey,
        timeRemaining: typeof answer.timeRemaining === "number" ? answer.timeRemaining : 0,
      };
      if (answersRef.current.some(item => item.teamName === entry.teamName)) return;
      answersRef.current = [...answersRef.current, entry];
      setAnswers(answersRef.current);
    });

    room.bind("player:request_state", sendLobby);

    return () => { pusher.unsubscribe(channel); };
  }, [joined, roomCode, channel, broadcast, buildState]);

  return {
    roomCode, joined, creating, error, create, resume,
    questions, setQuestions, timeLimit, setTimeLimit,
    teams, phase, questionIndex, scores, roundScores,
    timer, paused, answeredTeams, countdown,
    startGame, nextQuestion, skipToReveal, togglePause, resetGame,
    endGame: () => endGame(questionIndex, false),
  };
}
