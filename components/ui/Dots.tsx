export function Dots({ style }: { style?: React.CSSProperties }) {
  return (
    <div className="dots" style={{ justifyContent: "center", ...style }}>
      <span /><span /><span />
    </div>
  );
}
