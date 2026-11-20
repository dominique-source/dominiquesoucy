export const videoOrientations = ["portrait", "landscape", "square"] as const;
export type VideoOrientation = (typeof videoOrientations)[number];
export const videoLayouts = ["featured", "article", "card"] as const;
export type VideoLayout = (typeof videoLayouts)[number];
export type VideoDimensions = { width: number; height: number };
export const videoRatios: Record<VideoOrientation, string> = {
  portrait: "9 / 16",
  landscape: "16 / 9",
  square: "1 / 1",
};
// Dimensions must come from inspected source metadata, never from a provider URL.
export function resolveVideoOrientation(
  override?: VideoOrientation,
  dimensions?: VideoDimensions,
): VideoOrientation {
  if (override) return override;
  if (
    !dimensions ||
    !Number.isFinite(dimensions.width) ||
    !Number.isFinite(dimensions.height) ||
    dimensions.width <= 0 ||
    dimensions.height <= 0
  )
    return "landscape";
  return dimensions.width === dimensions.height
    ? "square"
    : dimensions.width < dimensions.height
      ? "portrait"
      : "landscape";
}
export function localVideoPoster(value?: string | null): string | undefined {
  return value && /^\/assets\/(?!.*\.\.)[^?#]+$/.test(value)
    ? value
    : undefined;
}
