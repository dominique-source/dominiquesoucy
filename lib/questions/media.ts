import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import ffprobe from "@ffprobe-installer/ffprobe";
import { put, get, del } from "@vercel/blob";
import { limits } from "./schema";
const run = promisify(execFile);
export function mediaSignature(b: Buffer) {
  if (b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])))
    return "webm";
  if (b.toString("ascii", 4, 8) === "ftyp") return "mp4";
  if (
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WAVE"
  )
    return "wav";
  if (
    b.toString("ascii", 0, 3) === "ID3" ||
    (b[0] === 255 && (b[1] & 224) === 224)
  )
    return "mp3";
  if (b.toString("ascii", 0, 4) === "OggS") return "ogg";
  throw new Error("INVALID_MEDIA");
}
export async function inspectMedia(file: File, format: "audio" | "video") {
  if (file.size > limits.maxBytes || file.size < 32)
    throw new Error("MEDIA_SIZE");
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = mediaSignature(bytes);
  const temp = await mkdtemp(join(tmpdir(), "ds-media-"));
  try {
    const path = join(temp, `input.${ext}`);
    await writeFile(path, bytes);
    const { stdout } = await run(
      ffprobe.path,
      [
        "-v",
        "error",
        "-protocol_whitelist",
        "file,pipe",
        "-show_entries",
        "stream=codec_type,width,height:packet=pts_time,duration_time",
        "-of",
        "json",
        path,
      ],
      { timeout: 10000, maxBuffer: 2_000_000 },
    ).catch(() => {
      throw new Error("INVALID_MEDIA");
    });
    const data = JSON.parse(stdout) as {
      streams?: { codec_type: string; width?: number; height?: number }[];
      packets?: { pts_time?: string; duration_time?: string }[];
    };
    const kinds = data.streams?.map((s) => s.codec_type) || [];
    if (
      !kinds.includes("audio") ||
      kinds.some((k) => k !== "audio" && k !== "video") ||
      (format === "audio" && kinds.includes("video")) ||
      (format === "video" && !kinds.includes("video"))
    )
      throw new Error("INVALID_MEDIA");
    const times = (data.packets || [])
      .filter((p) => Number.isFinite(Number(p.pts_time)))
      .map((p) => ({
        start: Number(p.pts_time),
        end: Number(p.pts_time) + Number(p.duration_time || 0),
      }));
    if (!times.length) throw new Error("INVALID_MEDIA");
    const duration =
      Math.max(...times.map((p) => p.end)) -
      Math.min(...times.map((p) => p.start));
    if (duration <= 0 || duration > limits[format] + 0.5)
      throw new Error("MEDIA_DURATION");
    const mime =
      ext === "mp4"
        ? `${format}/mp4`
        : ext === "webm"
          ? `${format}/webm`
          : ext === "mp3"
            ? "audio/mpeg"
            : ext === "wav"
              ? "audio/wav"
              : "audio/ogg";
    const scanner = process.env.QUESTIONS_MEDIA_SCAN_URL;
    if (scanner) {
      if (!scanner.startsWith("https://"))
        throw new Error("MEDIA_SCAN_UNAVAILABLE");
      const r = await fetch(scanner, {
        method: "POST",
        headers: {
          "Content-Type": mime,
          Authorization: `Bearer ${process.env.QUESTIONS_MEDIA_SCAN_TOKEN || ""}`,
        },
        body: bytes,
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) throw new Error("MEDIA_SCAN_UNAVAILABLE");
      if ((await r.json()).allowed !== true) throw new Error("UNSAFE_MEDIA");
    } else if (process.env.VERCEL || process.env.NODE_ENV === "production")
      throw new Error("MEDIA_SCAN_NOT_CONFIGURED");
    const video = data.streams?.find((s) => s.codec_type === "video");
    return {
      bytes,
      mime,
      duration,
      ext,
      width: video?.width || null,
      height: video?.height || null,
    };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
export async function storeMedia(bytes: Buffer, ext: string, mime: string) {
  const id = randomUUID();
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const result = await put(`questions/${id}.${ext}`, bytes, {
      access: "private",
      contentType: mime,
      addRandomSuffix: false,
    });
    return result.pathname;
  }
  if (process.env.VERCEL || process.env.NODE_ENV === "production")
    throw new Error("MEDIA_STORAGE_NOT_CONFIGURED");
  await mkdir(resolve(".data/media"), { recursive: true });
  const key = `${id}.${ext}`;
  await writeFile(resolve(".data/media", key), bytes);
  return key;
}
export async function readMedia(key: string) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const r = await get(key, { access: "private" });
    if (!r || !r.stream) throw new Error("MEDIA_NOT_FOUND");
    return Buffer.from(await new Response(r.stream).arrayBuffer());
  }
  if (process.env.VERCEL || process.env.NODE_ENV === "production")
    throw new Error("MEDIA_STORAGE_NOT_CONFIGURED");
  if (!/^[a-f0-9-]+\.(webm|mp4|mp3|wav|ogg)$/.test(key))
    throw new Error("INVALID_MEDIA");
  return readFile(resolve(".data/media", key));
}
export async function deleteMedia(key: string) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await del(key);
    return;
  }
  if (process.env.VERCEL || process.env.NODE_ENV === "production")
    throw new Error("MEDIA_STORAGE_NOT_CONFIGURED");
  if (!/^[a-f0-9-]+\.(webm|mp4|mp3|wav|ogg)$/.test(key))
    throw new Error("INVALID_MEDIA");
  await rm(resolve(".data/media", key), { force: true });
}
