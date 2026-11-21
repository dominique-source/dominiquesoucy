import { pilotVideo } from "./config";
import type { Locale } from "./i18n";
import type { CSSProperties } from "react";

export type HeroCrop = {
  objectPosition: string;
  scale: number;
  /** Clip source pixels from the bottom before scaling (0–100%). */
  excludeBottom: number;
  offsetY: string;
};
export type HeroPortrait = {
  src: string;
  width: number;
  height: number;
  alt: Record<Locale, string>;
  desktopCrop: HeroCrop;
  mobileCrop: HeroCrop;
  monochrome?: boolean;
  /** Upper bound for the rendered full image, before clipping. */
  maxRenderedWidth: number;
  silhouetteMask?: string;
  fadeStart?: number;
};

/** Replace this configuration only when an approved portrait becomes available. */
export const heroPortrait: HeroPortrait = {
  src: "/assets/dominique/originals/02_portrait_chemise_bleue.jpg",
  width: 447,
  height: 447,
  alt: {
    fr: "Portrait rapproché de Dominique Soucy souriant, en noir et blanc.",
    en: "Close-up black-and-white portrait of Dominique Soucy smiling.",
  },
  desktopCrop: {
    objectPosition: "24% 0%",
    scale: 2.1,
    excludeBottom: 28,
    offsetY: "-16%",
  },
  mobileCrop: {
    objectPosition: "24% 0%",
    scale: 2.1,
    excludeBottom: 28,
    offsetY: "-10%",
  },
  monochrome: true,
  maxRenderedWidth: 900,
  silhouetteMask: "/assets/dominique/masks/02-portrait-silhouette.svg",
  fadeStart: 62,
};

export function heroPortraitStyle(media: HeroPortrait): CSSProperties {
  const crops = { desktop: media.desktopCrop, mobile: media.mobileCrop };
  const values: Record<string, string | number> = {
    "--portrait-max-width": `${media.maxRenderedWidth / media.desktopCrop.scale}px`,
    "--portrait-mobile-max-width": `${media.maxRenderedWidth / media.mobileCrop.scale}px`,
    "--portrait-monochrome": media.monochrome ? 1 : 0,
    "--portrait-silhouette": media.silhouetteMask
      ? `url("${media.silhouetteMask}")`
      : "linear-gradient(#000, #000)",
    "--portrait-fade-start": `${media.fadeStart ?? 48}%`,
    "--portrait-ratio": `${media.width} / ${media.height}`,
  };
  for (const [key, crop] of Object.entries(crops)) {
    values[`--portrait-${key}-position`] = crop.objectPosition;
    values[`--portrait-${key}-scale`] = crop.scale;
    values[`--portrait-${key}-clip`] = `${crop.excludeBottom}%`;
    values[`--portrait-${key}-offset`] = crop.offsetY;
  }
  return values as CSSProperties;
}

export type CinematicPosterConfig = {
  src: string;
  position: { desktop: string; mobile: string };
  alt: Record<Locale, string>;
  title: Record<Locale, string>;
  episode: Record<Locale, string>;
  playLabel: Record<Locale, string>;
  photoCredit: Record<Locale, string>;
  providerNotice: Record<Locale, string>;
  visible: boolean;
  autoplayOnActivate: boolean;
  videoUrl: string;
};
/** Temporary authentic archive portrait, never represented as a frame from the pilot. */
export const pilotPoster: CinematicPosterConfig = {
  src: "/assets/dominique/originals/05_portrait_ballon.jpg",
  position: { desktop: "52% 16%", mobile: "52% 16%" },
  alt: {
    fr: "Dominique Soucy souriant, photographié en plein air.",
    en: "Dominique Soucy smiling outdoors.",
  },
  title: { fr: "PILOTE", en: "PILOT" },
  episode: { fr: "ÉPISODE 00", en: "EPISODE 00" },
  playLabel: {
    fr: "Regarder le pilote — Épisode 00",
    en: "Watch the pilot — Episode 00",
  },
  photoCredit: {
    fr: "Visuel d’affiche · photographie d’archives",
    en: "Poster artwork · archive photograph",
  },
  providerNotice: {
    fr: "La lecture se lance sur YouTube après votre activation.",
    en: "Playback connects to YouTube after you activate the video.",
  },
  visible: true,
  autoplayOnActivate: true,
  videoUrl: pilotVideo.videoUrl,
};
