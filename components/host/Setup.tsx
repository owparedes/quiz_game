"use client";
import { useEffect, useState } from "react";
import { lastRoomCode } from "@/lib/storage";

interface Props {
  creating: boolean;
  error: string;
  onCreate: () => void;
  onResume: (code: string) => void;
}

export function Setup({ creating, error, onCreate, onResume }: Props) {
  const [savedCode, setSavedCode] = useState<string | null>(null);

  useEffect(() => { setSavedCode(lastRoomCode()); }, []);

  return (
    <main className="screen center">
      <div className="card card-em anim-up" style={{ width: "100%", maxWidth: 380, padding: "clamp(28px,6vw,40px) clamp(22px,5vw,32px)", textAlign: "left" }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-1)" }}>Host Setup</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-2)", marginTop: 2 }}>Create a quiz room</p>
        </div>
        {error && (
          <div className="anim-scale" style={{ marginBottom: 14, padding: "11px 14px", borderRadius: 10, background: "var(--danger-lo)", border: "1px solid var(--danger-border)" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--danger)", fontWeight: 500 }}>{error}</p>
          </div>
        )}
        <p className="muted" style={{ fontSize: "0.76rem", marginBottom: 24 }}>A secure room code will be generated for you to share with your players</p>
        <button className="btn btn-primary" style={{ width: "100%", padding: 12 }} disabled={creating} onClick={onCreate}>
          {creating ? "Creating…" : "Create Room →"}
        </button>
        {savedCode && (
          <button className="btn btn-ghost" style={{ width: "100%", padding: 12, marginTop: 10 }} disabled={creating} onClick={() => onResume(savedCode)}>
            Resume room <span className="mono">{savedCode}</span>
          </button>
        )}
      </div>
    </main>
  );
}
