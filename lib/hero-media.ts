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
};

/** Replace this configuration only when an approved portrait becomes available. */
export const heroPortrait: HeroPortrait = {
  src: "/assets/dominique/originals/05_portrait_ballon.jpg",
  width: 512,
  height: 512,
  alt: {
    fr: "Portrait rapproché de Dominique Soucy souriant, en noir et blanc.",
    en: "Close-up black-and-white portrait of Dominique Soucy smiling.",
  },
  desktopCrop: {
    objectPosition: "50% 0%",
    scale: 1.65,
    excludeBottom: 34,
    offsetY: "8%",
  },
  mobileCrop: {
    objectPosition: "50% 0%",
    scale: 1.65,
    excludeBottom: 34,
    offsetY: "2%",
  },
  monochrome: true,
  maxRenderedWidth: 720,
};

export function heroPortraitStyle(media: HeroPortrait): CSSProperties {
  const crops = { desktop: media.desktopCrop, mobile: media.mobileCrop };
  const values: Record<string, string | number> = {
    "--portrait-max-width": `${media.maxRenderedWidth / media.desktopCrop.scale}px`,
    "--portrait-mobile-max-width": `${media.maxRenderedWidth / media.mobileCrop.scale}px`,
    "--portrait-monochrome": media.monochrome ? 1 : 0,
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
