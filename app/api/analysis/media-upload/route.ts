import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { sameOrigin, session } from "@/lib/studio/auth";
import { limit, set } from "@/lib/studio/store";
import { MAX_MEDIA_BYTES, mediaTypes, validMediaPath } from "@/lib/analysis/media";

export const runtime = "nodejs";
export const maxDuration = 30;
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 16000)
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 413, headers });
  let body: HandleUploadBody;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400, headers }); }
  if (!body || !("type" in body)) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400, headers });
  if (body.type === "blob.generate-client-token") {
    if (!sameOrigin(request)) return NextResponse.json({ error: "ORIGIN_DENIED" }, { status: 403, headers });
    const user = await session().catch(() => null);
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers });
    if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "BLOB_NOT_CONFIGURED" }, { status: 503, headers });
  } else if (body.type !== "blob.upload-completed") {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400, headers });
  }
  try {
    const result = await handleUpload({
      request, body,
      onBeforeGenerateToken: async (pathname) => {
        const user = await session();
        if (!user || !sameOrigin(request) || !validMediaPath(pathname)) throw new Error("UPLOAD_NOT_AUTHORIZED");
        if (!(await limit(`media-upload:${user.key}`, 8, 3600))) throw new Error("RATE_LIMITED");
        await set(`media-owner:${pathname}`, user.key, 3600);
        return {
          allowedContentTypes: [...mediaTypes, "application/octet-stream"],
          maximumSizeInBytes: MAX_MEDIA_BYTES,
          addRandomSuffix: false,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
      // Vercel Blob authenticates its upload-completed callback. No logging of
      // media URLs, no exposed metadata, and no automatic public publication.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result, { headers });
  } catch {
    return NextResponse.json({ error: "MEDIA_UPLOAD_FAILED" }, { status: 400, headers });
  }
}
