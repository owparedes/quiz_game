import Link from "next/link";
import { Footer } from "./Footer";

interface Props {
  title: string;
  updated: string;
  children: React.ReactNode;
}

export function LegalPage({ title, updated, children }: Props) {
  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}>
      <main className="page anim-up">
        <Link href="/" className="muted" style={{ fontSize: "0.85rem", textDecoration: "none" }}>← Back to QuizLive</Link>
        <h1 style={{ marginTop: 16 }}>{title}</h1>
        <p className="muted" style={{ fontSize: "0.85rem" }}>Last updated: {updated}</p>
        {children}
      </main>
      <Footer />
    </div>
  );
}
