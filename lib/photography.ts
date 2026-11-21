import manifest from "@/public/assets/dominique/assets-manifest.json";
import type { Locale } from "./i18n";
const details = {
  "01_basket_action_archive": {
    width: 178,
    height: 282,
    alt: {
      fr: "Dominique Soucy en action sur un terrain de basketball.",
      en: "Dominique Soucy in action on a basketball court.",
    },
  },
  "02_portrait_chemise_bleue": {
    width: 447,
    height: 447,
    alt: {
      fr: "Dominique Soucy souriant, en chemise bleue.",
      en: "Dominique Soucy smiling in a blue shirt.",
    },
  },
  "03_moment_communautaire": {
    width: 447,
    height: 447,
    alt: {
      fr: "Dominique Soucy et une participante, lors d’un moment partagé en plein air.",
      en: "Dominique Soucy and a participant sharing a moment outdoors.",
    },
  },
  "04_equipe_purathlete": {
    width: 1620,
    height: 1080,
    alt: {
      fr: "Trois hommes réunis sur un terrain extérieur, portant des vêtements PürAthlete.",
      en: "Three men together on an outdoor field, wearing PürAthlete clothing.",
    },
  },
  "05_portrait_ballon": {
    width: 512,
    height: 512,
    alt: {
      fr: "Dominique Soucy souriant, un ballon entre les mains.",
      en: "Dominique Soucy smiling with a ball in his hands.",
    },
  },
  "06_moment_humain": {
    width: 773,
    height: 762,
    alt: {
      fr: "Dominique Soucy et un enfant regardent ensemble vers une table.",
      en: "Dominique Soucy and a child looking together toward a table.",
    },
  },
  "07_archive_rouge_et_or": {
    width: 1100,
    height: 1536,
    alt: {
      fr: "Photo d’archive de Dominique Soucy avec un ballon, sous les couleurs du Rouge et Or; signature et marques d’origine conservées.",
      en: "Archival photograph of Dominique Soucy holding a basketball in Rouge et Or colours; original signature and marks preserved.",
    },
  },
} as const;
export type PhotoId = keyof typeof details;
export function photograph(
  id: PhotoId,
  lang: Locale,
  variant: "original" | "vintage" = "original",
) {
  const entry = manifest.photos.find((photo) => photo.id === id);
  if (!entry) throw new Error(`Missing photograph: ${id}`);
  return { ...details[id], alt: details[id].alt[lang], src: entry[variant] };
}
export const archiveLabel = (lang: Locale) =>
  lang === "fr"
    ? "Archives personnelles · Dominique Soucy"
    : "Personal archives · Dominique Soucy";
