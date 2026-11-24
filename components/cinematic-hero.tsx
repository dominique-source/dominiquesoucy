import Image from "next/image";
import type { CSSProperties } from "react";
import { heroAtmosphere } from "@/lib/homepage-media";
import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import { photograph } from "@/lib/photography";
import { CinematicCollage } from "@/components/cinematic-collage";

/** The approved reference is composition only. All website photographs are originals. */
export function CinematicHero({ lang }: { lang: Locale }) {
  const d = dict(lang);
  const portrait = photograph("02_portrait_chemise_bleue", lang);
  const archive = photograph("07_archive_rouge_et_or", lang);
  return (
    <section className="reference-home" aria-labelledby="reference-title">
      <div className="reference-main">
        <div className="reference-intro">
          {heroAtmosphere.enabled && (
            <div
              className="hero-studio-atmosphere"
              aria-hidden="true"
              style={
                {
                  "--atmosphere-opacity": heroAtmosphere.opacity,
                  "--atmosphere-position": heroAtmosphere.desktopPosition,
                  "--atmosphere-mobile-position": heroAtmosphere.mobilePosition,
                } as CSSProperties
              }
            >
              <Image
                src={heroAtmosphere.src}
                alt=""
                fill
                sizes="100vw"
                quality={85}
                loading="lazy"
              />
            </div>
          )}
          <p className="reference-eyebrow">{d.eyebrow}</p>
          <h1 id="reference-title">{d.positioning}</h1>
          <p className="reference-mission">{d.mission}</p>
          <p className="reference-description">{d.bio2}</p>
          <div className="reference-actions">
            <a className="reference-primary" href="#conferences">
              <svg
                viewBox="0 0 20 20"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path d="M4 2 18 10 4 18Z" fill="currentColor" />
              </svg>
              {lang === "fr" ? "Découvrir les épisodes" : "Discover episodes"}
            </a>
            <Link className="reference-secondary" href={`/${lang}/reflexions`}>
              {d.explore}
            </Link>
          </div>
          <CinematicCollage lang={lang} />
          <span className="reference-stitches" aria-hidden="true" />
        </div>
      </div>
      <aside
        className="reference-profile"
        aria-labelledby="reference-profile-title"
      >
        <header>
          <p className="reference-eyebrow">{d.nav["a-propos"]}</p>
          <h2 id="reference-profile-title">
            {lang === "fr" ? "Le parcours." : "The journey."}
          </h2>
        </header>
        <figure className="reference-person">
          <div className="reference-person-frame">
            <Image
              src={portrait.src}
              width={portrait.width}
              height={portrait.height}
              alt={portrait.alt}
              unoptimized
              loading="eager"
              sizes="(max-width: 600px) 80vw, 260px"
            />
          </div>
          <figcaption>
            <strong>Dominique Soucy</strong>
            <span>{d.relationship}</span>
          </figcaption>
        </figure>
        <figure className="reference-archive-card">
          <div className="reference-archive-frame">
            <Image
              src={archive.src}
              width={archive.width}
              height={archive.height}
              alt={archive.alt}
              sizes="(max-width: 600px) 80vw, 260px"
            />
          </div>
          <figcaption>
            <strong>
              {lang === "fr" ? "Archives personnelles" : "Personal archives"}
            </strong>
            <span>{d.categories.sport}</span>
          </figcaption>
        </figure>
        <Link className="reference-about-link" href={`/${lang}/a-propos`}>
          {d.discover}
        </Link>
      </aside>
    </section>
  );
}
