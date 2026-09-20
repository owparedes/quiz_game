interface Props {
  roomCode: string;
  onChange: (code: string) => void;
  onJoin: () => void;
}

export function Setup({ roomCode, onChange, onJoin }: Props) {
  return (
    <main className="screen center">
      <div className="card card-em anim-up" style={{ width: "100%", maxWidth: 380, padding: "clamp(28px,6vw,40px) clamp(22px,5vw,32px)", textAlign: "left" }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-1)" }}>Host Setup</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-2)", marginTop: 2 }}>Create a quiz room</p>
        </div>
        <label className="label">Room Code</label>
        <input className="inp inp-mono" placeholder="QUIZ2025" value={roomCode}
          onChange={event => onChange(event.target.value.toUpperCase())}
          onKeyDown={event => event.key === "Enter" && roomCode && onJoin()}
          style={{ marginBottom: 10 }} />
        <p className="muted" style={{ fontSize: "0.76rem", marginBottom: 24 }}>Share this code with your players</p>
        <button className="btn btn-primary" style={{ width: "100%", padding: 12 }} disabled={!roomCode} onClick={onJoin}>
          Create Room →
        </button>
      </div>
    </main>
  );
}
