"use client";
import Link from "next/link";
import { Footer } from "@/components/ui/Footer";

const LINKS = [
  {
    href: "/host",
    title: "Host a Game",
    desc: "Create a room and manage questions",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 14c3.31 0 6-2.69 6-6S15.31 2 12 2 6 4.69 6 8s2.69 6 6 6z" stroke="currentColor" strokeWidth="2" />
        <path d="M3 20c0-3.31 4.03-6 9-6s9 2.69 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/play",
    title: "Join a Game",
    desc: "Enter a room code to compete",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}>
      <main className="center" style={{ flex: 1, padding: "clamp(32px,6vw,64px) 16px" }}>
      <div className="anim-up" style={{ textAlign: "center", marginBottom: "clamp(28px,6vw,40px)" }}>
        <h1 style={{ fontWeight: 800, fontSize: "clamp(2rem,7vw,2.6rem)", letterSpacing: "-0.03em", color: "var(--text-1)", lineHeight: 1.1, marginBottom: 8 }}>
          Quiz<span style={{ color: "var(--accent)" }}>Live</span>
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: "0.95rem", fontWeight: 500 }}>Live multiplayer quizzes</p>
      </div>

      <div className="anim-up-1" style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 360 }}>
        {LINKS.map(link => (
          <Link key={link.href} href={link.href} style={{ textDecoration: "none" }}>
            <div className="card" style={{ padding: "18px 20px", cursor: "pointer", transition: "border-color 0.16s, box-shadow 0.16s" }}
              onMouseEnter={event => { event.currentTarget.style.borderColor = "var(--accent)"; event.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
              onMouseLeave={event => { event.currentTarget.style.borderColor = "var(--border)"; event.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 42, height: 42, minWidth: 42, borderRadius: 11, background: "var(--accent-lo)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {link.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-1)", marginBottom: 2 }}>{link.title}</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>{link.desc}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "var(--text-3)", flexShrink: 0 }}>
                  <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      </main>
      <Footer />
    </div>
  );
}
