import Link from "next/link";
import { Footer } from "./Footer";

type Section = { id: string; heading: string; body: React.ReactNode };

type Props = {
  title: string;
  summary: string;
  effective: string;
  updated: string;
  intro: React.ReactNode;
  sections: Section[];
};

const OTHER_PAGE: Record<string, { href: string; label: string }> = {
  "Terms of Service": { href: "/privacy", label: "Privacy Policy" },
  "Privacy Policy": { href: "/terms", label: "Terms of Service" },
};

export function LegalPage({ title, summary, effective, updated, intro, sections }: Props) {
  const other = OTHER_PAGE[title];

  return (
    <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column" }}>
      <main className="anim-up mx-auto w-full max-w-[1000px] flex-1 px-4 py-[clamp(32px,6vw,64px)]">
        <header className="border-b border-[color:var(--border)] pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]">Legal</p>
          <h1 className="mt-3 font-serif text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-tight tracking-tight text-[color:var(--text-1)]">{title}</h1>
          <p className="mt-3 max-w-[680px] text-[15px] leading-relaxed text-[color:var(--text-2)]">{summary}</p>
          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-1 text-xs text-[color:var(--text-3)]">
            <div className="flex gap-1.5">
              <dt>Effective</dt>
              <dd className="text-[color:var(--text-2)]">{effective}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Last updated</dt>
              <dd className="text-[color:var(--text-2)]">{updated}</dd>
            </div>
          </dl>
        </header>

        <div className="mt-10 lg:grid lg:grid-cols-[192px_1fr] lg:items-start lg:gap-12">
          <nav aria-label="Contents" className="hidden lg:sticky lg:top-20 lg:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-3)]">Contents</p>
            <ol className="space-y-2 text-[13px] leading-snug">
              {sections.map((section, index) => (
                <li key={section.id} className="flex gap-2">
                  <span className="mono tabular-nums text-[color:var(--text-3)]">{index + 1}.</span>
                  <a href={`#${section.id}`} className="text-[color:var(--text-2)] no-underline transition-colors hover:text-[color:var(--accent)]">
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="max-w-[680px] text-[15px] leading-relaxed text-[color:var(--text-2)]">
            <div className="legal-body">{intro}</div>
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="legal-body mt-10 scroll-mt-20">
                <h2 className="mb-3 font-serif text-xl font-semibold text-[color:var(--text-1)]">
                  {index + 1}. {section.heading}
                </h2>
                {section.body}
              </section>
            ))}
          </article>
        </div>

        <div className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-[color:var(--border)] pt-6 text-sm">
          {other && (
            <Link href={other.href} className="text-[color:var(--accent)] no-underline hover:underline">{other.label}</Link>
          )}
          <Link href="/" className="text-[color:var(--text-2)] no-underline hover:text-[color:var(--accent)]">Back to QuizLive</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
