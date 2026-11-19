import Link from "next/link";
import Image from "next/image";
import { dict, type Locale } from "@/lib/i18n";
import { media, site } from "@/lib/config";
import {
  DesktopNavigation,
  LanguageToggle,
  MobileNavigation,
} from "./navigation";
import { AbstractVisual } from "./editorial";
export function Header({ lang }: { lang: Locale }) {
  return (
    <header className="site-header">
      <Link
        className="wordmark"
        href={`/${lang}`}
        aria-label={`Dominique Soucy — ${dict(lang).home}`}
      >
        DOMINIQUE
        <br />
        SOUCY<span>.</span>
      </Link>
      <DesktopNavigation lang={lang} />
      <div className="header-actions">
        <LanguageToggle lang={lang} />
        <MobileNavigation lang={lang} />
      </div>
    </header>
  );
}
export function Portrait({
  lang,
  className = "",
}: {
  lang: Locale;
  className?: string;
}) {
  return (
    <div className={`portrait ${className}`}>
      {media.portrait ? (
        <Image
          src={media.portrait.src}
          alt={media.portrait.alt[lang]}
          fill
          sizes="(max-width: 700px) 100vw, 55vw"
          priority
        />
      ) : (
        <>
          <AbstractVisual kind="lines" />
          <span className="portrait-monogram" aria-hidden="true">
            D<span>S</span>
          </span>
          <span className="portrait-caption">{dict(lang).portrait}</span>
        </>
      )}
    </div>
  );
}
export function Hero({ lang }: { lang: Locale }) {
  const d = dict(lang);
  return (
    <section className="hero">
      <div className="hero-topline">
        <span>{d.eyebrow}</span>
        <span>DOMINIQUESOUCY.COM</span>
      </div>
      <div className="hero-stage">
        <Portrait lang={lang} />
        <h1 className="hero-title" aria-label="Dominique Soucy">
          DOMINIQUE
          <br />
          <span>
            SOUCY<span className="hero-dot">.</span>
          </span>
        </h1>
        <div className="hero-note">
          <span className="accent">[ DS ]</span>
          <p>{d.positioning}</p>
        </div>
      </div>
      <div className="hero-bottom">
        <p>{d.mission}</p>
        <div className="hero-cta">
          <Link className="button" href={`/${lang}/reflexions`}>
            {d.explore}
          </Link>
          <Link className="text-link" href={`/${lang}/a-propos`}>
            {d.discover}
          </Link>
        </div>
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
    <section className="purinstinct">
      <div>
        <p className="eyebrow">PÜRINSTINCT WORLDWIDE</p>
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
