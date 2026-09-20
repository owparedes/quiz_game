import { Dots } from "./Dots";

export function Revealing({ card }: { card?: boolean }) {
  return (
    <div className={`anim-scale${card ? " card" : ""}`} style={card ? { padding: "clamp(28px,5vw,44px) 20px", textAlign: "center" } : undefined}>
      <Dots style={{ marginBottom: 18 }} />
      <p style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-1)" }}>Revealing answer…</p>
      <p className="muted" style={{ fontSize: "0.8rem", marginTop: 5 }}>Hold on…</p>
    </div>
  );
}
