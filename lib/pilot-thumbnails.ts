import { pilotVideo } from "./config";
import { videoSource } from "./video";
import type { Locale } from "./i18n";

export type ThumbnailStyle = "question" | "manifesto" | "documentary";
export type PilotThumbnail = {
  id: string;
  style: ThumbnailStyle;
  title: Record<Locale, readonly [string, string]>;
  image: { src: string; position: string; fit?: "cover" | "contain" };
  videoUrl: string;
  episodeLabel: Record<Locale, string>;
  subtitle?: Record<Locale, string>;
  /** Optional published editorial page for a future video. */
  watchPath?: `/${string}`;
};
const episodeLabel = { fr: "PILOTE / ÉPISODE 00", en: "PILOT / EPISODE 00" };
export const thumbnailStyleLabels = {
  question: { fr: "La question", en: "The question" },
  manifesto: { fr: "Le manifeste", en: "The manifesto" },
  documentary: { fr: "La confrontation", en: "The confrontation" },
};
export const pilotThumbnails: readonly PilotThumbnail[] = [
  {
    id: "pilot-question",
    style: "question",
    title: {
      fr: ["ET SI ON SE", "TROMPAIT?"],
      en: ["WHAT IF WE", "WERE WRONG?"],
    },
    image: {
      src: "/assets/dominique/originals/02_portrait_chemise_bleue.jpg",
      position: "50% 20%",
    },
    videoUrl: pilotVideo.videoUrl,
    episodeLabel,
    subtitle: { fr: "Remettre en doute nos certitudes sur le sport.", en: "Questioning what we think we know about sport." },
  },
  {
    id: "pilot-manifesto",
    style: "manifesto",
    title: {
      fr: ["LE SPORT EST", "UN MIROIR."],
      en: ["SPORT IS", "A MIRROR."],
    },
    image: {
      src: "/assets/dominique/originals/05_portrait_ballon.jpg",
      position: "50% 10%",
    },
    videoUrl: pilotVideo.videoUrl,
    episodeLabel,
    subtitle: { fr: "Ce que le sport révèle vraiment de nous.", en: "What sport really reveals about us." },
  },
  {
    id: "pilot-confrontation",
    style: "documentary",
    title: { fr: ["LE SPORT.", "VRAIMENT?"], en: ["SPORT.", "REALLY?"] },
    image: {
      src: "/assets/dominique/originals/07_archive_rouge_et_or.jpg",
      position: "50% 50%",
      fit: "contain",
    },
    videoUrl: pilotVideo.videoUrl,
    episodeLabel,
    subtitle: { fr: "Confronter les idées, les mythes et la réalité du sport.", en: "Confronting ideas, myths, and the reality of sport." },
  },
];

/** Current cards share one player; future media uses its editorial page or safe original URL. */
export function thumbnailDestination(entry: PilotThumbnail) {
  const source = videoSource(entry.videoUrl);
  if (!source) throw new Error(`Unsupported thumbnail video: ${entry.id}`);
  if (source.src === videoSource(pilotVideo.videoUrl)?.src) return "#pilote";
  if (entry.watchPath) {
    if (!/^\/(fr|en)\//.test(entry.watchPath) || entry.watchPath.includes("\\"))
      throw new Error(
        "Thumbnail watch pages must be local FR/EN editorial paths",
      );
    return entry.watchPath;
  }
  return entry.videoUrl;
}
