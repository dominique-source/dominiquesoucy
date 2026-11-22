import { NextResponse } from "next/server";
import {
  digest,
  login,
  logout,
  sameOrigin,
  session,
  validCode,
} from "@/lib/studio/auth";
import { limit } from "@/lib/studio/store";
import { summarize, summaryInput } from "@/lib/studio/summary";
import { silentSession } from "@/lib/studio/domain";
export const runtime = "nodejs";
export const maxDuration = 30;
const headers = {
  "Cache-Control": "no-store, private",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers });
}
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    if ((await params).action !== "session")
      return json({ error: "NOT_FOUND" }, 404);
    const s = await session();
    if (!s) return json({ error: "UNAUTHORIZED" }, 401);
    return json({ expires: s.expires, provider: !!process.env.OPENAI_API_KEY });
  } catch {
    return json({ error: "STUDIO_NOT_CONFIGURED" }, 503);
  }
}
export async function POST(
  r: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  if (!sameOrigin(r)) return json({ error: "ORIGIN_DENIED" }, 403);
  try {
    const { action } = await params;
    if (action === "login") {
      if (!process.env.STUDIO_ACCESS_CODE)
        return json({ error: "STUDIO_NOT_CONFIGURED" }, 503);
      // Vercel overwrites x-vercel-forwarded-for; local fallback is intentionally a shared bucket.
      const ip = process.env.VERCEL
        ? r.headers.get("x-vercel-forwarded-for") || "unknown"
        : "local";
      if (
        !(await limit(`login:${digest(ip)}`, 5, 900)) ||
        !(await limit("login-global", 100, 900))
      )
        return json({ error: "RATE_LIMITED" }, 429);
      if (Number(r.headers.get("content-length") || 0) > 1024)
        return json({ error: "BAD_REQUEST" }, 400);
      const body = await r.text();
      if (body.length > 1024) return json({ error: "BAD_REQUEST" }, 400);
      if (!validCode(JSON.parse(body).code))
        return json({ error: "INVALID_CODE" }, 401);
      await login();
      return json({ ok: true });
    }
    const s = await session();
    if (!s) return json({ error: "UNAUTHORIZED" }, 401);
    if (action === "logout") {
      await logout();
      return json({ ok: true });
    }
    if (action === "summary") {
      if (!process.env.OPENAI_API_KEY)
        return json({ error: "PROVIDER_NOT_CONFIGURED" }, 503);
      if (
        !(await limit(`summary:${s.key}`, 5, 900)) ||
        !(await limit("summary-global", 30, 900))
      )
        return json({ error: "RATE_LIMITED" }, 429);
      const raw = await r.text();
      if (raw.length > 48000) return json({ error: "BAD_REQUEST" }, 400);
      const body = summaryInput.safeParse(JSON.parse(raw));
      if (!body.success) return json({ error: "BAD_REQUEST" }, 400);
      return json({
        summary: await summarize(body.data.transcript, body.data.lang),
      });
    }
    if (action !== "connect") return json({ error: "NOT_FOUND" }, 404);
    if (!process.env.OPENAI_API_KEY)
      return json({ error: "PROVIDER_NOT_CONFIGURED" }, 503);
    if (
      !(await limit(`connect:${s.key}`, 6, 900)) ||
      !(await limit("connect-global", 30, 900))
    )
      return json({ error: "RATE_LIMITED" }, 429);
    const body = await r.text();
    if (body.length > 64000) return json({ error: "BAD_REQUEST" }, 400);
    const { sdp, lang, consent } = JSON.parse(body);
    if (consent !== true || typeof sdp !== "string" || !sdp.startsWith("v=0"))
      return json({ error: "BAD_REQUEST" }, 400);
    const form = new FormData();
    form.set("sdp", sdp);
    form.set("session", JSON.stringify(silentSession(lang)));
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      // Report only a coarse status category; never disclose provider response data.
      if (response.status === 401 || response.status === 403)
        return json({ error: "PROVIDER_INVALID_KEY" }, 502);
      if (response.status === 429 || response.status === 402)
        return json({ error: "PROVIDER_QUOTA" }, 502);
      if (response.status === 400 || response.status === 422)
        return json({ error: "PROVIDER_BAD_REQUEST" }, 502);
      return json({ error: "PROVIDER_UNAVAILABLE" }, 502);
    }
    return new Response(await response.text(), {
      headers: { ...headers, "Content-Type": "application/sdp" },
    });
  } catch {
    return json({ error: "STUDIO_UNAVAILABLE" }, 503);
  }
}
