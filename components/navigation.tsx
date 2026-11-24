"use client";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { dict, type Locale } from "@/lib/i18n";
function useComingSoon() {
  const [notice, setNotice] = useState<{ label: string; x: number; y: number; width: number; height: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  function show(label: string, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    if (timer.current) clearTimeout(timer.current);
    setNotice({ label, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width, height: rect.height });
    timer.current = setTimeout(() => setNotice(null), 2000);
  }
  return { notice, show };
}

function ComingSoon({ lang, notice }: { lang: Locale; notice: ReturnType<typeof useComingSoon>["notice"] }) {
  if (!notice || typeof document === "undefined") return null;
  return createPortal(
    <div role="status" aria-label={`${notice.label}: ${lang === "fr" ? "À venir" : "Coming soon"}`} className="nav-coming-soon" style={{ left: `clamp(64px, ${notice.x}px, calc(100vw - 64px))`, top: notice.y, minWidth: Math.max(112, notice.width), minHeight: notice.height }}>
      <strong>{lang === "fr" ? "À VENIR" : "COMING SOON"}<span>.</span></strong>
      <style>{`
        .nav-coming-soon {
          position: fixed; z-index: 10000; transform: translate(-50%, -50%); display: grid; place-items: center; box-sizing: border-box;
          width: max-content; max-width: calc(100vw - 24px); padding: 8px 16px;
          background: #0a0a0a; color: #f4f4ef; border: 1px solid #333;
          border: 1px solid var(--accent, #ccff00);
          box-shadow: 0 12px 40px #0008; pointer-events: none;
          animation: nav-notice-in 200ms ease-out both;
        }
        .nav-coming-soon strong { display: block; font-family: var(--display, Impact, sans-serif); font-size: 24px; font-weight: 800; font-style: italic; line-height: 1; margin: 0; white-space: nowrap; }
        .nav-coming-soon strong span { color: var(--accent, #ccff00); }
        @keyframes nav-notice-in { from { opacity: 0; transform: translate(-50%, -50%) scale(.96); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
        @media (prefers-reduced-motion: reduce) { .nav-coming-soon { animation: none; } }
      `}</style>
    </div>, document.body
  );
}

export function MobileNavigation({ lang }: { lang: Locale }) {
  const [open, setOpen] = useState(false);
  const { notice, show } = useComingSoon();
  const pathname = usePathname();
  const ref = useRef<HTMLButtonElement>(null);
  const d = dict(lang);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button
        ref={ref}
        className="menu-toggle"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? d.close : d.menu}
        onClick={() => setOpen(!open)}
      >
        <span>{open ? d.close : "Menu"}</span>
        <span className="menu-icon" aria-hidden="true">
          {open ? "×" : "☰"}
        </span>
      </button>
      <nav
        id="mobile-menu"
        className={`mobile-menu ${open ? "is-open" : ""}`}
        inert={!open}
        aria-label={lang === "fr" ? "Navigation mobile" : "Mobile navigation"}
      >
        {Object.entries(d.nav).map(([key, label]) => (
          <Link
            key={key}
            href={`/${lang}/${key}`}
            aria-current={pathname === `/${lang}/${key}` ? "page" : undefined}
            onClick={(event) => {
              event.preventDefault();
              show(label, event.currentTarget);
            }}
          >
            {label}
          </Link>
        ))}
      </nav>
      <ComingSoon lang={lang} notice={notice} />
    </>
  );
}
export function LanguageToggle({ lang }: { lang: Locale }) {
  const pathname = usePathname();
  return (
    <div
      className="language"
      aria-label={lang === "fr" ? "Langue" : "Language"}
    >
      {(["fr", "en"] as const).map((l) => (
        <Link
          key={l}
          lang={l}
          href={pathname.replace(/^\/(fr|en)(?=\/|$)/, `/${l}`)}
          aria-current={l === lang ? "true" : undefined}
          aria-label={l === "fr" ? "Français" : "English"}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
export function DesktopNavigation({ lang }: { lang: Locale }) {
  const { notice, show } = useComingSoon();
  const pathname = usePathname();
  return (
    <nav
      className="desktop-nav"
      aria-label={lang === "fr" ? "Navigation principale" : "Main navigation"}
    >
      {Object.entries(dict(lang).nav).map(([key, label]) => (
        <Link
          key={key}
          href={`/${lang}/${key}`}
          onClick={(event) => {
            event.preventDefault();
            show(label, event.currentTarget);
          }}
          aria-current={
            pathname.startsWith(`/${lang}/${key}`) ? "page" : undefined
          }
        >
          {label}
        </Link>
      ))}
      <ComingSoon lang={lang} notice={notice} />
    </nav>
  );
}
