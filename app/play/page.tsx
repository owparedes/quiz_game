"use client";
import { useState, useRef } from "react";
import { GameState, AnswerKey, DIFFICULTY_CONFIG } from "@/lib/gameTypes";
import { pusherClient } from "@/lib/pusher";
import {
  initAudio, playCorrect, playWrong, playRevealMusic, playWinnerMusic,
  startLeaderboardMusic, startQuestionLoop, updateQuestionUrgency,
  setDifficulty, playCountdownBeep, stopMusic
} from "@/lib/sounds";

async function broadcast(channel: string, event: string, data: any) {
  await fetch("/api/pusher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, event, data }) });
}

const ANS_COLORS: Record<AnswerKey, string> = { A: "ans-a", B: "ans-b", C: "ans-c", D: "ans-d" };
const ANS_KEY_COLORS: Record<AnswerKey, string> = { A: "#93c5fd", B: "#fde047", C: "#fca5a5", D: "#d8b4fe" };

function spawnConfetti() {
  const colors = ["#63d38e", "#86efab", "#60a5fa", "#fbbf24", "#f87171", "#a78bfa", "#34d399"];
  for (let i = 0; i < 90; i++) {
    const el = document.createElement("div");
    el.className = "confetti-piece";
    el.style.cssText = `left:${Math.random() * 100}vw;top:-12px;background:${colors[Math.floor(Math.random() * colors.length)]};border-radius:${Math.random() > .5 ? "50%" : "3px"};width:${6 + Math.random() * 6}px;height:${6 + Math.random() * 6}px;animation-duration:${2.5 + Math.random() * 2.5}s;animation-delay:${Math.random() * 1.2}s;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 6000);
  }
}

export default function PlayPage() {
  const [roomCode, setRoomCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myAnswer, setMyAnswer] = useState<AnswerKey | null>(null);
  const [myPoints, setMyPoints] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);
  const [paused, setPaused] = useState(false);

  const channelRef = useRef<any>(null);
  const audioRef = useRef(false);
  const prevPhaseRef = useRef("");
  const countKeyRef = useRef(0);
  const prevTimerRef = useRef(0);
  const timeLimitRef = useRef(20);

  const initAudioOnce = () => { if (!audioRef.current) { initAudio(); audioRef.current = true; } };

  const joinGame = async () => {
    initAudioOnce();
    if (!roomCode || !teamName) return;
    setError("");
    const ch = pusherClient.subscribe(`quiz-${roomCode}`);
    channelRef.current = ch;
    ch.bind("pusher:subscription_error", () => setError("Cannot connect. Check the room code."));

    ch.bind("game:state", (state: GameState) => {
      // Always update state when received (handles late joins and resyncs)
      const prev = prevPhaseRef.current;
      const cur = state.phase;
      timeLimitRef.current = state.timeLimit;

      if (cur === "answer" && prev !== "answer") {
        setMyAnswer(ans => {
          const isCorrect = ans !== null && ans === state.correctAnswer;
          if (isCorrect) { setMyPoints(state.roundScores[teamName] || 0); playCorrect(); }
          else { setMyPoints(0); playWrong(); }
          return ans;
        });
      }
      if (cur === "reveal" && prev !== "reveal") { stopMusic(); playRevealMusic(); }
      if (cur === "leaderboard" && prev !== "leaderboard") {
        const sorted = [...state.teams].sort((a, b) => (state.scores[b] || 0) - (state.scores[a] || 0));
        startLeaderboardMusic(sorted[0] === teamName);
      }
      if (cur === "game_over" && prev !== "game_over") {
        const sorted = [...state.teams].sort((a, b) => (state.scores[b] || 0) - (state.scores[a] || 0));
        if (sorted[0] === teamName) { spawnConfetti(); playWinnerMusic(); }
        else stopMusic();
      }
      if (cur === "question" && (prev === "leaderboard" || prev === "game_over" || prev === "")) {
        setMyAnswer(null);
        setShowCountdown(true); countKeyRef.current++;
        setCountdown(3); let c = 3;
        const diff = state.currentQuestion?.difficulty || "easy";
        setDifficulty(diff);
        playCountdownBeep(3);
        const iv = setInterval(() => {
          c -= 1; setCountdown(c);
          playCountdownBeep(c);
          if (c <= 0) { clearInterval(iv); setShowCountdown(false); startQuestionLoop(0); }
        }, 1000);
      }
      if (cur === "question" && prev === "question") {
        // urgency update only
      }
      if (cur === "question" && prev !== "question" && prev !== "leaderboard" && prev !== "" && prev !== "game_over") {
        setMyAnswer(null);
      }
      setPaused(state.timerPaused || false);
      prevPhaseRef.current = cur;
      setGameState(state);
    });

    ch.bind("game:timer", (data: { value: number; paused: boolean }) => {
      setPaused(data.paused);
      if (!data.paused) {
        const urgency = 1 - data.value / timeLimitRef.current;
        if (urgency > 0.55) updateQuestionUrgency(urgency);
        if (data.value <= 5 && data.value > 0 && data.value !== prevTimerRef.current) {
          // urgent handled by sound system
        }
        prevTimerRef.current = data.value;
      }
      setGameState(prev => prev ? { ...prev, timerValue: data.value, timerPaused: data.paused } : prev);
    });

    // Wait for subscription to be confirmed before announcing join
    // This prevents the race condition where the host's game:state reply
    // arrives before our event handlers are bound
    ch.bind("pusher:subscription_succeeded", async () => {
      setJoined(true);
      await broadcast(`quiz-${roomCode}`, "player:join", { teamName });
    });

    // Fallback: if subscription_succeeded never fires (some Pusher configs),
    // still join after a short delay
    setTimeout(async () => {
      setJoined(prev => {
        if (!prev) {
          broadcast(`quiz-${roomCode}`, "player:join", { teamName });
          return true;
        }
        return prev;
      });
    }, 800);
  };

  const submitAnswer = async (answer: AnswerKey) => {
    if (myAnswer || paused) return;
    initAudioOnce();
    setMyAnswer(answer);
    await broadcast(`quiz-${roomCode}`, "player:answer", { teamName, answer, timeRemaining: gameState?.timerValue || 0 });
  };

  const S = {
    label: { display: "block" as const, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-2)", marginBottom: 7, letterSpacing: "0.07em", textTransform: "uppercase" as const },
  };

  // ── Join ──────────────────────────────────────────────────────────────────
  if (!joined) return (
    <main style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}>
      <div className="card card-em anim-up" style={{ width: "100%", maxWidth: 360, padding: "clamp(28px,6vw,40px) clamp(22px,5vw,32px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--accent-lo)", border: "1px solid var(--border-em)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="var(--accent)" strokeWidth="2" />
              <path d="M10 8l6 4-6 4V8z" fill="var(--accent)" />
            </svg>
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-1)", letterSpacing: "-0.02em" }}>Join a Game</p>
            <p style={{ fontSize: "0.76rem", color: "var(--text-3)", marginTop: 2 }}>Enter your details to play</p>
          </div>
        </div>
        {error && (
          <div className="anim-scale" style={{ marginBottom: 14, padding: "11px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p style={{ fontSize: "0.8rem", color: "#fca5a5", fontWeight: 500 }}>{error}</p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={S.label}>Room Code</label>
            <input className="inp inp-mono" placeholder="ROOM CODE" value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())} maxLength={12} autoComplete="off" spellCheck={false} />
          </div>
          <div>
            <label style={S.label}>Your Name / Team</label>
            <input className="inp" placeholder="e.g. Team Alpha" value={teamName}
              onChange={e => setTeamName(e.target.value)} onKeyDown={e => e.key === "Enter" && joinGame()} />
          </div>
          <button className="btn btn-primary" style={{ width: "100%", padding: "12px", fontSize: "0.92rem" }}
            disabled={!roomCode || !teamName} onClick={joinGame}>
            Join Game →
          </button>
        </div>
      </div>
    </main>
  );

  // ── Waiting ───────────────────────────────────────────────────────────────
  if (!gameState || gameState.phase === "waiting") return (
    <main style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center" }}>
      <div className="anim-up">
        <div className="pulse-ring" style={{ width: 60, height: 60, borderRadius: 18, background: "var(--accent-lo)", border: "1px solid var(--border-em)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="var(--accent)" strokeWidth="1.5" />
            <path d="M12 7v5l3 3" stroke="var(--accent-hi)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <p style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--text-1)", marginBottom: 4 }}>Waiting for host</p>
        <p style={{ color: "var(--text-3)", fontSize: "0.82rem", marginBottom: 4 }}>Room</p>
        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "1.1rem", color: "var(--accent-hi)", marginBottom: 24, letterSpacing: "0.1em" }}>{roomCode}</p>
        {(gameState?.teams || []).length > 0 && (
          <div className="card" style={{ width: "100%", maxWidth: 280, padding: "16px 18px", textAlign: "left", margin: "0 auto" }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Players ({gameState?.teams?.length})</p>
            <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {(gameState?.teams || []).map(t => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 9, background: t === teamName ? "var(--accent-lo)" : "var(--bg)", border: `1px solid ${t === teamName ? "var(--border-em)" : "var(--border)"}` }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: t === teamName ? "var(--accent)" : "var(--text-3)", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.84rem", fontWeight: t === teamName ? 700 : 500, color: t === teamName ? "var(--accent-hi)" : "var(--text-1)" }}>{t}</span>
                  {t === teamName && <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--text-3)", fontWeight: 600 }}>you</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="dots" style={{ justifyContent: "center", marginTop: 22 }}><span /><span /><span /></div>
      </div>
    </main>
  );

  // ── Countdown ─────────────────────────────────────────────────────────────
  if (showCountdown) return (
    <main style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-3)", textTransform: "uppercase", marginBottom: 14 }}>Get Ready</p>
      <div key={`${countKeyRef.current}-${countdown}`} className="anim-count"
        style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: "clamp(6rem,24vw,10rem)", color: "var(--accent)", lineHeight: 1, letterSpacing: "-0.05em" }}>
        {countdown > 0 ? countdown : "Go!"}
      </div>
      <p style={{ fontSize: "0.8rem", color: "var(--text-3)", marginTop: 16 }}>
        {gameState?.currentQuestion?.difficulty && (() => {
          const d = gameState.currentQuestion!.difficulty!;
          const c = DIFFICULTY_CONFIG[d];
          return <span style={{ color: c.color, fontWeight: 700 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, display: "inline-block", marginRight: 5 }} />{c.label} · {c.pts} pt{c.pts > 1 ? "s" : ""}</span>;
        })()}
      </p>
    </main>
  );

  // ── Question ──────────────────────────────────────────────────────────────
  if (gameState.phase === "question") {
    const pct = Math.max(0, (gameState.timerValue / gameState.timeLimit) * 100);
    const urgent = gameState.timerValue <= 5 && !paused;
    const diff = gameState.currentQuestion?.difficulty || "easy";
    const dc = DIFFICULTY_CONFIG[diff];
    return (
      <main style={{ minHeight: "100svh", display: "flex", flexDirection: "column", padding: "14px 14px 22px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span className="badge">{String(gameState.questionIndex + 1).padStart(2, "0")}/{gameState.totalQuestions}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {paused && <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: "0.64rem", fontWeight: 700, background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>PAUSED</span>}
            <div className={urgent ? "timer-warn" : ""} style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "1.5rem", color: paused ? "var(--text-2)" : urgent ? "#f87171" : dc.color, lineHeight: 1 }}>
              {paused ? "⏸" : gameState.timerValue}
            </div>
          </div>
          <span className="badge badge-neutral" style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teamName}</span>
        </div>

        {/* Timer bar */}
        <div className="timer-bar" style={{ marginBottom: 12 }}>
          <div className="timer-fill" style={{ width: `${pct}%`, background: paused ? "var(--text-3)" : urgent ? "#f87171" : dc.color, transition: paused ? "none" : "width 0.92s linear" }} />
        </div>

        {/* Difficulty tag */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", background: dc.bg, color: dc.color, border: `1px solid ${dc.border}` }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: dc.color, display: "inline-block", marginRight: 4 }} />{dc.label} · {dc.pts}pt{dc.pts > 1 ? "s" : ""}
          </span>
        </div>

        {/* Question card */}
        <div className="card" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 18px", marginBottom: 14, minHeight: 90, borderColor: urgent ? `rgba(248,113,113,0.2)` : "var(--border)" }}>
          <p style={{ fontWeight: 700, fontSize: "clamp(1rem,3.5vw,1.2rem)", color: "var(--text-1)", textAlign: "center", lineHeight: 1.5 }}>
            {gameState.currentQuestion?.text}
          </p>
        </div>

        {/* Answers or locked state */}
        {myAnswer ? (
          <div className="card anim-scale" style={{ padding: "24px 18px", textAlign: "center", borderColor: "var(--border-em)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: dc.bg, border: `1px solid ${dc.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "0.8rem", color: dc.color }}>{myAnswer}</div>
              <p style={{ fontWeight: 700, color: "var(--text-1)", fontSize: "0.95rem" }}>Locked in!</p>
            </div>
            <p style={{ color: "var(--text-3)", fontSize: "0.78rem" }}>Waiting for results…</p>
          </div>
        ) : gameState.timerValue === 0 && !paused ? (
          <div className="card" style={{ padding: "22px 18px", textAlign: "center" }}>
            <p style={{ fontWeight: 700, color: "#f87171", fontSize: "0.95rem" }}>Time&apos;s up!</p>
          </div>
        ) : paused ? (
          <div className="card" style={{ padding: "22px 18px", textAlign: "center", borderColor: "rgba(251,191,36,0.2)" }}>
            <div style={{ fontSize: "1.6rem", marginBottom: 8 }}>⏸</div>
            <p style={{ fontWeight: 700, color: "#fbbf24", fontSize: "0.92rem" }}>Game paused</p>
            <p style={{ color: "var(--text-3)", fontSize: "0.78rem", marginTop: 3 }}>Host will resume shortly</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(["A", "B", "C", "D"] as AnswerKey[]).map(k => (
              <button key={k} onClick={() => submitAnswer(k)} className={`ans-btn ${ANS_COLORS[k]}`} disabled={!!myAnswer}>
                <div className="ans-key" style={{ color: ANS_KEY_COLORS[k] }}>{k}</div>
                <span style={{ lineHeight: 1.35 }}>{gameState.currentQuestion?.choices[k]}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    );
  }

  // ── Reveal ────────────────────────────────────────────────────────────────
  if (gameState.phase === "reveal") return (
    <main style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center" }}>
      <div className="anim-scale">
        <div className="dots" style={{ justifyContent: "center", marginBottom: 20 }}><span /><span /><span /></div>
        <p style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-1)" }}>Revealing answer…</p>
        <p style={{ color: "var(--text-3)", fontSize: "0.8rem", marginTop: 5 }}>Just a moment</p>
      </div>
    </main>
  );

  // ── Answer Reveal ─────────────────────────────────────────────────────────
  if (gameState.phase === "answer") {
    const isCorrect = myAnswer !== null && myAnswer === gameState.correctAnswer;
    const correct = gameState.correctAnswer;
    const diff = gameState.currentQuestion?.difficulty || "easy";
    const dc = DIFFICULTY_CONFIG[diff];
    return (
      <main style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center", gap: 18 }}>
        <div className="anim-scale" style={{ fontSize: "3rem", lineHeight: 1 }}>{isCorrect ? "✅" : "❌"}</div>
        <div className="anim-up">
          <h2 style={{ fontWeight: 900, fontSize: "1.5rem", color: isCorrect ? "var(--accent-hi)" : "#f87171", letterSpacing: "-0.02em" }}>
            {isCorrect ? "Correct!" : myAnswer ? "Wrong" : "No answer"}
          </h2>
          {isCorrect && (
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "1.4rem", color: "#fbbf24", marginTop: 4 }}>
              +{myPoints} pt{myPoints !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="card anim-up-1" style={{ width: "100%", maxWidth: 320, padding: "18px 20px" }}>
          <p style={{ fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-2)", marginBottom: 8 }}>Correct Answer</p>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "2rem", color: dc.color, marginBottom: 4 }}>{correct}</div>
          <p style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "0.92rem" }}>{correct && gameState.currentQuestion?.choices[correct]}</p>
        </div>
        {myAnswer && !isCorrect && correct && (
          <p className="anim-up-2" style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>
            You answered: <span style={{ fontWeight: 700, color: "#fca5a5" }}>{myAnswer} — {gameState.currentQuestion?.choices[myAnswer]}</span>
          </p>
        )}
      </main>
    );
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────
  if (gameState.phase === "leaderboard") {
    const sorted = [...gameState.teams].sort((a, b) => (gameState.scores[b] || 0) - (gameState.scores[a] || 0));
    const myRank = sorted.indexOf(teamName) + 1;
    return (
      <main style={{ minHeight: "100svh", padding: "14px 14px 28px" }}>
        <div style={{ maxWidth: 360, margin: "0 auto" }}>
          <p className="anim-up" style={{ fontWeight: 800, fontSize: "1.15rem", textAlign: "center", marginBottom: 14, color: "var(--text-1)", letterSpacing: "-0.02em" }}>Leaderboard</p>
          {/* My rank card */}
          <div className="card card-em anim-scale" style={{ padding: "16px 18px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 2 }}>Your rank</p>
              <p style={{ fontWeight: 900, fontSize: "1.7rem", color: "var(--accent)", lineHeight: 1, letterSpacing: "-0.03em" }}>#{myRank}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "1.1rem", color: "var(--text-1)" }}>{gameState.scores[teamName] || 0}</p>
              <p style={{ fontSize: "0.7rem", color: "var(--text-3)", fontWeight: 500 }}>total pts</p>
              {(gameState.roundScores[teamName] || 0) > 0 && <p style={{ fontSize: "0.7rem", color: "var(--accent)", fontWeight: 700 }}>+{gameState.roundScores[teamName]} this round</p>}
            </div>
          </div>
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sorted.map((t, i) => (
              <div key={t} className={`rank-row${t === teamName ? " rank-row-me" : ""}${i === 0 ? " rank-1" : ""}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: i < 3 ? "1rem" : "0.78rem", fontWeight: 600, minWidth: "1.4rem", textAlign: "center", color: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#c47c4a" : "var(--text-3)" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "0.86rem", color: t === teamName ? "var(--accent-hi)" : "var(--text-1)" }}>{t}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "0.88rem", color: "var(--text-1)" }}>{gameState.scores[t] || 0}</div>
                  {gameState.roundScores[t] > 0 && <div style={{ fontSize: "0.66rem", color: "var(--accent)", fontWeight: 700 }}>+{gameState.roundScores[t]}</div>}
                </div>
              </div>
            ))}
          </div>
          <p className="anim-up-3" style={{ textAlign: "center", color: "var(--text-3)", fontSize: "0.76rem", marginTop: 16 }}>Next question coming up…</p>
        </div>
      </main>
    );
  }

  // ── Game Over ─────────────────────────────────────────────────────────────
  if (gameState.phase === "game_over") {
    const sorted = [...gameState.teams].sort((a, b) => (gameState.scores[b] || 0) - (gameState.scores[a] || 0));
    const isWinner = sorted[0] === teamName;
    return (
      <main style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center", gap: 18 }}>
        <div className="anim-float" style={{ fontSize: "3rem", lineHeight: 1 }}>{isWinner ? "🏆" : "🎯"}</div>
        <div className="anim-up">
          <h1 style={{ fontWeight: 900, fontSize: "clamp(1.5rem,6vw,2rem)", color: isWinner ? "var(--accent-hi)" : "var(--text-1)", letterSpacing: "-0.03em" }}>
            {isWinner ? "You Win! 🎉" : "Game Over"}
          </h1>
          <p style={{ color: "var(--text-3)", fontSize: "0.88rem", marginTop: 4 }}>
            🏆 <span style={{ color: "#fbbf24", fontWeight: 700 }}>{sorted[0]}</span> wins!
          </p>
        </div>
        <div className="card anim-up-1" style={{ width: "100%", maxWidth: 320, padding: "18px 20px" }}>
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sorted.map((t, i) => (
              <div key={t} className={`rank-row${t === teamName ? " rank-row-me" : ""}${i === 0 ? " rank-1" : ""}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-3)", minWidth: "1.4rem" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                  <span style={{ fontWeight: 600, fontSize: "0.86rem", color: t === teamName ? "var(--accent-hi)" : "var(--text-1)" }}>{t}</span>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#fbbf24", fontSize: "0.86rem" }}>{gameState.scores[t] || 0}</span>
              </div>
            ))}
          </div>
        </div>
        <button className="btn btn-primary anim-up-2" style={{ padding: "12px 28px" }} onClick={() => window.location.href = "/"}>Back to Home</button>
      </main>
    );
  }

  return null;
}