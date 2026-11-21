import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import * as store from "./store";
export const COOKIE = "ds-studio-session";
export const TTL = 2 * 60 * 60;
export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function validCode(
  value: unknown,
  expected = process.env.STUDIO_ACCESS_CODE,
) {
  return (
    !!expected &&
    typeof value === "string" &&
    value.length <= 32 &&
    timingSafeEqual(
      Buffer.from(digest(value.replace(/[-\s]/g, ""))),
      Buffer.from(digest(expected)),
    )
  );
}
export async function session() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const data = await store.get(`session:${digest(token)}`);
  if (!data) return null;
  const s = JSON.parse(data) as { expires: number };
  return s.expires > Date.now() ? { key: digest(token), ...s } : null;
}
export async function login() {
  const token = randomBytes(32).toString("hex");
  await store.set(
    `session:${digest(token)}`,
    JSON.stringify({ expires: Date.now() + TTL * 1000 }),
    TTL,
  );
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: !(
      process.env.NODE_ENV === "development" &&
      process.env.STUDIO_LOCAL_HTTP === "true"
    ),
    sameSite: "strict",
    path: "/",
    maxAge: TTL,
  });
}
export async function logout() {
  const s = await session();
  if (s) await store.del(`session:${s.key}`);
  (await cookies()).set(COOKIE, "", {
    httpOnly: true,
    secure: !(
      process.env.NODE_ENV === "development" &&
      process.env.STUDIO_LOCAL_HTTP === "true"
    ),
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return (
    !!origin &&
    new URL(origin).host ===
      (request.headers.get("host") || new URL(request.url).host) &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}
