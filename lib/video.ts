export function videoSource(
  raw: string,
): { kind: "embed" | "file"; src: string } | null {
  if (
    raw.startsWith("/assets/") &&
    !raw.includes("..") &&
    /\.(mp4|webm)$/i.test(raw)
  )
    return { kind: "file", src: raw };
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "");
  if (["youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)) {
    const id =
      host === "youtu.be"
        ? u.pathname.slice(1)
        : (u.searchParams.get("v") ?? u.pathname.split("/").pop());
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id)
      ? { kind: "embed", src: `https://www.youtube-nocookie.com/embed/${id}` }
      : null;
  }
  if (["vimeo.com", "player.vimeo.com"].includes(host)) {
    const id = u.pathname.split("/").pop();
    return id && /^\d+$/.test(id)
      ? { kind: "embed", src: `https://player.vimeo.com/video/${id}` }
      : null;
  }
  return /\.(mp4|webm)$/i.test(u.pathname)
    ? { kind: "file", src: u.href }
    : null;
}

/** Called only after explicit activation; legacy embeds remain unchanged. */
export function activatedEmbedUrl(src: string, autoplay: boolean) {
  if (!autoplay) return src;
  const url = new URL(src);
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("controls", "1");
  return url.href;
}
