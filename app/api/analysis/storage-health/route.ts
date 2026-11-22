import { NextResponse } from "next/server";
import { session } from "@/lib/studio/auth";
import { redis } from "@/lib/studio/store";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function GET() {
  const user = await session().catch(() => null);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers });

  let projectStore: "available" | "unavailable" = "unavailable";
  try {
    if (await redis(["PING"]) === "PONG") projectStore = "available";
  } catch {
    // Never expose credentials or internal Redis endpoints to the browser.
  }
  const mediaStore = process.env.BLOB_READ_WRITE_TOKEN ? "configured" : "missing";
  return NextResponse.json(
    { projectStore, mediaStore, note: "BLOB_CONFIGURATION_ONLY", checkedAt: Date.now() },
    { status: projectStore === "available" && mediaStore === "configured" ? 200 : 503, headers },
  );
}
