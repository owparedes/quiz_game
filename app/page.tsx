"use client";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "clamp(20px,5vw,40px) 16px" }}>
      <div className="anim-up" style={{ textAlign: "center", marginBottom: "clamp(32px,7vw,52px)" }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--accent-lo)", border: "1.5px solid var(--border-em)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", overflow: "hidden" }}>
          <Image src="/sga.png" alt="SGA Logo" width={46} height={46} style={{ objectFit: "contain" }} />
        </div>
        <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: "clamp(2rem,7vw,2.8rem)", letterSpacing: "-0.04em", color: "var(--text-1)", lineHeight: 1, marginBottom: 8 }}>
          Quiz<span style={{ color: "var(--accent)" }}>Live</span>
        </h1>
        <p style={{ color: "var(--text-3)", fontSize: "clamp(0.8rem,2.5vw,0.9rem)", fontWeight: 500 }}>Real-time multiplayer quizzes</p>
      </div>
      <div className="anim-up-1" style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 340 }}>
        <Link href="/host" style={{ textDecoration: "none" }}>
          <div className="card card-em" style={{ padding: "18px 20px", cursor: "pointer", transition: "transform 0.16s,box-shadow 0.16s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ width: 40, height: 40, minWidth: 40, borderRadius: 11, background: "var(--accent-lo)", border: "1px solid var(--border-em)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 14c3.31 0 6-2.69 6-6S15.31 2 12 2 6 4.69 6 8s2.69 6 6 6z" stroke="var(--accent)" strokeWidth="2" />
                  <path d="M3 20c0-3.31 4.03-6 9-6s9 2.69 9 6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="19" cy="8" r="2.5" fill="var(--accent-hi)" />
                  <path d="M19 6v4M17 8h4" stroke="#050c0a" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text-1)", marginBottom: 2, letterSpacing: "-0.01em" }}>Host a Game</p>
                <p style={{ fontSize: "0.76rem", color: "var(--text-3)", fontWeight: 500 }}>Create a room & manage questions</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "var(--border-em)", flexShrink: 0 }}>
                <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </Link>

        <Link href="/play" style={{ textDecoration: "none" }}>
          <div className="card" style={{ padding: "18px 20px", cursor: "pointer", transition: "transform 0.16s,border-color 0.18s" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.borderColor = "var(--border-hi)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.borderColor = "var(--border)"; }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ width: 40, height: 40, minWidth: 40, borderRadius: 11, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-hi)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="var(--text-2)" strokeWidth="1.5" />
                  <path d="M10 8l6 4-6 4V8z" fill="var(--text-2)" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text-1)", marginBottom: 2, letterSpacing: "-0.01em" }}>Join a Game</p>
                <p style={{ fontSize: "0.76rem", color: "var(--text-3)", fontWeight: 500 }}>Enter a room code to compete</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "rgba(255,255,255,0.12)", flexShrink: 0 }}>
                <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
      <p className="anim-up-3" style={{ marginTop: 28, color: "var(--text-3)", fontSize: "0.64rem", letterSpacing: "0.07em", fontWeight: 600, textTransform: "uppercase" }}>
        Created by Owen Paredes
      </p>
    </main>
  );
}