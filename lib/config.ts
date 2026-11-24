export function httpsUrl(value: string | undefined) {
  if (!value) return undefined;
  const url = new URL(value);
  if (url.protocol !== "https:")
    throw new Error("Configured public links must use HTTPS");
  return url.href;
}
export const site = {
  name: "Dominique Soucy",
  url: httpsUrl(process.env.SITE_URL) ?? "https://dominiquesoucy.com",
  purinstinct: httpsUrl(process.env.PURINSTINCT_URL),
  social: [
    ["Instagram", process.env.INSTAGRAM_URL],
    ["Facebook", process.env.FACEBOOK_URL],
    ["YouTube", process.env.YOUTUBE_URL],
  ].flatMap(([name, url]) =>
    url ? [{ name: name!, url: httpsUrl(url)! }] : [],
  ),
};
// Only approved photography belongs here. Paths are relative to public/.
export const media: {
  portrait: {
    src: string;
    alt: Record<"fr" | "en", string>;
    position?: string;
    mobilePosition?: string;
  } | null;
} = { portrait: null };
export const signature =
  "Imagine vouloir tenter de prendre au sérieux la société dans laquelle tu vis, voter, et ensuite voir ça…";

// The pilot is a media configuration, not an article with invented publishing data.
export const pilotVideo = {
  videoUrl: "https://youtu.be/4uFh1vsihw4",
  orientation: "portrait" as const,
  layout: "featured" as const,
  label: "PILOTE — ÉPISODE 00",
  // Set only after the approved white-shirt original is added under public/assets/.
  poster: null as string | null,
};
