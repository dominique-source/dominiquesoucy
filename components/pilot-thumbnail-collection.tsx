import Image from "next/image";
import { photograph } from "@/lib/photography";
import type { Locale } from "@/lib/i18n";

/**
 * Three visual treatments for one verified pilot. Their short editorial hooks
 * are not claims about separate videos or exact pilot subject matter.
 * Future episodes can reuse each visual treatment independently.
 */
const styles = [
  { id: "question", label: { fr: "La provocation", en: "The question" },
    lines: { fr: ["ET SI ON SE", "TROMPAIT?"], en: ["WHAT IF WE", "WERE WRONG?"] },
    photograph: "02_portrait_chemise_bleue", variant: "original" },
  { id: "manifesto", label: { fr: "Le manifeste", en: "The manifesto" },
    lines: { fr: ["LE SPORT EST", "UN MIROIR."], en: ["SPORT IS", "A MIRROR."] },
    photograph: "05_portrait_ballon", variant: "original" },
  { id: "documentary", label: { fr: "La confrontation", en: "The confrontation" },
    lines: { fr: ["LE SPORT.", "VRAIMENT?"], en: ["SPORT.", "REALLY?"] },
    photograph: "07_archive_rouge_et_or", variant: "original" },
] as const;

export function PilotThumbnailCollection({ lang }: { lang: Locale }) {
  return (
    <section className="pilot-thumbnails" aria-labelledby="pilot-thumbnails-title">
      <div className="content-shell">
        <div className="pilot-thumbnails-heading">
          <div>
            <p className="eyebrow accent">
              {lang === "fr" ? "TROIS REGARDS / UN MÊME PILOTE" : "THREE PERSPECTIVES / ONE PILOT"}
            </p>
            <h2 id="pilot-thumbnails-title">
              {lang === "fr" ? "À VOIR." : "WATCH."}<span className="accent"> / 00</span>
            </h2>
          </div>
          <p>
            {lang === "fr"
              ? "Trois portes d’entrée visuelles vers le pilote de la série."
              : "Three visual ways into the series pilot."}
          </p>
        </div>
        <div className="pilot-thumbnails-grid">
          {styles.map((style) => {
            const photo = photograph(style.photograph, lang, style.variant);
            return (
              <a
                key={style.id}
                className={`pilot-thumbnail pilot-thumbnail--${style.id}`}
                href="#pilote"
                aria-label={`${style.label[lang]} — ${style.lines[lang].join(" ")} — ${lang === "fr" ? "regarder le pilote" : "watch the pilot"}`}
              >
                <div className="pilot-thumbnail-art">
                  <Image
                    src={photo.src}
                    alt=""
                    fill
                    sizes="(max-width: 750px) 100vw, (max-width: 1150px) 50vw, 33vw"
                    className="pilot-thumbnail-image"
                  />
                  {style.id === "documentary" && (
                    <span className="pilot-thumbnail-court" aria-hidden="true" />
                  )}
                  <span className="pilot-thumbnail-slash" aria-hidden="true" />
                  <span className="pilot-thumbnail-copy" aria-hidden="true">
                    <span>{style.lines[lang][0]}</span>
                    <strong>{style.lines[lang][1]}</strong>
                  </span>
                  <span className="pilot-thumbnail-play" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                      <path d="M8 5 19 12 8 19V5Z" fill="currentColor" />
                    </svg>
                  </span>
                </div>
                <div className="pilot-thumbnail-meta">
                  <span>{style.label[lang]}</span>
                  <span>{lang === "fr" ? "PILOTE / ÉPISODE 00" : "PILOT / EPISODE 00"}</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
