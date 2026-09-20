"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { GameState, Question, PlayerAnswer, Phase, Scores } from "@/lib/types";
import { DIFFICULTY_CONFIG, DEFAULT_TIME_LIMIT, COUNTDOWN_SECONDS, REVEAL_DELAY_MS, ANSWER_DELAY_MS } from "@/lib/config";
import { pusher, broadcast, roomChannel } from "@/lib/pusher";
import { saveRoom, loadRoom, clearRoom } from "@/lib/storage";
import * as sounds from "@/lib/sounds";

export function useHostGame() {
  const [roomCode, setRoomCode] = useState("");
  const [joined, setJoined] = useState(false);
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

  const channel = roomChannel(roomCode);
  const answeredTeams = answers.map(answer => answer.teamName);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { scoresRef.current = scores; }, [scores]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { timeLimitRef.current = timeLimit; }, [timeLimit]);
  useEffect(() => { teamsRef.current = teams; }, [teams]);

  useEffect(() => {
    if (!joined || !roomCode) return;
    saveRoom(roomCode, { questions, timeLimit, teams, scores, phase, questionIndex });
  }, [joined, roomCode, questions, timeLimit, teams, scores, phase, questionIndex]);

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
    timerRef.current = setInterval(async () => {
      if (pausedRef.current) return;
      remainingRef.current -= 1;
      const remaining = remainingRef.current;
      setTimer(remaining);
      if (remaining <= 5 && remaining > 0) sounds.playUrgentTick();
      else sounds.playTick();
      const urgency = 1 - remaining / seconds;
      if (urgency > 0.6) sounds.updateQuestionUrgency(urgency);
      await broadcast(channel, "game:timer", { value: remaining, paused: false });
      if (remaining <= 0) {
        stopTimer();
        onEnd();
      }
    }, 1000);
  }, [channel, stopTimer]);

  const reveal = useCallback(async (index: number) => {
    stopTimer();
    const question = questionsRef.current[index];
    if (!question) return;
    const currentAnswers = answersRef.current;
    const currentScores = scoresRef.current;
    const answered = currentAnswers.map(answer => answer.teamName);

    setPhase("reveal");
    sounds.playRevealMusic();
    await broadcast(channel, "game:state", questionState(question, index, { phase: "reveal", scores: currentScores, answeredTeams: answered }));

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
      await broadcast(channel, "game:state", answerState);

      setTimeout(async () => {
        sounds.startLeaderboardMusic();
        setPhase("leaderboard");
        await broadcast(channel, "game:state", { ...answerState, phase: "leaderboard" });
      }, ANSWER_DELAY_MS);
    }, REVEAL_DELAY_MS);
  }, [channel, questionState, stopTimer]);

  const startQuestion = useCallback(async (index: number, currentScores: Scores) => {
    setPhase("question");
    setAnswers([]);
    pausedRef.current = false;
    setPaused(false);
    const question = questionsRef.current[index];
    sounds.setDifficulty(question.difficulty || "easy");
    await broadcast(channel, "game:state", questionState(question, index, { phase: "question", timerValue: timeLimitRef.current, scores: currentScores }));

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
  }, [channel, questionState, startTimer, reveal]);

  const endGame = useCallback(async (index: number, celebrate: boolean) => {
    stopTimer();
    if (celebrate) sounds.playWinnerMusic();
    else sounds.stopMusic();
    setPhase("game_over");
    await broadcast(channel, "game:state", buildState({ phase: "game_over", questionIndex: index, scores, roundScores, answeredTeams }));
  }, [channel, buildState, stopTimer, scores, roundScores, answeredTeams]);

  const join = (code: string) => {
    const saved = loadRoom(code);
    if (saved) {
      setQuestions(saved.questions || []);
      setTimeLimit(saved.timeLimit || DEFAULT_TIME_LIMIT);
      setTeams(saved.teams || []);
      setScores(saved.scores || {});
    }
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
    await broadcast(channel, "game:timer", { value: remainingRef.current, paused: nextPaused });
  };

  const resetGame = () => {
    clearRoom(roomCode);
    window.location.href = "/";
  };

  useEffect(() => {
    if (!joined || !roomCode) return;
    sounds.initAudio();
    const room = pusher.subscribe(channel);

    const sendLobby = (overrides: Partial<GameState>) => broadcast(channel, "game:state", buildState(overrides));

    room.bind("player:join", ({ teamName }: { teamName: string }) => {
      setTeams(previousTeams => {
        if (previousTeams.includes(teamName)) {
          setScores(currentScores => {
            sendLobby({ scores: currentScores, teams: previousTeams });
            return currentScores;
          });
          return previousTeams;
        }
        const nextTeams = [...previousTeams, teamName];
        setScores(currentScores => {
          const nextScores = { ...currentScores, [teamName]: currentScores[teamName] ?? 0 };
          sendLobby({ scores: nextScores, teams: nextTeams });
          return nextScores;
        });
        return nextTeams;
      });
    });

    room.bind("player:answer", (answer: PlayerAnswer) => {
      setAnswers(previous => previous.some(item => item.teamName === answer.teamName) ? previous : [...previous, answer]);
    });

    room.bind("player:request_state", () => {
      setScores(currentScores => {
        sendLobby({ scores: currentScores });
        return currentScores;
      });
    });

    return () => { pusher.unsubscribe(channel); };
  }, [joined, roomCode, channel, buildState]);

  return {
    roomCode, setRoomCode, joined, join,
    questions, setQuestions, timeLimit, setTimeLimit,
    teams, phase, questionIndex, scores, roundScores,
    timer, paused, answeredTeams, countdown,
    startGame, nextQuestion, skipToReveal, togglePause, resetGame,
    endGame: () => endGame(questionIndex, false),
  };
}
