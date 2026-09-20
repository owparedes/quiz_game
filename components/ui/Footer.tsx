import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <span>© {new Date().getFullYear()} QuizLive. Created by Owen Paredes.</span>
      <div className="footer-links">
        <Link href="/terms">Terms of Use</Link>
        <Link href="/privacy">Privacy Policy</Link>
      </div>
    </footer>
  );
}
