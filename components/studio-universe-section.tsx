import Image from "next/image";
import type { CSSProperties } from "react";
import type { Locale } from "@/lib/i18n";
import {
  studioUniverse,
  type StudioUniverseConfig,
} from "@/lib/homepage-media";
import { StudioUniverseMotion } from "./studio-universe-motion";

/** The supplied artwork is rendered whole, never regenerated or retouched. */
export function StudioUniverseSection({
  lang,
  config = studioUniverse,
}: {
  lang: Locale;
  config?: StudioUniverseConfig;
}) {
  const caption = config.presentation[lang] === "caption";
  const title = config.slogan[lang];
  return (
    <StudioUniverseMotion
      motion={
        config.motion ?? { enabled: false, durationMs: 900, parallaxPx: 0 }
      }
    >
      <section
        id="studio-universe"
        className="studio-universe"
        aria-labelledby="studio-universe-title"
        style={
          {
            "--studio-ratio": config.desktopCrop.ratio,
            "--studio-position": config.desktopCrop.position,
            "--studio-fit": config.desktopCrop.fit,
            "--studio-mobile-ratio": config.mobileCrop.ratio,
            "--studio-mobile-position": config.mobileCrop.position,
            "--studio-mobile-fit": config.mobileCrop.fit,
          } as CSSProperties
        }
      >
        {!caption && (
          <h2 id="studio-universe-title" className="studio-sr-only">
            {title.join(" ")}
          </h2>
        )}
        <figure>
          <div className="studio-universe-frame">
            <Image
              src={config.image.src}
              alt={config.alt[lang]}
              fill
              sizes="100vw"
              quality={85}
              loading="lazy"
            />
          </div>
          {caption && (
            <figcaption className="studio-universe-translation">
              <h2 id="studio-universe-title">
                {title[0]} <em>{title[1]}</em>
              </h2>
            </figcaption>
          )}
        </figure>
      </section>
    </StudioUniverseMotion>
  );
}
