"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { dict, type Locale } from "@/lib/i18n";
export function MobileNavigation({ lang }: { lang: Locale }) {
  const [open, setOpen] = useState(false);
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
            onClick={() => setOpen(false)}
          >
            {label}
          </Link>
        ))}
      </nav>
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
          aria-current={
            pathname.startsWith(`/${lang}/${key}`) ? "page" : undefined
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
