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
  mobileMaxRenderedWidth?: number;
  silhouetteMask?: string;
  fadeStart?: number;
};

/** Replace this configuration only when an approved portrait becomes available. */
export const heroPortrait: HeroPortrait = {
  // The immersive hero uses the original ball portrait, NOT the formal shirt headshot.
  // The ball is excluded through CSS cropping; the authentic face is never regenerated.
  src: "/assets/dominique/originals/05_portrait_ballon.jpg",
  width: 512,
  height: 512,
  alt: {
    fr: "Portrait en gros plan de Dominique Soucy souriant, en noir et blanc.",
    en: "Close-up black-and-white portrait of Dominique Soucy smiling.",
  },
  desktopCrop: {
    objectPosition: "56% 0%",
    scale: 2.8,
    excludeBottom: 46,
    offsetY: "-10%",
  },
  mobileCrop: {
    objectPosition: "56% 0%",
    scale: 3.1,
    excludeBottom: 46,
    offsetY: "-20%",
  },
  monochrome: true,
  maxRenderedWidth: 1200,
  mobileMaxRenderedWidth: 1050,
  // The shirt-headshot silhouette mask cannot be reused on a different source.
  silhouetteMask: undefined,
  fadeStart: 48,
};

export function heroPortraitStyle(media: HeroPortrait): CSSProperties {
  const crops = { desktop: media.desktopCrop, mobile: media.mobileCrop };
  const values: Record<string, string | number> = {
    "--portrait-max-width": `${media.maxRenderedWidth / media.desktopCrop.scale}px`,
    "--portrait-mobile-max-width": `${(media.mobileMaxRenderedWidth ?? media.maxRenderedWidth) / media.mobileCrop.scale}px`,
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

export type StudioUniverseConfig = {
  image: { src: string; width: number; height: number };
  alt: Record<Locale, string>;
  slogan: Record<Locale, readonly [string, string]>;
  presentation: Record<Locale, "embedded" | "caption">;
  desktopCrop: { position: string; fit: "contain" | "cover"; ratio: string };
  mobileCrop: { position: string; fit: "contain" | "cover"; ratio: string };
  motion?: { enabled: boolean; durationMs: number; parallaxPx: number };
};
export const studioUniverse: StudioUniverseConfig = {
  image: {
    src: "/assets/studio/studio-universe.png",
    width: 1672,
    height: 941,
  },
  alt: {
    fr: "Composition de studio cinématographique : fauteuil en cuir brun, caméra, boîte à lumière et collage sportif noir et blanc aux accents lime.",
    en: "Cinematic studio artwork with a brown leather chair, camera, softbox and a black-and-white sports collage with lime accents.",
  },
  slogan: {
    fr: ["Bienvenue dans", "mon univers"],
    en: ["Welcome to", "my world"],
  },
  // French lettering is embedded in the supplied artwork. EN translation stays outside it.
  presentation: { fr: "embedded", en: "caption" },
  desktopCrop: { position: "50% 50%", fit: "contain", ratio: "1672 / 941" },
  mobileCrop: { position: "50% 50%", fit: "contain", ratio: "1672 / 941" },
  motion: { enabled: true, durationMs: 900, parallaxPx: 6 },
};

/** The same supplied studio artwork, decorative only behind the main introduction. */
export const heroAtmosphere = {
  enabled: true,
  src: studioUniverse.image.src,
  opacity: 0.09,
  desktopPosition: "50% 45%",
  mobilePosition: "52% 45%",
};
