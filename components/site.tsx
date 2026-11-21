import { EditorialPortrait } from "./photography";
import Link from "next/link";
import { brand } from "@/lib/brand-copy";
import { dict, type Locale } from "@/lib/i18n";
import { site } from "@/lib/config";
import {
  DesktopNavigation,
  LanguageToggle,
  MobileNavigation,
} from "./navigation";
export function Header({ lang }: { lang: Locale }) {
  return (
    <header className="site-header">
      <Link
        className="wordmark"
        href={`/${lang}`}
        aria-label={`Dominique Soucy — ${dict(lang).home}`}
      >
        DOMINIQUE SOUCY<span>.</span>
      </Link>
      <DesktopNavigation lang={lang} />
      <div className="header-actions">
        <LanguageToggle lang={lang} />
        <MobileNavigation key={lang} lang={lang} />
      </div>
    </header>
  );
}
export function Portrait({
  lang,
  className = "",
  priority = false,
}: {
  lang: Locale;
  className?: string;
  priority?: boolean;
}) {
  return (
    <EditorialPortrait
      lang={lang}
      className={className}
      priority={priority}
      background="light"
    />
  );
}

export function Hero({ lang }: { lang: Locale }) {
  const d = dict(lang);
  const b = brand(lang);
  return (
    <section className="home-hero">
      <div className="hero-composition">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">
            <span>SPORT</span>
            <i>/</i>
            <span>{lang === "fr" ? "SOCIÉTÉ" : "SOCIETY"}</span>
            <i>/</i>
            <span>{lang === "fr" ? "HUMAIN" : "HUMAN"}</span>
          </p>
          <h1 className="home-title" aria-label="Dominique Soucy">
            DOMINIQUE
            <br />
            <span>
              SOUCY<span className="accent">.</span>
            </span>
          </h1>
          <p className="hero-positioning">{d.positioning}</p>
          <p className="hero-mission">{d.mission}</p>
          <div className="home-actions">
            <Link className="button button-cut" href={`/${lang}/reflexions`}>
              {d.explore}
            </Link>
            <Link className="button button-outline" href={`/${lang}/a-propos`}>
              {d.discover}
            </Link>
          </div>
        </div>
        <div className="hero-photo-wrap">
          <Portrait lang={lang} className="hero-portrait" priority />
          <span className="hero-diagonal" aria-hidden="true" />
        </div>
      </div>
      <div className="hero-colophon">
        <span>{b.originalPerspective}</span>
        <span>DOMINIQUESOUCY.COM</span>
      </div>
    </section>
  );
}
export function AboutPreview({
  lang,
  full = false,
}: {
  lang: Locale;
  full?: boolean;
}) {
  const d = dict(lang);
  return (
    <section className={`about-section ${full ? "full" : ""}`}>
      <Portrait lang={lang} />
      <div>
        <p className="eyebrow accent">DOMINIQUE SOUCY / {d.nav["a-propos"]}</p>
        <h2>{d.person}</h2>
        <p className="about-lead">{d.bio}</p>
        {full && <p>{d.bio2}</p>}
        {!full && (
          <Link className="text-link" href={`/${lang}/a-propos`}>
            {d.discover}
          </Link>
        )}
      </div>
    </section>
  );
}
export function PurInstinctBridge({ lang }: { lang: Locale }) {
  const d = dict(lang);
  return (
    <section className="purinstinct v2-bridge">
      <div>
        <p className="eyebrow">PÜRINSTINCT WORLDWIDE</p>
        <span className="bridge-art" aria-hidden="true" />
        <h2>{d.bridge}</h2>
      </div>
      <div>
        <p>{d.bridgeBody}</p>
        {site.purinstinct && (
          <a
            className="text-link"
            href={site.purinstinct}
            target="_blank"
            rel="noopener noreferrer"
          >
            {d.project}
            <span className="sr-only">
              {" "}
              ({lang === "fr" ? "nouvel onglet" : "new tab"})
            </span>
          </a>
        )}
      </div>
    </section>
  );
}
export function Footer({ lang }: { lang: Locale }) {
  const d = dict(lang);
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link className="footer-wordmark" href={`/${lang}`}>
          DOMINIQUE
          <br />
          SOUCY<span>.</span>
        </Link>
        <div>
          <p className="eyebrow">{d.eyebrow}</p>
          <nav
            aria-label={
              lang === "fr" ? "Navigation de pied de page" : "Footer navigation"
            }
          >
            {Object.entries(d.nav).map(([key, label]) => (
              <Link key={key} href={`/${lang}/${key}`}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        {site.social.length > 0 && (
          <nav aria-label={lang === "fr" ? "Réseaux sociaux" : "Social media"}>
            {site.social.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {s.name}
                <span className="sr-only">
                  {" "}
                  ({lang === "fr" ? "nouvel onglet" : "new tab"})
                </span>
              </a>
            ))}
          </nav>
        )}
      </div>
      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} Dominique Soucy. {d.rights}
        </p>
        <p>{d.relationship}</p>
      </div>
      <p className="legal-placeholder">{d.legal}</p>
    </footer>
  );
}
