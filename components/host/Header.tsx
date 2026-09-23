"use client";
import { useEffect, useState } from "react";
import { Phase } from "@/lib/types";

const PHASE_LABELS: Record<Phase, string> = {
  waiting: "Setup",
  question: "Live",
  reveal: "Reveal",
  answer: "Answer",
  leaderboard: "Scores",
  game_over: "Done",
};

const HIDE_AFTER_PX = 64;
const SCROLL_THRESHOLD_PX = 5;

interface Props {
  roomCode: string;
  phase: Phase;
  playerCount: number;
}

export function Header({ roomCode, phase, playerCount }: Props) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let frame = 0;

    function update() {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastScrollY;
      if (Math.abs(delta) < SCROLL_THRESHOLD_PX) return;
      setHidden(delta > 0 && y > HIDE_AFTER_PX);
      lastScrollY = y;
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const up = !hidden;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${up ? "translate-y-0" : "-translate-y-full"}`}
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)", padding: "10px clamp(12px,3vw,18px)" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-1)" }}>QuizLive</span>
            <span className="mono" style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--accent-hi)", background: "var(--accent-lo)", border: "1px solid var(--border-em)", borderRadius: 8, padding: "3px 9px", letterSpacing: "0.1em" }}>{roomCode}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="badge">{PHASE_LABELS[phase]}</span>
            {phase === "question" && <span className="badge badge-neutral">{playerCount} players</span>}
          </div>
        </div>
      </header>
      <div aria-hidden style={{ height: 48 }} />
    </>
  );
}
