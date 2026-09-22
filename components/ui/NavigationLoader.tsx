"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SHOW_DELAY_MS = 300;
const SAFETY_TIMEOUT_MS = 20000;

function routeKey(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}

function currentRouteKey() {
  const search = new URLSearchParams(window.location.search).toString();
  return routeKey(window.location.pathname, search);
}

function targetFromEvent(event: MouseEvent): string | null {
  if (event.defaultPrevented) return null;
  if (event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;

  const node = event.target instanceof Element ? event.target : null;
  const anchor = node?.closest<HTMLAnchorElement>("a");
  if (!anchor) return null;

  const anchorTarget = anchor.getAttribute("target");
  if (anchorTarget && anchorTarget !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;

  const rel = anchor.getAttribute("rel");
  if (rel && rel.split(/\s+/).includes("external")) return null;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^https?:/i.test(href)) return null;

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;

  const target = routeKey(url.pathname, url.searchParams.toString());
  if (target === currentRouteKey()) return null;

  return target;
}

export function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = routeKey(pathname, searchParams.toString());

  const [pending, setPending] = useState<string | null>(null);
  const [delayElapsed, setDelayElapsed] = useState(false);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = targetFromEvent(event);
      if (!target) return;
      setPending(target);
      setDelayElapsed(false);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (pending === null) return;

    if (pending === current) {
      const settle = setTimeout(() => {
        setPending(null);
        setDelayElapsed(false);
      }, 0);
      return () => clearTimeout(settle);
    }

    const reveal = setTimeout(() => setDelayElapsed(true), SHOW_DELAY_MS);
    const bail = setTimeout(() => {
      setPending(null);
      setDelayElapsed(false);
    }, SAFETY_TIMEOUT_MS);

    return () => {
      clearTimeout(reveal);
      clearTimeout(bail);
    };
  }, [pending, current]);

  const visible = pending !== null && delayElapsed && pending !== current;
  if (!visible) return null;

  return (
    <div className="nav-loader" role="status" aria-live="polite" aria-label="Loading page">
      <div className="nav-loader-inner">
        <span className="nav-loader-mark">
          Quiz<span className="nav-loader-mark-accent">Live</span>
        </span>
        <span className="nav-loader-bar">
          <span className="nav-loader-bar-fill" />
        </span>
      </div>
    </div>
  );
}
