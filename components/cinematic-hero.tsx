import Image from "next/image";
import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import { photograph } from "@/lib/photography";

/** V5 composition: original photographs, with a background-only CSS silhouette mask. */
export function CinematicHero({ lang }: { lang: Locale }) {
  const d = dict(lang);
  const portrait = photograph("02_portrait_chemise_bleue", lang);
  const archive = photograph("07_archive_rouge_et_or", lang);
  return (
    <section className="cinematic-hero" aria-labelledby="cinematic-title">
      <div className="cinematic-archive" aria-hidden="true">
        <Image
          src={archive.src}
          width={archive.width}
          height={archive.height}
          alt=""
          loading="eager"
          fetchPriority="low"
          sizes="(max-width: 767px) 100vw, 42vw"
        />
      </div>
      <div className="cinematic-stage">
        <p className="cinematic-eyebrow">{d.eyebrow}</p>
        <h1 id="cinematic-title" className="cinematic-title">
          <span>DOMINIQUE</span>
          <span>
            SOUCY<span className="cinematic-stop">.</span>
          </span>
        </h1>
        <div className="cinematic-portrait">
          <Image
            src={portrait.src}
            width={portrait.width}
            height={portrait.height}
            alt={portrait.alt}
            preload
            sizes="(max-width: 767px) 100vw, (max-width: 1100px) 55vw, 760px"
          />
        </div>
        <p className="cinematic-statement">
          {lang === "fr" ? (
            <>
              Le sport comme miroir
              <br className="statement-break" /> de la société.
            </>
          ) : (
            <>
              Sport as a mirror
              <br className="statement-break" /> of society.
            </>
          )}
        </p>
        <p className="cinematic-mission">{d.mission}</p>
        <div className="cinematic-actions">
          <a className="cinematic-play" href="#pilote">
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path d="M4 2 18 10 4 18Z" fill="currentColor" />
            </svg>
            {lang === "fr" ? "Regarder le pilote" : "Watch the pilot"}
          </a>
          <Link href={`/${lang}/reflexions`}>{d.explore}</Link>
          <Link href={`/${lang}/a-propos`}>{d.discover}</Link>
        </div>
      </div>
    </section>
  );
}
