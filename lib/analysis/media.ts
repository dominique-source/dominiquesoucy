/** MIME checks and limits for private media imports. */
export const MAX_MEDIA_BYTES = 24_000_000; // OpenAI Transcriptions accepts up to 25 MB.
export const mediaTypes = [
  "audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a",
  "audio/m4a", "audio/wav", "audio/x-wav", "audio/webm",
  "audio/ogg", "audio/flac", "video/mp4", "video/webm",
  "video/mpeg",
] as const;
export const mediaExtensions = ["mp3", "mp4", "m4a", "mpeg", "mpga", "wav", "webm", "ogg", "flac"] as const;
export function isMediaFile(name: string, type: string, size: number) {
  const extension = name.toLowerCase().split(".").pop();
  return size > 0 && size <= MAX_MEDIA_BYTES &&
    mediaExtensions.some((ext) => ext === extension) &&
    (mediaTypes.some((mime) => mime === type) || type === "" || type === "application/octet-stream");
}
export function validMediaPath(pathname: string) {
  return /^private-studio\/[a-f0-9-]{36}\/[a-zA-Z0-9_.-]{1,100}\.(mp3|mp4|m4a|mpeg|mpga|wav|webm|ogg|flac)$/i.test(pathname) &&
    !pathname.includes("..");
}
export function parseSegments(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v): Array<{ start: number; end: number; speaker: string; text: string }> => {
    if (!v || typeof v !== "object") return [];
    const x = v as Record<string, unknown>;
    if (typeof x.start !== "number" || typeof x.end !== "number" ||
        x.start < 0 || x.end < x.start || typeof x.text !== "string") return [];
    return [{
      start: x.start, end: x.end,
      speaker: typeof x.speaker_id === "string" ? x.speaker_id.slice(0, 40) : "speaker",
      text: x.text,
    }];
  }).slice(0, 1500);
}
