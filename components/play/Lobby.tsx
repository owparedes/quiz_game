import { Dots } from "@/components/ui/Dots";

interface Props {
  roomCode: string;
  teamName: string;
  teams: string[];
}

export function Lobby({ roomCode, teamName, teams }: Props) {
  return (
    <main className="screen center">
      <div className="anim-up" style={{ width: "100%", maxWidth: 280 }}>
        <div className="pulse-ring" style={{ width: 60, height: 60, borderRadius: 18, background: "var(--accent-lo)", border: "1px solid var(--border-em)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="var(--accent)" strokeWidth="1.5" />
            <path d="M12 7v5l3 3" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <p style={{ fontWeight: 700, fontSize: "1.2rem", marginBottom: 4 }}>Waiting for host</p>
        <p className="muted" style={{ fontSize: "0.82rem", marginBottom: 4 }}>Room</p>
        <p className="mono" style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--accent-hi)", marginBottom: 24, letterSpacing: "0.1em" }}>{roomCode}</p>

        {teams.length > 0 && (
          <div className="card" style={{ padding: "16px 18px", textAlign: "left" }}>
            <p className="label" style={{ marginBottom: 10 }}>Players ({teams.length})</p>
            <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {teams.map(team => {
                const isMe = team === teamName;
                return (
                  <div key={team} className="list-row" style={{ gap: 8, padding: "7px 10px", background: isMe ? "var(--accent-lo)" : undefined, borderColor: isMe ? "var(--border-em)" : undefined }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: isMe ? "var(--accent)" : "var(--text-3)", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.84rem", fontWeight: isMe ? 700 : 500, color: isMe ? "var(--accent-hi)" : "var(--text-1)" }}>{team}</span>
                    {isMe && <span className="muted" style={{ marginLeft: "auto", fontSize: "0.68rem", fontWeight: 600 }}>you</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <Dots style={{ marginTop: 22 }} />
      </div>
    </main>
  );
}
