"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(20px, 5vw, 40px) 16px",
        background: "var(--bg)",
      }}
    >
      {/* Logo Block */}
      <div
        className="anim-up"
        style={{ textAlign: "center", marginBottom: "clamp(28px, 6vw, 48px)" }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "var(--accent-lo)",
            border: "1.5px solid var(--border-em)",
            marginBottom: 16,
          }}
        >
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
            <path
              d="M6 18L14 6L22 18"
              stroke="#22c55e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M9 14h10" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
            <circle cx="14" cy="22" r="2" fill="#4ade80" />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 900,
            fontSize: "clamp(2rem, 7vw, 3rem)",
            letterSpacing: "-0.04em",
            color: "var(--text-1)",
            lineHeight: 1,
            marginBottom: 8,
          }}
        >
          Quiz<span style={{ color: "var(--accent)" }}>Live</span>
        </h1>
        <p
          style={{
            color: "var(--text-3)",
            fontSize: "clamp(0.82rem, 2.5vw, 0.95rem)",
            fontWeight: 500,
          }}
        >
          Real-time multiplayer quizzes
        </p>
      </div>

      {/* Action Cards */}
      <div
        className="anim-up-1"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          maxWidth: 360,
        }}
      >
        {/* Host Card */}
        <Link href="/host" style={{ textDecoration: "none" }}>
          <div
            className="card card-em"
            style={{
              padding: "18px 20px",
              cursor: "pointer",
              transition: "transform 0.18s, box-shadow 0.18s",
              WebkitTapHighlightColor: "transparent",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  minWidth: 44,
                  borderRadius: 12,
                  background: "var(--accent-lo)",
                  border: "1px solid var(--border-em)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 14c3.31 0 6-2.69 6-6S15.31 2 12 2 6 4.69 6 8s2.69 6 6 6z"
                    stroke="#22c55e"
                    strokeWidth="2"
                  />
                  <path
                    d="M3 20c0-3.31 4.03-6 9-6s9 2.69 9 6"
                    stroke="#22c55e"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="19" cy="8" r="2.5" fill="#4ade80" />
                  <path
                    d="M19 6v4M17 8h4"
                    stroke="#0d1117"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    color: "var(--text-1)",
                    marginBottom: 2,
                  }}
                >
                  Host a Game
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-3)",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Create a room and manage questions
                </div>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{ color: "var(--border-em)", flexShrink: 0 }}
              >
                <path
                  d="M6 12l4-4-4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </Link>

        {/* Play Card */}
        <Link href="/play" style={{ textDecoration: "none" }}>
          <div
            className="card"
            style={{
              padding: "18px 20px",
              cursor: "pointer",
              transition: "transform 0.18s, border-color 0.2s",
              WebkitTapHighlightColor: "transparent",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-em)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  minWidth: 44,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#8b949e" strokeWidth="2" />
                  <path d="M10 8l6 4-6 4V8z" fill="#8b949e" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    color: "var(--text-1)",
                    marginBottom: 2,
                  }}
                >
                  Join a Game
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-3)",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Enter a room code to compete
                </div>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{ color: "rgba(255,255,255,0.15)", flexShrink: 0 }}
              >
                <path
                  d="M6 12l4-4-4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      <p
        className="anim-up-2"
        style={{
          marginTop: "clamp(24px, 5vw, 40px)",
          color: "var(--text-3)",
          fontSize: "0.68rem",
          letterSpacing: "0.07em",
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        Salientes-Gonzalez Associates
      </p>
    </main>
  );
}