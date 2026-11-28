function waitForFrame(video: HTMLVideoElement, event: "loadeddata" | "seeked", load: () => void) {
  return new Promise<void>((resolve, reject) => {
    const controller = new AbortController();
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      controller.abort();
      if (error) reject(error);
      else resolve();
    };
    const timeout = window.setTimeout(() => finish(new Error("Vidéo illisible ou trop lente / Video could not be decoded in time.")), 12000);
    const options = { signal: controller.signal };
    video.addEventListener(event, () => finish(), options);
    video.addEventListener("error", () => finish(new Error("Format vidéo illisible / Unsupported video format.")), options);
    load();
  });
}

export async function exportReelCover(master: File, seconds: number, headline: string, filename: string) {
  const src = URL.createObjectURL(master);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    await waitForFrame(video, "loadeddata", () => { video.src = src; });
    if (seconds < 0 || !Number.isFinite(seconds) || seconds >= video.duration) {
      throw new Error("Image hors de la durée du master / Frame outside the source video.");
    }
    if (seconds !== video.currentTime) await waitForFrame(video, "seeked", () => { video.currentTime = seconds; });
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx || !video.videoWidth || !video.videoHeight) throw new Error("Image indisponible / Frame unavailable.");
    const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
    const width = video.videoWidth * scale;
    const height = video.videoHeight * scale;
    ctx.drawImage(video, (canvas.width-width)/2, (canvas.height-height)/2, width, height);
    const fade = ctx.createLinearGradient(0, 760, 0, 1730);
    fade.addColorStop(0, "transparent");
    fade.addColorStop(1, "#0a0a0a");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 760, 1080, 1160);
    const words = headline.trim().toUpperCase().split(/\s+/);
    let lines: string[] = [];
    let size = 103;
    for (; size >= 32; size -= 3) {
      ctx.font = `italic 900 ${size}px Impact, Arial, sans-serif`;
      lines = [];
      for (const word of words) {
        const last = lines.at(-1);
        const next = last ? last + " " + word : word;
        if (last && ctx.measureText(next).width <= 930) lines[lines.length - 1] = next;
        else lines.push(word);
      }
      if (lines.length <= 3) break;
    }
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#ccff00";
    ctx.fillRect(75, 1498, 126, 8);
    lines.forEach((line, index) => {
      ctx.fillStyle = index === lines.length - 1 ? "#ccff00" : "#f4f4ef";
      ctx.fillText(line, 75, 1465 - (lines.length - 1 - index) * (size + 8), 930);
    });
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.94));
    if (!blob) throw new Error("Export JPG impossible / JPG export failed.");
    const download = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = download;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(download), 1500);
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(src);
  }
}
