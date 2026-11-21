"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { archiveLabel, photograph } from "@/lib/photography";
import { heroPortrait, heroPortraitStyle } from "@/lib/hero-media";

const moments = [
  {
    id: "01_basket_action_archive",
    fr: "Le sport",
    en: "Sport",
    position: "sport",
  },
  {
    id: "03_moment_communautaire",
    fr: "La communauté",
    en: "Community",
    position: "community",
  },
  {
    id: "06_moment_humain",
    fr: "L’humain",
    en: "Human connection",
    position: "human",
  },
] as const;

/** Supplied original media only; the concept image is never rendered. */
export function CinematicCollage({ lang }: { lang: Locale }) {
  const surface = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const portrait = heroPortrait;

  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const allowed = matchMedia(
      "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine) and (min-width: 901px)",
    );
    let frame = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      element.style.removeProperty("--collage-x");
      element.style.removeProperty("--collage-y");
    };
    const move = (event: PointerEvent) => {
      if (!allowed.matches) return;
      const rect = element.getBoundingClientRect();
      const x = Math.max(
        -8,
        Math.min(8, ((event.clientX - rect.left) / rect.width - 0.5) * 16),
      );
      const y = Math.max(
        -8,
        Math.min(8, ((event.clientY - rect.top) / rect.height - 0.5) * 16),
      );
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty("--collage-x", `${x}px`);
        element.style.setProperty("--collage-y", `${y}px`);
      });
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", reset);
    allowed.addEventListener("change", reset);
    return () => {
      reset();
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", reset);
      allowed.removeEventListener("change", reset);
    };
  }, []);

  return (
    <figure
      ref={surface}
      className="cinematic-collage"
      style={heroPortraitStyle(portrait)}
      aria-label={
        lang === "fr"
          ? "Regards croisés — archives personnelles"
          : "Shared perspectives — personal archives"
      }
    >
      <div className="cinematic-archive-layer" aria-hidden="true">
        <Image
          src="/assets/home-cinematic/archive/07_archive_rouge_et_or-bw.webp"
          width={1100}
          height={1536}
          alt=""
          sizes="(max-width: 900px) 50vw, 350px"
        />
      </div>
      <div className="cinematic-portrait">
        <Image
          src={portrait.src}
          width={portrait.width}
          height={portrait.height}
          alt={portrait.alt[lang]}
          unoptimized
          loading="eager"
        />
      </div>
      <div
        className="cinematic-moments"
        role="group"
        aria-label={
          lang === "fr"
            ? "Mettre une archive en lumière"
            : "Highlight an archive"
        }
      >
        {moments.map((moment) => {
          const photo = photograph(moment.id, lang);
          const selected = active === moment.id;
          return (
            <button
              type="button"
              key={moment.id}
              className={`cinematic-moment cinematic-moment--${moment.position}`}
              aria-pressed={selected}
              aria-label={`${lang === "fr" ? "Mettre en lumière" : "Highlight"} : ${moment[lang]}`}
              onClick={() => setActive(selected ? null : moment.id)}
            >
              <Image
                src={`/assets/home-cinematic/archive/${moment.id}-bw.webp`}
                width={photo.width}
                height={photo.height}
                alt={photo.alt}
                sizes="(max-width: 500px) 110px, 160px"
              />
              <span>{moment[lang]}</span>
            </button>
          );
        })}
      </div>
      <figcaption>{archiveLabel(lang)}</figcaption>
    </figure>
  );
}
