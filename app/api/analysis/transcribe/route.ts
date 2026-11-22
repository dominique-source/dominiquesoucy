import { get as getBlob, del as delBlob } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";
import { session, sameOrigin } from "@/lib/studio/auth";
import { get as getStore, del as delStore, limit } from "@/lib/studio/store";
import { MAX_MEDIA_BYTES, parseSegments, validMediaPath } from "@/lib/analysis/media";

export const runtime = "nodejs";
export const maxDuration = 120;
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });
const inputSchema = z.object({
  pathname: z.string().max(210),
  lang: z.enum(["fr", "en"]),
  consent: z.literal(true),
}).strict();

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "ORIGIN_DENIED" }, 403);
  const user = await session().catch(() => null);
  if (!user) return json({ error: "UNAUTHORIZED" }, 401);
  if (!process.env.OPENAI_API_KEY) return json({ error: "AI_NOT_CONFIGURED" }, 503);
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID)
    return json({ error: "BLOB_NOT_CONFIGURED" }, 503);
  if (Number(request.headers.get("content-length") || 0) > 2048)
    return json({ error: "BAD_REQUEST" }, 413);
  let input: unknown;
  try { input = await request.json(); }
  catch { return json({ error: "BAD_REQUEST" }, 400); }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success || !validMediaPath(parsed.data.pathname))
    return json({ error: "BAD_REQUEST" }, 400);
  const { pathname, lang } = parsed.data;
  if ((await getStore(`media-owner:${pathname}`).catch(() => null)) !== user.key)
    return json({ error: "MEDIA_NOT_OWNED" }, 403);
  if (!(await limit(`transcribe:${user.key}`, 6, 3600).catch(() => false)))
    return json({ error: "RATE_LIMITED" }, 429);
  try {
    const blob = await getBlob(pathname, { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200 || !blob.stream)
      return json({ error: "MEDIA_NOT_FOUND" }, 404);
    if (blob.blob.size <= 0 || blob.blob.size > MAX_MEDIA_BYTES)
      return json({ error: "MEDIA_TOO_LARGE" }, 413);
    const file = new File([await new Response(blob.stream).arrayBuffer()],
      pathname.split("/").pop() || "session.mp4", { type: blob.blob.contentType || "application/octet-stream" });
    const form = new FormData();
    form.set("file", file);
    form.set("model", "gpt-4o-transcribe-diarize");
    form.set("response_format", "diarized_json");
    form.set("chunking_strategy", "auto");
    form.set("language", lang);
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(105000),
    });
    if (!response.ok) return json({ error: "TRANSCRIPTION_PROVIDER_FAILED" }, 502);
    const data = await response.json();
    if (typeof data.text !== "string" || !data.text.trim())
      return json({ error: "TRANSCRIPTION_EMPTY" }, 502);
    const segments = parseSegments(data.segments);
    // Keep the original source wording intact for exact quote verification.
    // Segment speaker IDs are anonymous; never assume one of them is Dominique.
    const transcript = data.text.slice(0, 26000);
    return json({ transcript, segments, truncated: data.text.length > 26000,
      notice: "PRIVATE_REVIEW_REQUIRED" });
  } catch {
    return json({ error: "TRANSCRIPTION_UNAVAILABLE" }, 503);
  } finally {
    // Don't retain the media file server-side once processed.
    await delBlob(pathname).catch(() => {});
    await delStore(`media-owner:${pathname}`).catch(() => {});
  }
}
