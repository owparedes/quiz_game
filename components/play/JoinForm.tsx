import { MAX_TEAM_NAME_LENGTH } from "@/lib/config";

interface Props {
  roomCode: string;
  teamName: string;
  error: string;
  onRoomCodeChange: (code: string) => void;
  onTeamNameChange: (name: string) => void;
  onJoin: () => void;
}

export function JoinForm({ roomCode, teamName, error, onRoomCodeChange, onTeamNameChange, onJoin }: Props) {
  return (
    <main className="screen center">
      <div className="card card-em anim-up" style={{ width: "100%", maxWidth: 360, padding: "clamp(28px,6vw,40px) clamp(22px,5vw,32px)", textAlign: "left" }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>Join a Game</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-2)", marginTop: 2 }}>Enter your details to play</p>
        </div>
        {error && (
          <div className="anim-scale" style={{ marginBottom: 14, padding: "11px 14px", borderRadius: 10, background: "var(--danger-lo)", border: "1px solid var(--danger-border)" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--danger)", fontWeight: 500 }}>{error}</p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">Room Code</label>
            <input className="inp inp-mono" placeholder="ROOM CODE" value={roomCode} maxLength={6} autoComplete="off" spellCheck={false}
              onChange={event => onRoomCodeChange(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
          </div>
          <div>
            <label className="label">Your Name / Team</label>
            <input className="inp" placeholder="e.g. Team Alpha" value={teamName} maxLength={MAX_TEAM_NAME_LENGTH} autoComplete="off"
              onChange={event => onTeamNameChange(event.target.value)}
              onKeyDown={event => event.key === "Enter" && onJoin()} />
          </div>
          <button className="btn btn-primary" style={{ width: "100%", padding: 12, fontSize: "0.92rem" }} disabled={!roomCode || !teamName} onClick={onJoin}>
            Join Game →
          </button>
        </div>
      </div>
    </main>
  );
}
