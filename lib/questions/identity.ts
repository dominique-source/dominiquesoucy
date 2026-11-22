import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
async function secret() {
  if (process.env.QUESTIONS_PRIVACY_SECRET)
    return process.env.QUESTIONS_PRIVACY_SECRET;
  if (process.env.VERCEL || process.env.NODE_ENV === "production")
    throw new Error("PRIVACY_NOT_CONFIGURED");
  await mkdir(resolve(".data"), { recursive: true });
  const path = resolve(".data/questions-secret");
  try {
    return await readFile(path, "utf8");
  } catch {
    const value = randomBytes(32).toString("hex");
    try {
      await writeFile(path, value, { flag: "wx", mode: 0o600 });
    } catch {}
    return readFile(path, "utf8");
  }
}
export async function fingerprint(value: string) {
  return createHmac("sha256", await secret())
    .update(value)
    .digest("hex");
}
export async function identity(request: Request, create = false) {
  const jar = await cookies();
  let value = jar.get("ds-question-visitor")?.value;
  if (!value || !/^[a-f0-9]{48}$/.test(value)) {
    if (!create) throw new Error("VISITOR_REQUIRED");
    value = randomBytes(24).toString("hex");
    jar.set("ds-question-visitor", value, {
      httpOnly: true,
      secure: !(
        process.env.NODE_ENV === "development" &&
        process.env.STUDIO_LOCAL_HTTP === "true"
      ),
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  const ip = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for") || "unknown"
    : "loopback";
  return {
    owner: await fingerprint(`visitor:${value}`),
    source: await fingerprint(`source:${ip}`),
  };
}
export async function issueNonce(owner: string, now = Date.now()) {
  return `${now}.${await fingerprint(`nonce:${owner}:${now}`)}`;
}
export async function checkNonce(
  owner: string,
  nonce: string,
  now = Date.now(),
) {
  const [timestamp, signature] = nonce.split(".");
  const age = now - Number(timestamp);
  if (
    !Number.isFinite(age) ||
    age < 2500 ||
    age > 30 * 60 * 1000 ||
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    throw new Error("INVALID_FORM");
  const expected = (await issueNonce(owner, Number(timestamp))).split(".")[1];
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
    throw new Error("INVALID_FORM");
}
