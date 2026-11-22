import { z } from "zod";
import { sameOrigin, session } from "@/lib/studio/auth";
import { database, throttle } from "@/lib/questions/db";
import { identity, issueNonce, checkNonce } from "@/lib/questions/identity";
import { questionInput, replyInput, limits } from "@/lib/questions/schema";
import * as repo from "@/lib/questions/repository";
import {
  inspectMedia,
  storeMedia,
  readMedia,
  deleteMedia,
} from "@/lib/questions/media";
export const runtime = "nodejs";
export const maxDuration = 60;
const headers = {
  "Cache-Control": "no-store, private",
  "X-Content-Type-Options": "nosniff",
};
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers });
}
function failure(e: unknown) {
  if (e instanceof z.ZodError || e instanceof SyntaxError)
    return json({ error: "INVALID_INPUT" }, 400);
  const error = e instanceof Error ? e.message : "UNAVAILABLE";
  const known = [
    "RATE_LIMITED",
    "NOT_FOUND",
    "FORBIDDEN",
    "INVALID_FORM",
    "VISITOR_REQUIRED",
    "PERSONAL_DATA_OR_LINK",
    "UNSAFE_TEXT",
    "INVALID_MEDIA",
    "MEDIA_SIZE",
    "MEDIA_DURATION",
    "UNSAFE_MEDIA",
    "MEDIA_SCAN_NOT_CONFIGURED",
    "MEDIA_SCAN_UNAVAILABLE",
    "MEDIA_STORAGE_NOT_CONFIGURED",
    "DATABASE_NOT_CONFIGURED",
    "PRIVACY_NOT_CONFIGURED",
    "DUPLICATE_QUESTION",
    "POSTING_PAUSED",
    "FEED_HIDDEN",
    "CONFLICT_REFRESH",
    "INVALID_SHOW",
  ];
  const safe = known.includes(error) ? error : "UNAVAILABLE";
  return json(
    { error: safe },
    safe === "RATE_LIMITED"
      ? 429
      : safe === "NOT_FOUND"
        ? 404
        : safe === "FORBIDDEN"
          ? 403
          : safe === "DUPLICATE_QUESTION" || safe === "CONFLICT_REFRESH"
            ? 409
            : /CONFIGURED|UNAVAILABLE|PAUSED|FEED_HIDDEN/.test(safe)
              ? 503
              : 400,
  );
}
function filters(url: URL) {
  return {
    search: (url.searchParams.get("q") || "").slice(0, 100),
    topic: (url.searchParams.get("topic") || "").slice(0, 40),
    format: url.searchParams.get("format") || "",
    sort: url.searchParams.get("sort") || "recent",
    date: url.searchParams.get("date") || "",
    id: url.searchParams.get("id") || undefined,
    offset: Number(url.searchParams.get("offset")) || 0,
  };
}
async function bounded(request: Request, max: number) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new Error("MEDIA_SIZE");
      }
      chunks.push(r.value);
    }
    return Buffer.concat(chunks);
  } finally {
    reader.releaseLock();
  }
}
export async function GET(
  r: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    const url = new URL(r.url);
    if (action === "bootstrap") {
      await database();
      const who = await identity(r, true);
      return json({
        nonce: await issueNonce(who.owner),
        limits,
        local: !process.env.VERCEL && process.env.NODE_ENV !== "production",
        turnstileKey: process.env.NEXT_PUBLIC_QUESTIONS_TURNSTILE_KEY || null,
      });
    }
    if (action === "feed") {
      let owner = "";
      try {
        owner = (await identity(r)).owner;
      } catch {}
      const result = await repo.feed(filters(url), owner);
      return json({
        ...result,
        ...(url.searchParams.get("id")
          ? { replies: await repo.replies(url.searchParams.get("id")!) }
          : {}),
      });
    }
    if (action === "admin" || action === "presentation") {
      if (!(await session())) return json({ error: "UNAUTHORIZED" }, 401);
      const result = await repo.privateFeed(filters(url));
      const selected = await repo.selectedQuestions();
      return json({ ...result, selected });
    }
    if (action === "media") {
      const id = z.uuid().parse(url.searchParams.get("id"));
      const privateView = url.searchParams.get("private") === "1";
      if (privateView && !(await session()))
        return json({ error: "UNAUTHORIZED" }, 401);
      const media = await repo.mediaRecord(id, privateView);
      if (!media) throw new Error("NOT_FOUND");
      const bytes = await readMedia(String(media.storage_key));
      const range = r.headers.get("range");
      const common = {
        ...headers,
        "Content-Type": String(media.mime),
        "Accept-Ranges": "bytes",
        "Content-Disposition": "inline; filename=question-media",
      };
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match)
          return new Response(null, {
            status: 416,
            headers: { ...common, "Content-Range": `bytes */${bytes.length}` },
          });
        const start = match[1]
          ? Number(match[1])
          : Math.max(0, bytes.length - Number(match[2]));
        const end = match[1]
          ? match[2]
            ? Math.min(Number(match[2]), bytes.length - 1)
            : bytes.length - 1
          : bytes.length - 1;
        if (start >= bytes.length || start > end)
          return new Response(null, {
            status: 416,
            headers: { ...common, "Content-Range": `bytes */${bytes.length}` },
          });
        return new Response(new Uint8Array(bytes.subarray(start, end + 1)), {
          status: 206,
          headers: {
            ...common,
            "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
            "Content-Length": String(end - start + 1),
          },
        });
      }
      return new Response(new Uint8Array(bytes), {
        headers: { ...common, "Content-Length": String(bytes.length) },
      });
    }
    return json({ error: "NOT_FOUND" }, 404);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(
  r: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  if (!sameOrigin(r)) return json({ error: "ORIGIN_DENIED" }, 403);
  try {
    const { action } = await params;
    if (action === "admin") {
      if (!(await session())) return json({ error: "UNAUTHORIZED" }, 401);
      const raw = JSON.parse((await bounded(r, 160000)).toString());
      const change = z
        .discriminatedUnion("operation", [
          z.object({
            operation: z.literal("curate"),
            id: z.uuid(),
            notes: z.string().max(5000),
            stage: z.enum(["todo", "selected", "used", "archived"]),
          }),
          z.object({
            operation: z.literal("hide"),
            id: z.uuid(),
            hidden: z.boolean(),
          }),
          z.object({ operation: z.literal("remove"), id: z.uuid() }),
          z.object({
            operation: z.literal("show"),
            title: z.string().trim().min(1).max(120),
            items: z.array(z.uuid()).max(100),
            revision: z.number().int().nonnegative(),
          }),
          z.object({
            operation: z.literal("settings"),
            key: z.enum(["paused", "feed_hidden"]),
            value: z.boolean(),
          }),
        ])
        .parse(raw);
      if (change.operation === "curate")
        await repo.curate(change.id, change.notes, change.stage);
      if (change.operation === "hide")
        await repo.hide(change.id, change.hidden);
      if (change.operation === "remove") await repo.remove(change.id);
      if (change.operation === "show")
        await repo.saveShow(change.title, change.items, change.revision);
      if (change.operation === "settings")
        await repo.setSetting(change.key, change.value);
      return json({ ok: true });
    }
    const who = await identity(r);
    await throttle(`all:${who.source}`, 100, 900);
    if (action === "create") {
      const body = await bounded(r, limits.maxBytes + 70000);
      const form = await new Response(new Uint8Array(body), {
        headers: { "Content-Type": r.headers.get("content-type") || "" },
      }).formData();
      const parsed = questionInput.parse(JSON.parse(String(form.get("data"))));
      await checkNonce(who.owner, parsed.nonce);
      await throttle(`post:${who.source}`, 5, 3600);
      if (process.env.QUESTIONS_TURNSTILE_SECRET) {
        const verify = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          {
            method: "POST",
            body: new URLSearchParams({
              secret: process.env.QUESTIONS_TURNSTILE_SECRET,
              response: String(form.get("challenge") || ""),
            }),
            signal: AbortSignal.timeout(5000),
          },
        );
        if (!(await verify.json()).success) throw new Error("INVALID_FORM");
      }
      let key: string | undefined;
      try {
        let media;
        if (parsed.format !== "text") {
          const file = form.get("media");
          if (!(file instanceof File)) throw new Error("INVALID_MEDIA");
          const inspected = await inspectMedia(file, parsed.format);
          key = await storeMedia(
            inspected.bytes,
            inspected.ext,
            inspected.mime,
          );
          media = {
            key,
            mime: inspected.mime,
            duration: inspected.duration,
            size: file.size,
            width: inspected.width,
            height: inspected.height,
          };
        } else if (form.has("media")) throw new Error("INVALID_MEDIA");
        const id = await repo.createQuestion(
          parsed,
          who.owner,
          who.source,
          media,
        );
        return json({ id }, 201);
      } catch (e) {
        if (key) await deleteMedia(key).catch(() => {});
        throw e;
      }
    }
    const raw = JSON.parse((await bounded(r, 12000)).toString());
    if (action === "reply") {
      const data = replyInput.parse(raw);
      await checkNonce(who.owner, data.nonce);
      await throttle(`reply:${who.source}`, 10, 900);
      await repo.addReply(data.id, data.text, data.author, who.owner);
      return json({ ok: true }, 201);
    }
    if (action === "react") {
      const data = z.object({ id: z.uuid() }).parse(raw);
      await throttle(`react:${who.source}`, 40, 900);
      await repo.react(data.id, who.owner, who.source);
      return json({ ok: true });
    }
    if (action === "report") {
      const data = z
        .object({
          id: z.uuid(),
          reason: z.enum(["spam", "harassment", "privacy", "illegal", "other"]),
          detail: z.string().max(500),
        })
        .parse(raw);
      await throttle(`report:${who.source}`, 10, 3600);
      await repo.report(data.id, who.owner, data.reason, data.detail);
      return json({ ok: true });
    }
    if (action === "remove-own") {
      const data = z.object({ id: z.uuid() }).parse(raw);
      await repo.remove(data.id, who.owner);
      return json({ ok: true });
    }
    return json({ error: "NOT_FOUND" }, 404);
  } catch (e) {
    return failure(e);
  }
}
