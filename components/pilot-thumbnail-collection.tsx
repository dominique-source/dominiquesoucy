import Image from "next/image";
import type { CSSProperties } from "react";
import {
  pilotThumbnails,
  thumbnailDestination,
  thumbnailStyleLabels,
  type PilotThumbnail,
} from "@/lib/pilot-thumbnails";
import { PilotThumbnailLink } from "./pilot-thumbnail-link";
import type { Locale } from "@/lib/i18n";

export function PilotThumbnailCollection({
  lang,
  entries = pilotThumbnails,
}: {
  lang: Locale;
  entries?: readonly PilotThumbnail[];
}) {
  return (
    <section
      className="pilot-thumbnails"
      aria-labelledby="pilot-thumbnails-title"
    >
      <div className="content-shell">
        <div className="pilot-thumbnails-heading">
          <div className="pilot-thumbnails-title-group">
            <p className="eyebrow accent">
              {lang === "fr" ? "DOM SOUCY MEDIA / ÉPISODE 00" : "DOM SOUCY MEDIA / EPISODE 00"}
            </p>
            <h2 id="pilot-thumbnails-title">
              {lang === "fr" ? "À VOIR." : "WATCH."}
            </h2>
          </div>
          <p className="pilot-thumbnails-intro">
            {lang === "fr"
              ? "Un même pilote. Trois regards complémentaires pour questionner, comprendre et confronter le sport."
              : "One pilot. Three perspectives to question, understand, and challenge sport."}
          </p>
          <a className="pilot-thumbnails-main-cta" href="#pilote">
            <span aria-hidden="true">▶</span>
            {lang === "fr" ? "REGARDER LE PILOTE 00" : "WATCH PILOT 00"}
          </a>
        </div>
        <div className="pilot-thumbnails-grid">
          {entries.map((style, index) => {
            const label = thumbnailStyleLabels[style.style][lang];
            const href = thumbnailDestination(style);
            return (
              <PilotThumbnailLink
                key={style.id}
                className={`pilot-thumbnail pilot-thumbnail--${style.style}`}
                href={href}
                label={`${label} — ${style.title[lang].join(" ")} — ${lang === "fr" ? (href === "#pilote" ? "regarder le pilote" : "regarder la vidéo") : href === "#pilote" ? "watch the pilot" : "watch the video"}`}
              >
                <div
                  className="pilot-thumbnail-art"
                  style={
                    {
                      "--thumbnail-position": style.image.position,
                      "--thumbnail-fit": style.image.fit ?? "cover",
                    } as CSSProperties
                  }
                >
                  <div className="pilot-thumbnail-photo">
                    <Image
                      src={style.image.src}
                      alt=""
                      fill
                      sizes="(max-width: 750px) 65vw, 22vw"
                      className="pilot-thumbnail-image"
                    />
                  </div>
                  {style.style === "documentary" && (
                    <span
                      className="pilot-thumbnail-court"
                      aria-hidden="true"
                    />
                  )}
                  <span className="pilot-thumbnail-slash" aria-hidden="true" />
                  <span className="pilot-thumbnail-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")} <span>—</span>
                  </span>
                  <span className="pilot-thumbnail-copy" aria-hidden="true">
                    <span>{style.title[lang][0]}</span>
                    <strong>{style.title[lang][1]}</strong>
                  </span>
                  <span className="pilot-thumbnail-play" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                      <path d="M8 5 19 12 8 19V5Z" fill="currentColor" />
                    </svg>
                  </span>
                </div>
                <div className="pilot-thumbnail-footer">
                  <div className="pilot-thumbnail-meta">
                    <span>{label}</span>
                    <span>{style.episodeLabel[lang]}</span>
                  </div>
                  {style.subtitle && (
                    <p className="pilot-thumbnail-subtitle">{style.subtitle[lang]}</p>
                  )}
                </div>
              </PilotThumbnailLink>
            );
          })}
        </div>
      </div>
    </section>
  );
}
