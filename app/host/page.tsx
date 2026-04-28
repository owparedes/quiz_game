"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { GameState, Question, AnswerKey, PlayerAnswer, Difficulty, DIFFICULTY_CONFIG } from "@/lib/gameTypes";
import { pusherClient } from "@/lib/pusher";
import {
  initAudio, playTick, playUrgentTick, playTimeUp,
  startQuestionLoop, updateQuestionUrgency, playRevealMusic,
  startLeaderboardMusic, playWinnerMusic, setDifficulty,
  playPause, playResume, stopMusic
} from "@/lib/sounds";

const TEAM_COLORS = ["#63d38e", "#60a5fa", "#f59e0b", "#ec4899", "#a78bfa", "#34d399", "#f87171", "#38bdf8", "#fbbf24", "#c084fc"];

async function broadcast(channel: string, event: string, data: any) {
  await fetch("/api/pusher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, event, data }) });
}

const SK = (r: string) => `qlive2_${r}`;
function save(room: string, s: any) { try { localStorage.setItem(SK(room), JSON.stringify({ ...s, savedAt: Date.now() })); } catch { } }
function load(room: string) {
  try {
    const raw = localStorage.getItem(SK(room));
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (Date.now() - p.savedAt > 4 * 3600000) { localStorage.removeItem(SK(room)); return null; }
    return p;
  } catch { return null; }
}

// Validate imported JSON questions
function validateQuestions(raw: any): Question[] | null {
  if (!Array.isArray(raw)) return null;
  const result: Question[] = [];
  for (const q of raw) {
    if (typeof q.text !== "string" || !q.text.trim()) return null;
    if (!q.choices || typeof q.choices !== "object") return null;
    for (const k of ["A", "B", "C", "D"]) { if (typeof q.choices[k] !== "string" || !q.choices[k].trim()) return null; }
    if (!["A", "B", "C", "D"].includes(q.correctAnswer)) return null;
    result.push({
      text: q.text.trim(),
      choices: { A: q.choices.A.trim(), B: q.choices.B.trim(), C: q.choices.C.trim(), D: q.choices.D.trim() },
      correctAnswer: q.correctAnswer as AnswerKey,
      difficulty: (["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "easy") as Difficulty,
    });
  }
  return result.length ? result : null;
}

const BLANK_Q: Question = { text: "", choices: { A: "", B: "", C: "", D: "" }, correctAnswer: "A", difficulty: "easy" };

export default function HostPage() {
  const [roomCode, setRoomCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeLimit, setTimeLimit] = useState(20);
  const [teams, setTeams] = useState<string[]>([]);
  const [phase, setPhase] = useState<GameState["phase"]>("waiting");
  const [qIdx, setQIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [roundScores, setRoundScores] = useState<Record<string, number>>({});
  const [timer, setTimer] = useState(0);
  const [paused, setPaused] = useState(false);
  const [answeredTeams, setAnsweredTeams] = useState<string[]>([]);
  const [pendingAnswers, setPendingAnswers] = useState<PlayerAnswer[]>([]);
  const [newQ, setNewQ] = useState<Question>({ ...BLANK_Q });
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [importErr, setImportErr] = useState("");
  const [importOk, setImportOk] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [tab, setTab] = useState<"editor" | "list">("editor");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedRef = useRef(false);
  const remainingRef = useRef(0);
  const pendingRef = useRef<PlayerAnswer[]>([]);
  const scoresRef = useRef<Record<string, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const questionsRef = useRef<Question[]>([]);
  const timeLimitRef = useRef(20);
  const teamsRef = useRef<string[]>([]);

  useEffect(() => { pendingRef.current = pendingAnswers; }, [pendingAnswers]);
  useEffect(() => { scoresRef.current = scores; }, [scores]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { timeLimitRef.current = timeLimit; }, [timeLimit]);
  useEffect(() => { teamsRef.current = teams; }, [teams]);

  useEffect(() => {
    if (!joined || !roomCode) return;
    save(roomCode, { questions, timeLimit, teams, scores, phase, qIdx });
  }, [joined, roomCode, questions, timeLimit, teams, scores, phase, qIdx]);

  const handleJoin = (code: string) => {
    const s = load(code);
    if (s) {
      setQuestions(s.questions || []); setTimeLimit(s.timeLimit || 20);
      setTeams(s.teams || []); setScores(s.scores || {});
    }
    setJoined(true);
  };

  const clearTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const startTimer = useCallback((seconds: number, onEnd: () => void) => {
    clearTimer();
    setPaused(false); pausedRef.current = false;
    setTimer(seconds); remainingRef.current = seconds;
    timerRef.current = setInterval(async () => {
      if (pausedRef.current) return;
      remainingRef.current -= 1;
      const r = remainingRef.current;
      setTimer(r);
      if (r <= 5 && r > 0) playUrgentTick(); else playTick();
      const urgency = 1 - r / seconds;
      if (urgency > 0.6) updateQuestionUrgency(urgency);
      await broadcast(`quiz-${roomCode}`, "game:timer", { value: r, paused: false });
      if (r <= 0) { clearTimer(); playTimeUp(); onEnd(); }
    }, 1000);
  }, [roomCode]);

  const togglePause = useCallback(async () => {
    const nextPaused = !pausedRef.current;
    pausedRef.current = nextPaused;
    setPaused(nextPaused);
    if (nextPaused) { playPause(); stopMusic(); } else { playResume(); startQuestionLoop(1 - remainingRef.current / timeLimit); }
    await broadcast(`quiz-${roomCode}`, "game:timer", { value: remainingRef.current, paused: nextPaused });
  }, [roomCode, timeLimit]);

  const goToReveal = useCallback(async (answers: PlayerAnswer[], curScores: Record<string, number>, qi: number) => {
    clearTimer();
    const q = questions[qi];
    if (!q) return;
    setPhase("reveal");
    playRevealMusic();
    await broadcast(`quiz-${roomCode}`, "game:state", {
      phase: "reveal",
      currentQuestion: { text: q.text, choices: q.choices, difficulty: q.difficulty },
      questionIndex: qi, totalQuestions: questions.length, timeLimit, timerValue: 0,
      scores: curScores, roundScores: {}, teams, correctAnswer: null,
      answeredTeams: answers.map(a => a.teamName), difficulty: q.difficulty,
    });

    setTimeout(async () => {
      const correct = q.correctAnswer;
      const cfg = DIFFICULTY_CONFIG[q.difficulty || "easy"];
      const newRound: Record<string, number> = {};
      const newScores = { ...curScores };
      teams.forEach(t => {
        const ans = answers.find(a => a.teamName === t);
        if (ans && ans.answer === correct) {
          const pts = cfg.pts; // flat points: 1 easy, 2 medium, 3 hard
          newRound[t] = pts;
          newScores[t] = (newScores[t] || 0) + pts;
        } else { newRound[t] = 0; }
      });
      setRoundScores(newRound); setScores(newScores);
      setPhase("answer");
      const ansState: GameState = {
        phase: "answer",
        currentQuestion: { text: q.text, choices: q.choices, difficulty: q.difficulty },
        questionIndex: qi, totalQuestions: questions.length, timeLimit, timerValue: 0,
        scores: newScores, roundScores: newRound, teams, correctAnswer: correct,
        answeredTeams: answers.map(a => a.teamName), difficulty: q.difficulty,
      };
      await broadcast(`quiz-${roomCode}`, "game:state", ansState);
      setTimeout(async () => {
        const sorted = [...teams].sort((a, b) => (newScores[b] || 0) - (newScores[a] || 0));
        startLeaderboardMusic(sorted[0] === sorted[0]); // always "top" variation for host
        setPhase("leaderboard");
        await broadcast(`quiz-${roomCode}`, "game:state", { ...ansState, phase: "leaderboard" });
      }, 5000);
    }, 3800);
  }, [questions, teams, timeLimit, roomCode]);

  const startQuestion = useCallback(async (qi: number, curScores: Record<string, number>) => {
    setPhase("question"); setAnsweredTeams([]); setPendingAnswers([]);
    pausedRef.current = false; setPaused(false);
    const q = questions[qi];
    setDifficulty(q.difficulty || "easy");
    startQuestionLoop(0);
    const state: GameState = {
      phase: "question",
      currentQuestion: { text: q.text, choices: q.choices, difficulty: q.difficulty },
      questionIndex: qi, totalQuestions: questions.length, timeLimit, timerValue: timeLimit,
      scores: curScores, roundScores: {}, teams, correctAnswer: null, answeredTeams: [],
      difficulty: q.difficulty,
    };
    await broadcast(`quiz-${roomCode}`, "game:state", state);
    startTimer(timeLimit, () => { goToReveal(pendingRef.current, scoresRef.current, qi); });
  }, [questions, timeLimit, teams, roomCode, startTimer, goToReveal]);

  const handleNext = useCallback(async () => {
    const next = qIdx + 1;
    if (next >= questions.length) {
      stopMusic(); playWinnerMusic();
      setPhase("game_over");
      await broadcast(`quiz-${roomCode}`, "game:state", {
        phase: "game_over", currentQuestion: null, questionIndex: next,
        totalQuestions: questions.length, timeLimit, timerValue: 0,
        scores, roundScores, teams, correctAnswer: null, answeredTeams: [],
      });
    } else {
      setQIdx(next);
      await startQuestion(next, scores);
    }
  }, [qIdx, questions.length, roomCode, scores, roundScores, teams, timeLimit, startQuestion]);

  useEffect(() => {
    if (!joined || !roomCode) return;
    initAudio();
    const ch = pusherClient.subscribe(`quiz-${roomCode}`);
    ch.bind("player:join", (data: { teamName: string }) => {
      setTeams(prev => {
        if (prev.includes(data.teamName)) {
          // Player rejoined — resend current state so they don't get stuck
          setScores(s => {
            broadcast(`quiz-${roomCode}`, "game:state", {
              phase: "waiting", currentQuestion: null, questionIndex: 0,
              totalQuestions: questionsRef.current.length, timeLimit: timeLimitRef.current, timerValue: 0,
              scores: s, roundScores: {}, teams: prev, correctAnswer: null, answeredTeams: [],
            });
            return s;
          });
          return prev;
        }
        const next = [...prev, data.teamName];
        setScores(s => {
          const updated = { ...s, [data.teamName]: s[data.teamName] ?? 0 };
          broadcast(`quiz-${roomCode}`, "game:state", {
            phase: "waiting", currentQuestion: null, questionIndex: 0,
            totalQuestions: questionsRef.current.length, timeLimit: timeLimitRef.current, timerValue: 0,
            scores: updated, roundScores: {}, teams: next, correctAnswer: null, answeredTeams: [],
          });
          return updated;
        });
        return next;
      });
    });
    ch.bind("player:answer", (data: PlayerAnswer) => {
      setAnsweredTeams(p => p.includes(data.teamName) ? p : [...p, data.teamName]);
      setPendingAnswers(p => p.find(a => a.teamName === data.teamName) ? p : [...p, data]);
    });
    // Handle late-join resync requests
    ch.bind("player:request_state", () => {
      setScores(s => {
        broadcast(`quiz-${roomCode}`, "game:state", {
          phase: "waiting", currentQuestion: null, questionIndex: 0,
          totalQuestions: questionsRef.current.length, timeLimit: timeLimitRef.current, timerValue: 0,
          scores: s, roundScores: {}, teams: teamsRef.current, correctAnswer: null, answeredTeams: [],
        });
        return s;
      });
    });
    return () => { pusherClient.unsubscribe(`quiz-${roomCode}`); };
  }, [joined, roomCode]);

  const addQuestion = () => {
    if (!newQ.text || !newQ.choices.A || !newQ.choices.B || !newQ.choices.C || !newQ.choices.D) return;
    if (editIdx !== null) {
      setQuestions(p => p.map((q, i) => i === editIdx ? { ...newQ } : q));
      setEditIdx(null);
    } else { setQuestions(p => [...p, { ...newQ }]); }
    setNewQ({ ...BLANK_Q });
    setTab("list");
  };
  const startEdit = (i: number) => { setEditIdx(i); setNewQ({ ...questions[i] }); setTab("editor"); };
  const cancelEdit = () => { setEditIdx(null); setNewQ({ ...BLANK_Q }); };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setImportText((ev.target?.result as string) || ""); };
    reader.readAsText(file);
    e.target.value = "";
  };

  const doImport = () => {
    setImportErr(""); setImportOk(false);
    try {
      const parsed = JSON.parse(importText);
      const qs = validateQuestions(parsed);
      if (!qs) { setImportErr("Invalid format. Check your JSON structure."); return; }
      setQuestions(prev => [...prev, ...qs]);
      setImportOk(true); setImportText("");
      setTimeout(() => { setShowImport(false); setImportOk(false); }, 1200);
    } catch { setImportErr("Invalid JSON. Make sure it's valid JSON."); }
  };

  const S = { // style helpers
    label: { display: "block" as const, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-2)", marginBottom: 7, letterSpacing: "0.07em", textTransform: "uppercase" as const },
  };

  // ── Join ──────────────────────────────────────────────────────────────────
  if (!joined) return (
    <main style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}>
      <div className="card card-em anim-up" style={{ width: "100%", maxWidth: 380, padding: "clamp(28px,6vw,40px) clamp(22px,5vw,32px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--accent-lo)", border: "1px solid var(--border-em)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 14c3.31 0 6-2.69 6-6S15.31 2 12 2 6 4.69 6 8s2.69 6 6 6z" stroke="var(--accent)" strokeWidth="2" /><path d="M3 20c0-3.31 4.03-6 9-6s9 2.69 9 6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
          <div><p style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-1)", letterSpacing: "-0.02em" }}>Host Setup</p><p style={{ fontSize: "0.76rem", color: "var(--text-3)", marginTop: 2 }}>Create a quiz room</p></div>
        </div>
        <label style={S.label}>Room Code</label>
        <input className="inp inp-mono" placeholder="QUIZ2025" value={roomCode}
          onChange={e => setRoomCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && roomCode && handleJoin(roomCode)}
          style={{ marginBottom: 10, fontSize: "1.05rem" }} />
        <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: 24, fontWeight: 500 }}>Share this code with your players</p>
        <button className="btn btn-primary" style={{ width: "100%", padding: "12px" }} disabled={!roomCode} onClick={() => handleJoin(roomCode)}>
          Create Room →
        </button>
      </div>
    </main>
  );

  // ── Game Over ──────────────────────────────────────────────────────────────
  if (phase === "game_over") {
    const sorted = [...teams].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
    return (
      <main style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", textAlign: "center", gap: 20 }}>
        <div className="anim-float" style={{ fontSize: "3.5rem", lineHeight: 1 }}>🏆</div>
        <div className="anim-up">
          <p style={{ fontWeight: 900, fontSize: "clamp(1.6rem,6vw,2.2rem)", color: "var(--text-1)", letterSpacing: "-0.03em" }}>Game Over</p>
          <p style={{ color: "#fbbf24", fontWeight: 700, fontSize: "0.95rem", marginTop: 6 }}>🥇 {sorted[0]} wins!</p>
        </div>
        <div className="card anim-up-1" style={{ width: "100%", maxWidth: 380, padding: "18px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sorted.map((t, i) => (
              <div key={t} className={`rank-row${i === 0 ? " rank-1" : ""}`}>
                <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-1)" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`} {t}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#fbbf24", fontSize: "0.88rem" }}>{scores[t] || 0} pts</span>
              </div>
            ))}
          </div>
        </div>
        <button className="btn btn-primary anim-up-2" style={{ padding: "12px 30px" }}
          onClick={() => { try { localStorage.removeItem(SK(roomCode)); } catch { } window.location.href = "/"; }}>
          New Game
        </button>
      </main>
    );
  }

  const phaseLabel: Record<string, string> = { waiting: "Setup", question: "Live", reveal: "Reveal", answer: "Answer", leaderboard: "Scores", game_over: "Done" };
  const currentQ = questions[qIdx];
  const currentDiff = currentQ?.difficulty || "easy";
  const diffCfg = DIFFICULTY_CONFIG[currentDiff];

  return (
    <main style={{ minHeight: "100svh", padding: "clamp(12px,3vw,18px)", paddingBottom: 40 }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>

        {/* ── Top bar ──────────────────────────────────────── */}
        <div className="anim-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text-1)", letterSpacing: "-0.02em" }}>QuizLive</span>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "0.78rem", color: "var(--accent-hi)", background: "var(--accent-lo)", border: "1px solid var(--border-em)", borderRadius: 8, padding: "3px 9px", letterSpacing: "0.1em" }}>{roomCode}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="badge">{phaseLabel[phase] || phase}</span>
            {phase === "question" && <span className="badge badge-neutral">{teams.length} players</span>}
          </div>
        </div>

        {/* ── WAITING ──────────────────────────────────────── */}
        {phase === "waiting" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 14, alignItems: "start" }}>

            {/* Left: Editor */}
            <div className="card anim-up" style={{ padding: "clamp(16px,4vw,22px)" }}>
              {/* Tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 18, background: "var(--bg)", borderRadius: 10, padding: 3 }}>
                {(["editor", "list"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{
                      flex: 1, padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer", transition: "all 0.15s", fontWeight: 700, fontSize: "0.76rem", letterSpacing: "0.04em",
                      background: tab === t ? "var(--surface-2)" : "transparent",
                      color: tab === t ? "var(--text-1)" : "var(--text-3)"
                    }}>
                    {t === "editor" ? (editIdx !== null ? `Edit Q${editIdx + 1}` : "+ Add") : `Questions (${questions.length})`}
                  </button>
                ))}
              </div>

              {tab === "editor" && (
                <>
                  <label style={S.label}>Question</label>
                  <textarea className="inp" rows={3} placeholder="Type your question here…"
                    style={{ marginBottom: 14, fontSize: "0.875rem" }}
                    value={newQ.text} onChange={e => setNewQ(q => ({ ...q, text: e.target.value }))} />

                  {/* Difficulty */}
                  <label style={S.label}>Difficulty & Points</label>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    {(["easy", "medium", "hard"] as Difficulty[]).map(d => {
                      const c = DIFFICULTY_CONFIG[d]; const active = (newQ.difficulty || "easy") === d;
                      return (
                        <button key={d} onClick={() => setNewQ(q => ({ ...q, difficulty: d }))}
                          style={{
                            flex: 1, padding: "9px 4px", borderRadius: 9, cursor: "pointer", transition: "all 0.15s", border: `1.5px solid ${active ? c.color : "var(--border-hi)"}`,
                            background: active ? c.bg : "transparent", color: active ? c.color : "var(--text-3)",
                            fontSize: "0.76rem", fontWeight: 700, boxShadow: active ? `0 0 12px ${c.glow}` : "none"
                          }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? c.color : "currentColor", display: "inline-block" }} />
                            {c.label}
                          </div>
                          <div style={{ fontSize: "0.68rem", marginTop: 2, opacity: 0.75 }}>{c.pts} pt{c.pts > 1 ? "s" : ""}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Choices */}
                  <label style={S.label}>Answer Choices</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
                    {(["A", "B", "C", "D"] as AnswerKey[]).map(k => (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => setNewQ(q => ({ ...q, correctAnswer: k }))}
                          style={{
                            width: 30, height: 30, minWidth: 30, borderRadius: "50%", cursor: "pointer", transition: "all 0.15s",
                            border: `2px solid ${newQ.correctAnswer === k ? "var(--accent)" : "var(--border-hi)"}`,
                            background: newQ.correctAnswer === k ? "var(--accent-lo)" : "transparent",
                            fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "0.72rem",
                            color: newQ.correctAnswer === k ? "var(--accent)" : "var(--text-3)"
                          }}>
                          {k}
                        </button>
                        <input className="inp" style={{ padding: "8px 12px", fontSize: "0.83rem" }}
                          placeholder={`Choice ${k}`} value={newQ.choices[k]}
                          onChange={e => setNewQ(q => ({ ...q, choices: { ...q.choices, [k]: e.target.value } }))} />
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 7 }}>
                    <button className="btn btn-primary" style={{ flex: 1, fontSize: "0.83rem", padding: "10px" }}
                      onClick={addQuestion}
                      disabled={!newQ.text || !newQ.choices.A || !newQ.choices.B || !newQ.choices.C || !newQ.choices.D}>
                      {editIdx !== null ? "Save Changes" : "+ Add Question"}
                    </button>
                    {editIdx !== null && <button className="btn btn-ghost" style={{ fontSize: "0.83rem", padding: "10px 14px" }} onClick={cancelEdit}>Cancel</button>}
                  </div>
                </>
              )}

              {tab === "list" && (
                <>
                  {questions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-3)" }}>
                      <div style={{ fontSize: "2rem", marginBottom: 10 }}>📋</div>
                      <p style={{ fontSize: "0.84rem" }}>No questions yet</p>
                      <button className="btn btn-ghost" style={{ marginTop: 12, fontSize: "0.8rem" }} onClick={() => setTab("editor")}>Add first question</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 320, overflowY: "auto" }}>
                      {questions.map((q, i) => {
                        const dc = DIFFICULTY_CONFIG[q.difficulty || "easy"];
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)" }}>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.64rem", color: "var(--text-3)", flexShrink: 0, minWidth: 20 }}>{String(i + 1).padStart(2, "0")}</span>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: dc.color, flexShrink: 0 }} />
                            <span style={{ fontSize: "0.8rem", color: "var(--text-1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.text}</span>
                            <span style={{ fontSize: "0.62rem", fontWeight: 700, color: dc.color, flexShrink: 0 }}>{dc.pts}pt</span>
                            <button onClick={() => startEdit(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: "3px 5px", borderRadius: 5, fontSize: "0.78rem", flexShrink: 0 }}>✏️</button>
                            <button onClick={() => { setQuestions(p => p.filter((_, j) => j !== i)); if (editIdx === i) cancelEdit(); }}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", padding: "3px 5px", borderRadius: 5, fontSize: "0.78rem", flexShrink: 0 }}>✕</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Import section */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showImport ? 12 : 0 }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Import JSON</span>
                  <button className="btn btn-ghost btn-icon" style={{ fontSize: "0.75rem" }} onClick={() => { setShowImport(p => !p); setImportErr(""); setImportOk(false); }}>
                    {showImport ? "✕" : "↓"}
                  </button>
                </div>
                {showImport && (
                  <div className="anim-up">
                    <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: 8 }}>
                      Paste JSON or upload a file. Format: array of {`{text, choices:{A,B,C,D}, correctAnswer, difficulty}`}
                    </p>
                    <textarea className="inp" rows={4} placeholder={`[\n  {\n    "text": "Question?",\n    "choices": {"A":"...","B":"...","C":"...","D":"..."},\n    "correctAnswer": "A",\n    "difficulty": "easy"\n  }\n]`}
                      value={importText} onChange={e => { setImportText(e.target.value); setImportErr(""); }}
                      style={{ marginBottom: 8, fontSize: "0.75rem", fontFamily: "'JetBrains Mono',monospace" }} />
                    <div style={{ display: "flex", gap: 7 }}>
                      <button className="btn btn-ghost" style={{ fontSize: "0.78rem", padding: "8px 12px" }} onClick={() => fileRef.current?.click()}>
                        📂 File
                      </button>
                      <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImportFile} />
                      <button className="btn btn-primary" style={{ flex: 1, fontSize: "0.78rem", padding: "8px" }}
                        disabled={!importText.trim()} onClick={doImport}>
                        {importOk ? "✓ Imported!" : "Import Questions"}
                      </button>
                    </div>
                    {importErr && <p style={{ fontSize: "0.72rem", color: "#f87171", marginTop: 6 }}>⚠ {importErr}</p>}
                  </div>
                )}
              </div>

              {/* Timer */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <label style={S.label}>Time per question</label>
                <div style={{ display: "flex", gap: 5 }}>
                  {[10, 15, 20, 30, 45].map(t => (
                    <button key={t} onClick={() => setTimeLimit(t)}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                        border: `1px solid ${timeLimit === t ? "var(--accent)" : "var(--border-hi)"}`,
                        background: timeLimit === t ? "var(--accent-lo)" : "transparent",
                        color: timeLimit === t ? "var(--accent-hi)" : "var(--text-3)",
                        fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "0.74rem"
                      }}>
                      {t}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Players + Start */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="card anim-up-1" style={{ padding: "clamp(16px,4vw,20px)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-2)", letterSpacing: "0.07em", textTransform: "uppercase" }}>Players</span>
                  <span className="badge">{teams.length} joined</span>
                </div>
                {teams.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <div className="dots" style={{ justifyContent: "center", marginBottom: 8 }}><span /><span /><span /></div>
                    <p style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>Waiting for players…</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {teams.map((t, i) => (
                      <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: 9, background: "var(--bg)", border: "1px solid var(--border)" }}>
                        <div style={{ width: 7, height: 7, minWidth: 7, borderRadius: "50%", background: TEAM_COLORS[i % TEAM_COLORS.length] }} />
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-3)", fontFamily: "'JetBrains Mono',monospace" }}>{scores[t] || 0}pt</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Question summary */}
              {questions.length > 0 && (
                <div className="card anim-up-2" style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-2)", fontWeight: 600 }}>{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["easy", "medium", "hard"] as Difficulty[]).map(d => {
                        const n = questions.filter(q => (q.difficulty || "easy") === d).length;
                        if (!n) return null;
                        const c = DIFFICULTY_CONFIG[d];
                        return <span key={d} style={{ fontSize: "0.68rem", fontWeight: 700, color: c.color }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color, display: "inline-block", marginRight: 4 }} />{n}</span>;
                      })}
                    </div>
                  </div>
                </div>
              )}

              <button className="btn btn-primary anim-up-3" style={{ width: "100%", padding: "14px", fontSize: "0.92rem" }}
                disabled={questions.length === 0 || teams.length === 0}
                onClick={() => startQuestion(0, Object.fromEntries(teams.map(t => [t, 0])))}>
                {questions.length === 0 ? "Add questions to start" : teams.length === 0 ? "Waiting for players…" : "▶ Start Game"}
              </button>
            </div>
          </div>
        )}

        {/* ── QUESTION ─────────────────────────────────────── */}
        {phase === "question" && currentQ && (
          <div className="card anim-scale" style={{ padding: "clamp(18px,4vw,26px)", borderColor: diffCfg.border, boxShadow: `0 0 28px ${diffCfg.glow}` }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="badge">{String(qIdx + 1).padStart(2, "0")}/{questions.length}</span>
                <span style={{ padding: "3px 9px", borderRadius: 100, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: diffCfg.bg, color: diffCfg.color, border: `1px solid ${diffCfg.border}` }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: diffCfg.color, display: "inline-block", marginRight: 4 }} />
                  {diffCfg.label} · {diffCfg.pts}pt{diffCfg.pts > 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="badge badge-neutral">{answeredTeams.length}/{teams.length} answered</span>
                {/* Pause button */}
                <button className={`btn ${paused ? "btn-primary" : "btn-ghost"} btn-icon`}
                  style={{ fontSize: "0.85rem", padding: "7px 10px" }}
                  onClick={togglePause} title={paused ? "Resume" : "Pause"}>
                  {paused ? "▶" : "⏸"}
                </button>
              </div>
            </div>

            {/* Timer */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div className={timer <= 5 && !paused ? "timer-warn" : ""} style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, fontSize: "clamp(1.8rem,6vw,2.6rem)", color: paused ? "var(--text-2)" : timer <= 5 ? "#f87171" : diffCfg.color, lineHeight: 1, minWidth: "2.5rem", textAlign: "center" }}>
                {paused ? <span style={{ fontSize: "1.2rem" }}>⏸</span> : timer}
              </div>
              <div style={{ flex: 1 }}>
                <div className="timer-bar">
                  <div className="timer-fill" style={{ width: `${(timer / timeLimit) * 100}%`, background: paused ? "var(--text-3)" : timer <= 5 ? "#f87171" : diffCfg.color, transition: paused ? "none" : "width 0.92s linear" }} />
                </div>
                {paused && <p style={{ fontSize: "0.7rem", color: "var(--text-3)", marginTop: 4, fontWeight: 600 }}>PAUSED — players are waiting</p>}
              </div>
            </div>

            {/* Question text */}
            <p style={{ fontWeight: 700, fontSize: "clamp(1rem,2.5vw,1.25rem)", color: "var(--text-1)", textAlign: "center", marginBottom: 16, lineHeight: 1.5 }}>
              {currentQ.text}
            </p>

            {/* Choices */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,210px),1fr))", gap: 7, marginBottom: 16 }}>
              {(["A", "B", "C", "D"] as AnswerKey[]).map(k => (
                <div key={k} style={{ padding: "10px 13px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", fontWeight: 700, color: "var(--text-3)", flexShrink: 0, marginTop: 1 }}>{k}</span>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-1)", lineHeight: 1.4 }}>{currentQ.choices[k]}</span>
                </div>
              ))}
            </div>

            {/* Answered player cards */}
            {teams.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 16 }}>
                {teams.map((t, i) => {
                  const answered = answeredTeams.includes(t);
                  const initials = t.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <div key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all 0.25s" }}>
                      <div style={{ position: "relative", width: 44, height: 44 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 14,
                          background: answered ? "var(--accent-lo)" : "var(--surface-2)",
                          border: `2px solid ${answered ? "var(--accent)" : "var(--border)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 800, fontSize: "0.82rem", letterSpacing: "-0.01em",
                          color: answered ? "var(--accent-hi)" : "var(--text-3)",
                          boxShadow: answered ? "0 0 12px rgba(99,211,142,0.25)" : "none",
                          transition: "all 0.25s",
                          opacity: answered ? 1 : 0.5,
                        }}>
                          {initials}
                        </div>
                        {answered && (
                          <div style={{
                            position: "absolute", bottom: -4, right: -4,
                            width: 18, height: 18, borderRadius: "50%",
                            background: "var(--accent)", border: "2px solid var(--bg)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.55rem", color: "#0a1a12", fontWeight: 900,
                          }}>✓</div>
                        )}
                      </div>
                      <span style={{
                        fontSize: "0.62rem", fontWeight: 600, maxWidth: 52,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        color: answered ? "var(--accent-hi)" : "var(--text-3)",
                        transition: "color 0.25s",
                      }}>{t}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", gap: 7, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-ghost" style={{ fontSize: "0.82rem" }}
                onClick={() => { clearTimer(); setPaused(false); pausedRef.current = false; stopMusic(); goToReveal(pendingRef.current, scoresRef.current, qIdx); }}>
                Skip to Reveal
              </button>
              <button className="btn btn-danger" style={{ fontSize: "0.82rem" }}
                onClick={() => { clearTimer(); stopMusic(); setPhase("game_over"); broadcast(`quiz-${roomCode}`, "game:state", { phase: "game_over", currentQuestion: null, questionIndex: qIdx, totalQuestions: questions.length, timeLimit, timerValue: 0, scores, roundScores, teams, correctAnswer: null, answeredTeams }); }}>
                End Game
              </button>
            </div>
          </div>
        )}

        {/* ── REVEAL ───────────────────────────────────────── */}
        {phase === "reveal" && (
          <div className="card anim-scale" style={{ padding: "clamp(28px,5vw,44px) clamp(20px,5vw,28px)", textAlign: "center", borderColor: diffCfg.border, boxShadow: `0 0 36px ${diffCfg.glow}` }}>
            <div className="dots" style={{ justifyContent: "center", marginBottom: 18 }}><span /><span /><span /></div>
            <p style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-1)" }}>Revealing answer…</p>
            <p style={{ color: "var(--text-3)", fontSize: "0.8rem", marginTop: 5 }}>Hold on…</p>
          </div>
        )}

        {/* ── ANSWER ───────────────────────────────────────── */}
        {phase === "answer" && currentQ && (
          <div className="card anim-scale" style={{ padding: "clamp(24px,5vw,40px) clamp(18px,5vw,28px)", textAlign: "center", borderColor: diffCfg.border, boxShadow: `0 0 36px ${diffCfg.glow}` }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-2)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>Correct Answer</p>
            <div className="anim-scale" style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, fontSize: "clamp(2.5rem,8vw,3.5rem)", color: diffCfg.color, marginBottom: 4 }}>
              {currentQ.correctAnswer}
            </div>
            <p style={{ fontWeight: 700, color: "var(--text-1)", fontSize: "1rem", marginBottom: 22 }}>{currentQ.choices[currentQ.correctAnswer]}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 7 }}>
              {teams.map(t => (
                <div key={t} className="rank-row" style={{ padding: "10px 13px" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{t}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: (roundScores[t] || 0) > 0 ? diffCfg.color : "var(--text-3)", fontSize: "0.82rem", flexShrink: 0 }}>
                    {(roundScores[t] || 0) > 0 ? `+${roundScores[t]}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LEADERBOARD ──────────────────────────────────── */}
        {phase === "leaderboard" && (
          <div className="card anim-scale" style={{ padding: "clamp(18px,4vw,26px)", maxWidth: 460, margin: "0 auto" }}>
            <p style={{ fontWeight: 800, fontSize: "1.05rem", textAlign: "center", marginBottom: 16, color: "var(--text-1)", letterSpacing: "-0.02em" }}>Leaderboard</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
              {[...teams].sort((a, b) => (scores[b] || 0) - (scores[a] || 0)).map((t, i) => (
                <div key={t} className={`rank-row${i === 0 ? " rank-1" : ""}`} style={{ transition: "all 0.3s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: i < 3 ? "1rem" : "0.8rem", minWidth: "1.4rem", textAlign: "center", flexShrink: 0 }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</span>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "var(--text-1)", fontSize: "0.9rem" }}>{scores[t] || 0}</div>
                    {(roundScores[t] || 0) > 0 && <div style={{ fontSize: "0.68rem", color: "var(--accent)", fontWeight: 700 }}>+{roundScores[t]}</div>}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: "100%", padding: "13px", fontSize: "0.92rem" }} onClick={handleNext}>
              {qIdx + 1 >= questions.length ? "End Game →" : "Next Question →"}
            </button>
          </div>
        )}

      </div>
    </main>
  );
}