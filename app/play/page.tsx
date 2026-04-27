"use client";
import { useState, useEffect, useRef } from "react";
import { GameState, AnswerKey } from "@/lib/gameTypes";
import { pusherClient } from "@/lib/pusher";
import { initAudio, playCorrect, playWrong, playSuspense, playCelebration, playLeaderboard } from "@/lib/sounds";

async function broadcast(channel: string, event: string, data: any) {
  await fetch("/api/pusher", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel, event, data }),
  });
}

const ANS_COLORS: Record<AnswerKey, string> = { A: "ans-a", B: "ans-b", C: "ans-c", D: "ans-d" };

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
  const channelRef = useRef<any>(null);
  const audioInitRef = useRef(false);
  const prevPhaseRef = useRef<string>("");
  const countKeyRef = useRef(0);

  const initAudioOnce = () => {
    if (!audioInitRef.current) { initAudio(); audioInitRef.current = true; }
  };

  const spawnConfetti = () => {
    const colors = ["#22c55e", "#4ade80", "#86efac", "#a7f3d0", "#fcd34d", "#93c5fd", "#fca5a5"];
    for (let i = 0; i < 80; i++) {
      const el = document.createElement("div");
      el.className = "confetti-piece";
      el.style.left = Math.random() * 100 + "vw";
      el.style.top = "-10px";
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
      el.style.width = (6 + Math.random() * 6) + "px";
      el.style.height = (6 + Math.random() * 6) + "px";
      el.style.animationDuration = (2.5 + Math.random() * 2.5) + "s";
      el.style.animationDelay = (Math.random() * 1.5) + "s";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 6000);
    }
  };

  const joinGame = async () => {
    initAudioOnce();
    if (!roomCode || !teamName) return;
    setError("");
    const ch = pusherClient.subscribe(`quiz-${roomCode}`);
    channelRef.current = ch;

    ch.bind("pusher:subscription_error", () => setError("Cannot connect. Check the room code."));
    ch.bind("game:state", (state: GameState) => {
      const prev = prevPhaseRef.current;
      const cur = state.phase;
      if (cur === "answer" && prev !== "answer") {
        setMyAnswer(ans => {
          if (ans && state.correctAnswer && ans === state.correctAnswer) {
            setMyPoints(state.roundScores[teamName] || 0);
            playCorrect();
          } else { setMyPoints(0); playWrong(); }
          return ans;
        });
      }
      if (cur === "reveal" && prev !== "reveal") playSuspense();
      if (cur === "leaderboard" && prev !== "leaderboard") {
        const sorted = [...state.teams].sort((a, b) => (state.scores[b] || 0) - (state.scores[a] || 0));
        sorted[0] === teamName ? playCelebration() : playLeaderboard();
      }
      if (cur === "game_over" && prev !== "game_over") {
        const sorted = [...state.teams].sort((a, b) => (state.scores[b] || 0) - (state.scores[a] || 0));
        if (sorted[0] === teamName) spawnConfetti();
      }
      if (cur === "question" && prev === "leaderboard") {
        setMyAnswer(null);
        setShowCountdown(true);
        countKeyRef.current++;
        setCountdown(3);
        let c = 3;
        const iv = setInterval(() => {
          c -= 1; setCountdown(c);
          if (c <= 0) { clearInterval(iv); setShowCountdown(false); }
        }, 1000);
      }
      if (cur === "question" && prev !== "question" && prev !== "leaderboard") setMyAnswer(null);
      prevPhaseRef.current = cur;
      setGameState(state);
    });
    ch.bind("game:timer", (data: { value: number }) => {
      setGameState(prev => prev ? { ...prev, timerValue: data.value } : prev);
    });

    setJoined(true);

    // FIX: Use server-side broadcast instead of client-to-client trigger
    // This ensures the host always receives join events
    await broadcast(`quiz-${roomCode}`, "player:join", { teamName });
  };

  const submitAnswer = async (answer: AnswerKey) => {
    if (myAnswer) return;
    initAudioOnce();
    setMyAnswer(answer);
    // FIX: Use server-side broadcast for answers too
    await broadcast(`quiz-${roomCode}`, "player:answer", { teamName, answer, timeRemaining: gameState?.timerValue || 0 });
  };

  // ── Join screen ────────────────────────────────────────
  if (!joined) {
    return (
      <main className="min-h-screen flex items-center justify-center p-5">
        <div className="card card-em anim-up" style={{ width: "100%", maxWidth: 380, padding: "32px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="var(--accent)" strokeWidth="2" />
                <path d="M10 8l6 4-6 4V8z" fill="var(--accent)" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text-1)", letterSpacing: "-0.02em" }}>Join a Game</h1>
              <p style={{ fontSize: "0.78rem", color: "var(--text-3)", fontWeight: 500 }}>Enter your details to compete</p>
            </div>
          </div>

          {error && (
            <div className="anim-scale" style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <p style={{ fontSize: "0.82rem", color: "#fca5a5", fontWeight: 500 }}>{error}</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-2)", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Room Code</label>
              <input className="inp inp-mono" placeholder="ROOM CODE" value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())} maxLength={12} autoComplete="off" spellCheck={false} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-2)", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Team Name</label>
              <input className="inp" placeholder="e.g. Team Alpha" value={teamName}
                onChange={e => setTeamName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && joinGame()} />
            </div>
            <button className="btn btn-primary" style={{ width: "100%", padding: "13px", fontSize: "0.95rem" }}
              disabled={!roomCode || !teamName} onClick={joinGame}>
              Join Game →
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Waiting ────────────────────────────────────────────
  if (!gameState || gameState.phase === "waiting") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-5 text-center">
        <div className="anim-up">
          <div className="pulse-glow" style={{ width: 64, height: 64, borderRadius: 20, background: "var(--accent-lo)", border: "1px solid var(--border-em)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="var(--accent)" strokeWidth="1.5" />
              <path d="M12 7v5l3 3" stroke="var(--accent-hi)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 style={{ fontWeight: 800, fontSize: "1.25rem", color: "var(--text-1)", marginBottom: 6 }}>Waiting for host</h2>
          <p style={{ color: "var(--text-3)", fontSize: "0.85rem", marginBottom: 4, fontWeight: 500 }}>Room</p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "1.15rem", color: "var(--accent-hi)", marginBottom: 28, letterSpacing: "0.1em" }}>{roomCode}</p>

          {(gameState?.teams || []).length > 0 && (
            <div className="card" style={{ width: "100%", maxWidth: 300, padding: "18px 20px", textAlign: "left" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Players ({(gameState?.teams || []).length})
              </p>
              <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(gameState?.teams || []).map(t => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: t === teamName ? "var(--accent-lo)" : "var(--bg)", border: `1px solid ${t === teamName ? "var(--border-em)" : "var(--border)"}` }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: t === teamName ? "var(--accent)" : "var(--text-3)", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.875rem", fontWeight: t === teamName ? 700 : 500, color: t === teamName ? "var(--accent-hi)" : "var(--text-1)" }}>{t}</span>
                    {t === teamName && <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "var(--text-3)", fontWeight: 600 }}>you</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dots" style={{ justifyContent: "center", marginTop: 24 }}><span /><span /><span /></div>
        </div>
      </main>
    );
  }

  // ── Countdown ──────────────────────────────────────────
  if (showCountdown) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-center">
        <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-3)", textTransform: "uppercase", marginBottom: 16 }}>Get Ready</p>
        <div key={countKeyRef.current + "-" + countdown} className="anim-count"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: "clamp(6rem,25vw,10rem)", color: "var(--accent)", lineHeight: 1, letterSpacing: "-0.05em" }}>
          {countdown > 0 ? countdown : "Go!"}
        </div>
      </main>
    );
  }

  // ── Question ───────────────────────────────────────────
  if (gameState.phase === "question") {
    const pct = Math.max(0, (gameState.timerValue / gameState.timeLimit) * 100);
    const isUrgent = gameState.timerValue <= 5;
    return (
      <main className="min-h-screen flex flex-col p-4 pb-6">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span className="badge">Q{gameState.questionIndex + 1} / {gameState.totalQuestions}</span>
          <div className={isUrgent ? "timer-warn" : ""} style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "1.6rem", color: isUrgent ? "#f87171" : "var(--accent)", lineHeight: 1 }}>
            {gameState.timerValue}
          </div>
          <span className="badge">{teamName}</span>
        </div>

        <div className="timer-bar" style={{ marginBottom: 16 }}>
          <div className="timer-fill" style={{ width: `${pct}%`, background: isUrgent ? "#f87171" : "var(--accent)" }} />
        </div>

        <div className="card" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px", marginBottom: 16, minHeight: 110 }}>
          <p style={{ fontWeight: 700, fontSize: "clamp(1rem,3.5vw,1.25rem)", color: "var(--text-1)", textAlign: "center", lineHeight: 1.45 }}>
            {gameState.currentQuestion?.text}
          </p>
        </div>

        {myAnswer ? (
          <div className="card anim-scale" style={{ padding: "28px 20px", textAlign: "center", borderColor: "var(--border-em)" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>⏳</div>
            <p style={{ fontWeight: 700, color: "var(--text-1)", fontSize: "0.95rem" }}>Answer locked in!</p>
            <p style={{ color: "var(--text-3)", fontSize: "0.8rem", marginTop: 4 }}>Waiting for results…</p>
          </div>
        ) : gameState.timerValue === 0 ? (
          <div className="card" style={{ padding: "24px 20px", textAlign: "center" }}>
            <p style={{ fontWeight: 700, color: "#f87171" }}>Time&apos;s up!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(["A", "B", "C", "D"] as AnswerKey[]).map(k => (
              <button key={k} onClick={() => submitAnswer(k)} className={`ans-btn ${ANS_COLORS[k]}`} disabled={!!myAnswer}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "0.78rem", flexShrink: 0, opacity: 0.7 }}>{k}</span>
                <span style={{ lineHeight: 1.3 }}>{gameState.currentQuestion?.choices[k]}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    );
  }

  // ── Reveal ─────────────────────────────────────────────
  if (gameState.phase === "reveal") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-5 text-center">
        <div className="anim-scale">
          <div className="dots" style={{ justifyContent: "center", marginBottom: 20 }}><span /><span /><span /></div>
          <p style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-1)" }}>Revealing answer…</p>
          <p style={{ color: "var(--text-3)", fontSize: "0.82rem", marginTop: 6 }}>Just a moment</p>
        </div>
      </main>
    );
  }

  // ── Answer reveal ──────────────────────────────────────
  if (gameState.phase === "answer") {
    const isCorrect = myAnswer !== null && myAnswer === gameState.correctAnswer;
    const correct = gameState.correctAnswer;
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-5 text-center gap-5">
        <div className="anim-scale" style={{ fontSize: "3.5rem", lineHeight: 1 }}>
          {isCorrect ? "✅" : "❌"}
        </div>
        <div className="anim-up">
          <h2 style={{ fontWeight: 800, fontSize: "1.5rem", color: isCorrect ? "var(--accent-hi)" : "#f87171", letterSpacing: "-0.02em" }}>
            {isCorrect ? "Correct!" : myAnswer ? "Wrong answer" : "No answer"}
          </h2>
          {isCorrect && (
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "1.4rem", color: "#fcd34d", marginTop: 4 }}>
              +{myPoints} pts
            </p>
          )}
        </div>

        <div className="card anim-up-1" style={{ width: "100%", maxWidth: 340, padding: "20px 22px" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-2)", marginBottom: 8 }}>Correct Answer</p>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "2rem", color: "var(--accent)", marginBottom: 4 }}>{correct}</div>
          <p style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "0.95rem" }}>{correct && gameState.currentQuestion?.choices[correct]}</p>
        </div>

        {myAnswer && !isCorrect && correct && (
          <p className="anim-up-2" style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>
            You answered: <span style={{ fontWeight: 700, color: "#fca5a5" }}>{myAnswer} — {gameState.currentQuestion?.choices[myAnswer]}</span>
          </p>
        )}
      </main>
    );
  }

  // ── Leaderboard ────────────────────────────────────────
  if (gameState.phase === "leaderboard") {
    const sorted = [...gameState.teams].sort((a, b) => (gameState.scores[b] || 0) - (gameState.scores[a] || 0));
    const myRank = sorted.indexOf(teamName) + 1;
    return (
      <main className="min-h-screen p-4 pb-8">
        <div style={{ maxWidth: 380, margin: "0 auto" }}>
          <h2 className="anim-up" style={{ fontWeight: 800, fontSize: "1.25rem", textAlign: "center", marginBottom: 16, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
            Leaderboard
          </h2>

          <div className="card card-em anim-scale" style={{ padding: "18px 20px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 2 }}>Your rank</p>
              <p style={{ fontWeight: 900, fontSize: "1.6rem", color: "var(--accent)", lineHeight: 1, letterSpacing: "-0.03em" }}>#{myRank}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "1.15rem", color: "var(--text-1)" }}>{gameState.scores[teamName] || 0}</p>
              <p style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 500 }}>total pts</p>
            </div>
          </div>

          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.map((t, i) => (
              <div key={t} className={`rank-row${t === teamName ? " rank-row-me" : ""}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: i < 3 ? "1.05rem" : "0.82rem", fontWeight: 600, minWidth: "1.4rem", textAlign: "center", color: i < 3 ? "#fcd34d" : "var(--text-3)" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "0.88rem", color: t === teamName ? "var(--accent-hi)" : "var(--text-1)" }}>{t}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "0.9rem", color: "var(--text-1)" }}>{gameState.scores[t] || 0}</div>
                  {gameState.roundScores[t] > 0 && <div style={{ fontSize: "0.7rem", color: "var(--accent)", fontWeight: 600 }}>+{gameState.roundScores[t]}</div>}
                </div>
              </div>
            ))}
          </div>

          <p className="anim-up-3" style={{ textAlign: "center", color: "var(--text-3)", fontSize: "0.78rem", marginTop: 18 }}>
            Next question incoming…
          </p>
        </div>
      </main>
    );
  }

  // ── Game over ──────────────────────────────────────────
  if (gameState.phase === "game_over") {
    const sorted = [...gameState.teams].sort((a, b) => (gameState.scores[b] || 0) - (gameState.scores[a] || 0));
    const isWinner = sorted[0] === teamName;
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-5 text-center gap-5">
        <div className="anim-scale" style={{ fontSize: "3rem" }}>{isWinner ? "🏆" : "🎯"}</div>
        <div className="anim-up">
          <h1 style={{ fontWeight: 900, fontSize: "clamp(1.5rem,6vw,2rem)", color: isWinner ? "var(--accent-hi)" : "var(--text-1)", letterSpacing: "-0.03em" }}>
            {isWinner ? "You Win!" : "Game Over"}
          </h1>
          <p style={{ color: "var(--text-3)", fontSize: "0.875rem", marginTop: 4 }}>
            🏆 <span style={{ color: "#fcd34d", fontWeight: 700 }}>{sorted[0]}</span> wins the game
          </p>
        </div>

        <div className="card anim-up-1" style={{ width: "100%", maxWidth: 340, padding: "20px 22px" }}>
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.map((t, i) => (
              <div key={t} className={`rank-row${t === teamName ? " rank-row-me" : ""}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-3)", minWidth: "1.4rem" }}>{i + 1}.</span>
                  <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{t}</span>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#fcd34d", fontSize: "0.88rem" }}>{gameState.scores[t] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-primary anim-up-2" style={{ padding: "13px 32px" }} onClick={() => window.location.href = "/"}>
          Back to Home
        </button>
      </main>
    );
  }

  return null;
}