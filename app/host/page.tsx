"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { GameState, Question, AnswerKey, PlayerAnswer } from "@/lib/gameTypes";
import { pusherClient } from "@/lib/pusher";
import { initAudio, playTick, playTimeUp } from "@/lib/sounds";

const TEAM_COLORS = [
  "#22c55e","#4ade80","#86efac","#3b82f6","#f59e0b",
  "#ec4899","#8b5cf6","#f87171","#06b6d4","#a3e635",
];

async function broadcast(channel: string, event: string, data: any) {
  await fetch("/api/pusher", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel, event, data }),
  });
}

const STORAGE_KEY = (room: string) => `qlive_host_${room}`;
function saveHostState(room: string, state: any) {
  try {
    localStorage.setItem(STORAGE_KEY(room), JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {}
}
function loadHostState(room: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(room));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > 4 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY(room));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export default function HostPage() {
  const [roomCode, setRoomCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeLimit, setTimeLimit] = useState(15);
  const [teams, setTeams] = useState<string[]>([]);
  const [phase, setPhase] = useState<GameState["phase"]>("waiting");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [scores, setScores] = useState<{ [k: string]: number }>({});
  const [roundScores, setRoundScores] = useState<{ [k: string]: number }>({});
  const [timer, setTimer] = useState(0);
  const [answeredTeams, setAnsweredTeams] = useState<string[]>([]);
  const [pendingAnswers, setPendingAnswers] = useState<PlayerAnswer[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [newQ, setNewQ] = useState<Question>({
    text: "",
    choices: { A: "", B: "", C: "", D: "" },
    correctAnswer: "A",
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!joined || !roomCode) return;
    saveHostState(roomCode, { questions, timeLimit, teams, scores, phase, currentQIndex });
  }, [joined, roomCode, questions, timeLimit, teams, scores, phase, currentQIndex]);

  const handleJoin = (code: string) => {
    const saved = loadHostState(code);
    if (saved) {
      setQuestions(saved.questions || []);
      setTimeLimit(saved.timeLimit || 15);
      setTeams(saved.teams || []);
      setScores(saved.scores || {});
    }
    setJoined(true);
  };

  const broadcastState = useCallback(
    async (overrides: Partial<GameState> = {}) => {
      const state: GameState = {
        phase,
        currentQuestion: questions[currentQIndex]
          ? { text: questions[currentQIndex].text, choices: questions[currentQIndex].choices }
          : null,
        questionIndex: currentQIndex,
        totalQuestions: questions.length,
        timeLimit,
        timerValue: timer,
        scores,
        roundScores,
        teams,
        correctAnswer: null,
        answeredTeams,
        ...overrides,
      };
      await broadcast(`quiz-${roomCode}`, "game:state", state);
    },
    [phase, questions, currentQIndex, timeLimit, timer, scores, roundScores, teams, roomCode, answeredTeams]
  );

  const startTimer = useCallback(
    (seconds: number, onEnd: () => void) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimer(seconds);
      let remaining = seconds;
      timerRef.current = setInterval(async () => {
        remaining -= 1;
        setTimer(remaining);
        playTick();
        await broadcast(`quiz-${roomCode}`, "game:timer", { value: remaining });
        if (remaining <= 0) {
          clearInterval(timerRef.current!);
          playTimeUp();
          onEnd();
        }
      }, 1000);
    },
    [roomCode]
  );

  const goToReveal = useCallback(
    async (currentAnswers: PlayerAnswer[], currentScores: { [k: string]: number }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("reveal");
      await broadcast(`quiz-${roomCode}`, "game:state", {
        phase: "reveal",
        currentQuestion: questions[currentQIndex]
          ? { text: questions[currentQIndex].text, choices: questions[currentQIndex].choices }
          : null,
        questionIndex: currentQIndex,
        totalQuestions: questions.length,
        timeLimit,
        timerValue: 0,
        scores: currentScores,
        roundScores: {},
        teams,
        correctAnswer: null,
        answeredTeams: currentAnswers.map((a) => a.teamName),
      });

      setTimeout(async () => {
        const correct = questions[currentQIndex].correctAnswer;
        const newRound: { [k: string]: number } = {};
        const newScores = { ...currentScores };
        teams.forEach((t) => {
          const ans = currentAnswers.find((a) => a.teamName === t);
          if (ans && ans.answer === correct) {
            const bonus = Math.floor((ans.timeRemaining / timeLimit) * 50);
            const pts = 100 + bonus;
            newRound[t] = pts;
            newScores[t] = (newScores[t] || 0) + pts;
          } else {
            newRound[t] = 0;
          }
        });
        setRoundScores(newRound);
        setScores(newScores);
        setPhase("answer");
        const answerState: GameState = {
          phase: "answer",
          currentQuestion: { text: questions[currentQIndex].text, choices: questions[currentQIndex].choices },
          questionIndex: currentQIndex,
          totalQuestions: questions.length,
          timeLimit,
          timerValue: 0,
          scores: newScores,
          roundScores: newRound,
          teams,
          correctAnswer: correct,
          answeredTeams: currentAnswers.map((a) => a.teamName),
        };
        await broadcast(`quiz-${roomCode}`, "game:state", answerState);
        setTimeout(async () => {
          setPhase("leaderboard");
          await broadcast(`quiz-${roomCode}`, "game:state", { ...answerState, phase: "leaderboard" });
        }, 5000);
      }, 4000);
    },
    [questions, currentQIndex, teams, timeLimit, roomCode]
  );

  const startQuestion = useCallback(
    async (qIndex: number, currentScores: { [k: string]: number }) => {
      setPhase("question");
      setAnsweredTeams([]);
      setPendingAnswers([]);
      const q = questions[qIndex];
      const state: GameState = {
        phase: "question",
        currentQuestion: { text: q.text, choices: q.choices },
        questionIndex: qIndex,
        totalQuestions: questions.length,
        timeLimit,
        timerValue: timeLimit,
        scores: currentScores,
        roundScores: {},
        teams,
        correctAnswer: null,
        answeredTeams: [],
      };
      await broadcast(`quiz-${roomCode}`, "game:state", state);
      startTimer(timeLimit, () => {
        setPendingAnswers((prev) => {
          goToReveal(prev, currentScores);
          return prev;
        });
      });
    },
    [questions, timeLimit, teams, roomCode, startTimer, goToReveal]
  );

  const handleNextQuestion = useCallback(async () => {
    const nextIndex = currentQIndex + 1;
    if (nextIndex >= questions.length) {
      setPhase("game_over");
      await broadcast(`quiz-${roomCode}`, "game:state", {
        phase: "game_over",
        currentQuestion: null,
        questionIndex: nextIndex,
        totalQuestions: questions.length,
        timeLimit,
        timerValue: 0,
        scores,
        roundScores,
        teams,
        correctAnswer: null,
        answeredTeams: [],
      });
    } else {
      setCurrentQIndex(nextIndex);
      await startQuestion(nextIndex, scores);
    }
  }, [currentQIndex, questions.length, roomCode, scores, roundScores, teams, timeLimit, startQuestion]);

  useEffect(() => {
    if (!joined || !roomCode) return;
    initAudio();
    const ch = pusherClient.subscribe(`quiz-${roomCode}`);

    ch.bind("player:join", (data: { teamName: string }) => {
      setTeams((prev) => {
        if (prev.includes(data.teamName)) return prev;
        const next = [...prev, data.teamName];
        setScores((s) => {
          const updated = { ...s, [data.teamName]: s[data.teamName] ?? 0 };
          broadcast(`quiz-${roomCode}`, "game:state", {
            phase: "waiting",
            currentQuestion: null,
            questionIndex: 0,
            totalQuestions: questions.length,
            timeLimit,
            timerValue: 0,
            scores: updated,
            roundScores: {},
            teams: next,
            correctAnswer: null,
            answeredTeams: [],
          });
          return updated;
        });
        return next;
      });
    });

    ch.bind("player:answer", (data: PlayerAnswer) => {
      setAnsweredTeams((prev) =>
        prev.includes(data.teamName) ? prev : [...prev, data.teamName]
      );
      setPendingAnswers((prev) =>
        prev.find((a) => a.teamName === data.teamName) ? prev : [...prev, data]
      );
    });

    return () => {
      pusherClient.unsubscribe(`quiz-${roomCode}`);
    };
  }, [joined, roomCode]);

  const addQuestion = () => {
    if (!newQ.text || !newQ.choices.A || !newQ.choices.B || !newQ.choices.C || !newQ.choices.D) return;
    if (editingIndex !== null) {
      setQuestions((prev) => prev.map((q, i) => (i === editingIndex ? { ...newQ } : q)));
      setEditingIndex(null);
    } else {
      setQuestions((prev) => [...prev, { ...newQ }]);
    }
    setNewQ({ text: "", choices: { A: "", B: "", C: "", D: "" }, correctAnswer: "A" });
  };

  const startEdit = (i: number) => {
    setEditingIndex(i);
    setNewQ({ ...questions[i] });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setNewQ({ text: "", choices: { A: "", B: "", C: "", D: "" }, correctAnswer: "A" });
  };

  // ── Setup / Join screen ──────────────────────────────────
  if (!joined) {
    return (
      <main
        style={{
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 16px",
        }}
      >
        <div
          className="card card-em anim-up"
          style={{ width: "100%", maxWidth: 400, padding: "clamp(24px,5vw,36px) clamp(20px,5vw,28px)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <div
              style={{
                width: 42,
                height: 42,
                minWidth: 42,
                borderRadius: 12,
                background: "var(--accent-lo)",
                border: "1px solid var(--border-em)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 14c3.31 0 6-2.69 6-6S15.31 2 12 2 6 4.69 6 8s2.69 6 6 6z"
                  stroke="#22c55e"
                  strokeWidth="2"
                />
                <path
                  d="M3 20c0-3.31 4.03-6 9-6s9 2.686 9 6"
                  stroke="#22c55e"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-1)", letterSpacing: "-0.02em" }}>
                Host Setup
              </h1>
              <p style={{ fontSize: "0.78rem", color: "var(--text-3)", fontWeight: 500 }}>
                Create your quiz room
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--text-2)",
                marginBottom: 8,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Room Code
            </label>
            <input
              className="inp inp-mono"
              placeholder="e.g. QUIZ2025"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && roomCode && handleJoin(roomCode)}
              style={{ fontSize: "clamp(0.9rem, 3vw, 1.1rem)" }}
            />
            <p style={{ fontSize: "0.74rem", color: "var(--text-3)", marginTop: 7, fontWeight: 500 }}>
              Share this code with your players
            </p>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%", fontSize: "0.95rem", padding: "13px" }}
            disabled={!roomCode}
            onClick={() => handleJoin(roomCode)}
          >
            Create Room →
          </button>
        </div>
      </main>
    );
  }

  // ── Game Over ────────────────────────────────────────────
  if (phase === "game_over") {
    const sorted = [...teams].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
    return (
      <main
        style={{
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          textAlign: "center",
          gap: 20,
        }}
      >
        <div className="anim-scale" style={{ fontSize: "3rem" }}>🏆</div>
        <div className="anim-up">
          <h1 style={{ fontWeight: 900, fontSize: "clamp(1.6rem,6vw,2rem)", color: "var(--text-1)", letterSpacing: "-0.03em" }}>
            Game Over
          </h1>
          <p style={{ color: "#fcd34d", fontWeight: 700, fontSize: "1rem", marginTop: 6 }}>
            🥇 {sorted[0]} wins!
          </p>
        </div>
        <div className="card anim-up-1" style={{ width: "100%", maxWidth: 400, padding: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.map((t, i) => (
              <div key={t} className="rank-row">
                <span style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "0.9rem" }}>
                  {i + 1}. {t}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    color: "#fcd34d",
                    fontSize: "0.9rem",
                  }}
                >
                  {scores[t] || 0} pts
                </span>
              </div>
            ))}
          </div>
        </div>
        <button
          className="btn btn-primary anim-up-2"
          style={{ padding: "13px 32px" }}
          onClick={() => {
            try {
              localStorage.removeItem(STORAGE_KEY(roomCode));
            } catch {}
            window.location.href = "/";
          }}
        >
          New Game
        </button>
      </main>
    );
  }

  // ── Main Host View ───────────────────────────────────────
  const phaseLabel: Record<string, string> = {
    waiting: "Waiting",
    question: "Live",
    reveal: "Reveal",
    answer: "Answer",
    leaderboard: "Scores",
    game_over: "Done",
  };

  return (
    <main style={{ minHeight: "100svh", padding: "clamp(12px,3vw,20px)", paddingBottom: 40 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Top bar */}
        <div
          className="anim-up"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "clamp(14px,3vw,20px)",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span
              style={{
                fontWeight: 900,
                fontSize: "clamp(0.88rem,2.5vw,1rem)",
                color: "var(--text-1)",
                letterSpacing: "-0.02em",
                flexShrink: 0,
              }}
            >
              QuizLive
            </span>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                fontSize: "clamp(0.75rem,2.5vw,0.85rem)",
                color: "var(--accent-hi)",
                background: "var(--accent-lo)",
                border: "1px solid var(--border-em)",
                borderRadius: 8,
                padding: "4px 10px",
                letterSpacing: "0.1em",
                flexShrink: 0,
              }}
            >
              {roomCode}
            </div>
          </div>
          <span className="badge" style={{ flexShrink: 0 }}>{phaseLabel[phase] || phase}</span>
        </div>

        {/* ── WAITING ──────────────────────────────────────── */}
        {phase === "waiting" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
            {/* Question Editor */}
            <div className="card anim-up" style={{ padding: "clamp(18px,4vw,24px)" }}>
              <h2
                style={{
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  color: "var(--text-2)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                {editingIndex !== null ? `Editing Q${editingIndex + 1}` : "Add Question"}
              </h2>

              <textarea
                className="inp"
                rows={3}
                placeholder="Type your question here…"
                style={{ marginBottom: 12, fontSize: "0.875rem", resize: "vertical" }}
                value={newQ.text}
                onChange={(e) => setNewQ((q) => ({ ...q, text: e.target.value }))}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {(["A", "B", "C", "D"] as AnswerKey[]).map((k) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => setNewQ((q) => ({ ...q, correctAnswer: k }))}
                      style={{
                        width: 32,
                        height: 32,
                        minWidth: 32,
                        borderRadius: "50%",
                        border: `2px solid ${newQ.correctAnswer === k ? "var(--accent)" : "var(--border)"}`,
                        background: newQ.correctAnswer === k ? "var(--accent-lo)" : "transparent",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        color: newQ.correctAnswer === k ? "var(--accent)" : "var(--text-3)",
                      }}
                    >
                      {k}
                    </button>
                    <input
                      className="inp"
                      style={{ padding: "8px 12px", fontSize: "0.83rem", flex: 1 }}
                      placeholder={`Choice ${k}`}
                      value={newQ.choices[k]}
                      onChange={(e) =>
                        setNewQ((q) => ({ ...q, choices: { ...q.choices, [k]: e.target.value } }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, fontSize: "0.85rem", padding: "10px" }}
                  onClick={addQuestion}
                  disabled={
                    !newQ.text || !newQ.choices.A || !newQ.choices.B || !newQ.choices.C || !newQ.choices.D
                  }
                >
                  {editingIndex !== null ? "Save Changes" : "+ Add Question"}
                </button>
                {editingIndex !== null && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: "0.85rem", padding: "10px 14px" }}
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Timer */}
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
                <p
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "var(--text-2)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Timer per question
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  {[10, 15, 20, 30].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeLimit(t)}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: 8,
                        border: `1px solid ${timeLimit === t ? "var(--accent)" : "var(--border)"}`,
                        background: timeLimit === t ? "var(--accent-lo)" : "transparent",
                        color: timeLimit === t ? "var(--accent-hi)" : "var(--text-3)",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Questions list */}
              <div className="card anim-up-1" style={{ padding: "clamp(16px,4vw,20px)" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <h2
                    style={{
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      color: "var(--text-2)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Questions
                  </h2>
                  <span className="badge">{questions.length}</span>
                </div>

                {questions.length === 0 ? (
                  <p style={{ color: "var(--text-3)", fontSize: "0.82rem", textAlign: "center", padding: "14px 0" }}>
                    No questions yet
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      maxHeight: 220,
                      overflowY: "auto",
                    }}
                  >
                    {questions.map((q, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 12px",
                          borderRadius: 10,
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "0.68rem",
                            color: "var(--text-3)",
                            flexShrink: 0,
                          }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--text-1)",
                            flex: 1,
                            lineHeight: 1.4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {q.text}
                        </span>
                        <button
                          onClick={() => startEdit(i)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-3)",
                            fontSize: "0.78rem",
                            padding: "4px 6px",
                            borderRadius: 6,
                            flexShrink: 0,
                            lineHeight: 1,
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => {
                            setQuestions((p) => p.filter((_, idx) => idx !== i));
                            if (editingIndex === i) cancelEdit();
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#f87171",
                            fontSize: "0.78rem",
                            padding: "4px 6px",
                            borderRadius: 6,
                            flexShrink: 0,
                            lineHeight: 1,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Players */}
              <div className="card anim-up-2" style={{ padding: "clamp(16px,4vw,20px)" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <h2
                    style={{
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      color: "var(--text-2)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Players
                  </h2>
                  <span className="badge">{teams.length} joined</span>
                </div>

                {teams.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "14px 0" }}>
                    <div className="dots" style={{ justifyContent: "center", marginBottom: 8 }}>
                      <span /><span /><span />
                    </div>
                    <p style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>Waiting for players…</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {teams.map((t, i) => (
                      <div
                        key={t}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 12px",
                          borderRadius: 10,
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            minWidth: 8,
                            borderRadius: "50%",
                            background: TEAM_COLORS[i % TEAM_COLORS.length],
                          }}
                        />
                        <span
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "var(--text-1)",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-3)",
                            fontFamily: "'JetBrains Mono', monospace",
                            flexShrink: 0,
                          }}
                        >
                          {scores[t] || 0} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary anim-up-3"
                style={{ width: "100%", padding: "15px", fontSize: "0.95rem" }}
                disabled={questions.length === 0 || teams.length === 0}
                onClick={() => startQuestion(0, Object.fromEntries(teams.map((t) => [t, 0])))}
              >
                {questions.length === 0
                  ? "Add questions to start"
                  : teams.length === 0
                  ? "Waiting for players…"
                  : "Start Game →"}
              </button>
            </div>
          </div>
        )}

        {/* ── QUESTION ─────────────────────────────────────── */}
        {phase === "question" && (
          <div className="card anim-scale" style={{ padding: "clamp(20px,4vw,28px)" }}>
            {/* Header row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
                gap: 8,
              }}
            >
              <span className="badge" style={{ flexShrink: 0 }}>
                Q{currentQIndex + 1} / {questions.length}
              </span>
              <div
                className={timer <= 5 ? "timer-warn" : ""}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 900,
                  fontSize: "clamp(2rem,8vw,3rem)",
                  color: timer <= 5 ? "#f87171" : "var(--accent)",
                  lineHeight: 1,
                }}
              >
                {timer}
              </div>
              <span className="badge" style={{ flexShrink: 0 }}>
                {answeredTeams.length}/{teams.length} ✓
              </span>
            </div>

            {/* Timer bar */}
            <div className="timer-bar" style={{ marginBottom: 18 }}>
              <div
                className="timer-fill"
                style={{
                  width: `${(timer / timeLimit) * 100}%`,
                  background: timer <= 5 ? "#f87171" : "var(--accent)",
                }}
              />
            </div>

            {/* Question text */}
            <p
              style={{
                fontWeight: 700,
                fontSize: "clamp(1rem,2.5vw,1.3rem)",
                color: "var(--text-1)",
                textAlign: "center",
                marginBottom: 18,
                lineHeight: 1.45,
              }}
            >
              {questions[currentQIndex]?.text}
            </p>

            {/* Choices grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,220px),1fr))",
                gap: 8,
                marginBottom: 18,
              }}
            >
              {(["A", "B", "C", "D"] as AnswerKey[]).map((k) => (
                <div
                  key={k}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "var(--text-3)",
                      flexShrink: 0,
                    }}
                  >
                    {k}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-1)", lineHeight: 1.4 }}>
                    {questions[currentQIndex]?.choices[k]}
                  </span>
                </div>
              ))}
            </div>

            {/* Answered teams */}
            {teams.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 18 }}>
                {teams.map((t) => (
                  <span
                    key={t}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 100,
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      background: answeredTeams.includes(t) ? "var(--accent-lo)" : "var(--surface-2)",
                      border: `1px solid ${answeredTeams.includes(t) ? "var(--border-em)" : "var(--border)"}`,
                      color: answeredTeams.includes(t) ? "var(--accent-hi)" : "var(--text-3)",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {answeredTeams.includes(t) ? "✓ " : ""}
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  setPendingAnswers((p) => {
                    goToReveal(p, scores);
                    return p;
                  });
                }}
              >
                Skip to Reveal
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setPhase("game_over");
                  broadcast(`quiz-${roomCode}`, "game:state", {
                    phase: "game_over",
                    currentQuestion: null,
                    questionIndex: currentQIndex,
                    totalQuestions: questions.length,
                    timeLimit,
                    timerValue: 0,
                    scores,
                    roundScores,
                    teams,
                    correctAnswer: null,
                    answeredTeams,
                  });
                }}
              >
                End Game
              </button>
            </div>
          </div>
        )}

        {/* ── REVEAL / ANSWER ───────────────────────────────── */}
        {(phase === "reveal" || phase === "answer") && (
          <div
            className="card anim-scale"
            style={{ padding: "clamp(28px,5vw,44px) clamp(20px,5vw,28px)", textAlign: "center" }}
          >
            {phase === "reveal" ? (
              <div>
                <div className="dots" style={{ justifyContent: "center", marginBottom: 16 }}>
                  <span /><span /><span />
                </div>
                <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-1)" }}>
                  Revealing answer…
                </p>
              </div>
            ) : (
              <div>
                <p
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "var(--text-2)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Correct Answer
                </p>
                <div
                  className="anim-scale"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 900,
                    fontSize: "clamp(2.5rem,8vw,3.5rem)",
                    color: "var(--accent)",
                    marginBottom: 4,
                  }}
                >
                  {questions[currentQIndex]?.correctAnswer}
                </div>
                <p style={{ fontWeight: 700, color: "var(--text-1)", fontSize: "1rem", marginBottom: 24 }}>
                  {questions[currentQIndex]?.choices[questions[currentQIndex]?.correctAnswer]}
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 8,
                  }}
                >
                  {teams.map((t) => (
                    <div key={t} className="rank-row" style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-1)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {t}
                      </span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          color: (roundScores[t] || 0) > 0 ? "var(--accent-hi)" : "var(--text-3)",
                          fontSize: "0.85rem",
                          flexShrink: 0,
                        }}
                      >
                        +{roundScores[t] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LEADERBOARD ──────────────────────────────────── */}
        {phase === "leaderboard" && (
          <div
            className="card anim-scale"
            style={{
              padding: "clamp(20px,4vw,28px)",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            <h2
              style={{
                fontWeight: 800,
                fontSize: "1.1rem",
                textAlign: "center",
                marginBottom: 16,
                color: "var(--text-1)",
                letterSpacing: "-0.02em",
              }}
            >
              Leaderboard
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {[...teams]
                .sort((a, b) => (scores[b] || 0) - (scores[a] || 0))
                .map((t, i) => (
                  <div key={t} className="rank-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: i < 3 ? "1.1rem" : "0.82rem",
                          minWidth: "1.4rem",
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--text-1)",
                          fontSize: "0.9rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t}
                      </span>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          color: "var(--text-1)",
                          fontSize: "0.92rem",
                        }}
                      >
                        {scores[t] || 0}
                      </div>
                      {(roundScores[t] || 0) > 0 && (
                        <div style={{ fontSize: "0.7rem", color: "var(--accent)", fontWeight: 600 }}>
                          +{roundScores[t]}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            <button
              className="btn btn-primary"
              style={{ width: "100%", padding: "14px", fontSize: "0.95rem" }}
              onClick={handleNextQuestion}
            >
              {currentQIndex + 1 >= questions.length ? "End Game →" : "Next Question →"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}