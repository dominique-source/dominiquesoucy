// Run against an owned local dev server with the same .env.local, never against production.
import assert from "node:assert/strict";
const base = process.env.STUDIO_TEST_URL || "http://localhost:3102";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Local test server only");
const code = process.env.STUDIO_ACCESS_CODE;
if (!code) throw new Error("Load the local server environment first");
let cookie = "";
const statuses = [];
async function request(action, body, expected, withCookie = true) {
  const r = await fetch(`${base}/api/studio/${action}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      origin: base,
      "content-type": "application/json",
      ...(withCookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(r.status, expected, `${action} expected ${expected}`);
  assert.match(r.headers.get("cache-control"), /no-store/);
  statuses.push({ action, status: r.status });
  return r;
}
await request("session", undefined, 401, false);
await request("connect", { sdp: "v=0", lang: "fr", consent: true }, 401, false);
const foreign = await fetch(`${base}/api/studio/login`, {
  method: "POST",
  headers: {
    origin: "https://foreign.invalid",
    "content-type": "application/json",
  },
  body: JSON.stringify({ code }),
});
assert.equal(foreign.status, 403);
const login = await request("login", { code }, 200, false);
const setCookie = login.headers.get("set-cookie");
assert.match(setCookie, /HttpOnly/i);
assert.match(setCookie, /SameSite=strict/i);
cookie = setCookie.split(";")[0];
await request("session", undefined, 200);
await request("connect", { sdp: "v=0", lang: "fr", consent: true }, 503);
await request("logout", {}, 200);
await request("session", undefined, 401);
await request("login", { code: "intentionally-wrong" }, 401, false);
// Exhaust the local shared bucket; run this test after browser review, then restart the dev server.
let limited = false;
for (let i = 0; i < 6; i++) {
  const r = await fetch(`${base}/api/studio/login`, {
    method: "POST",
    headers: { origin: base, "content-type": "application/json" },
    body: JSON.stringify({ code: "intentionally-wrong" }),
  });
  if (r.status === 429) {
    limited = true;
    break;
  }
  assert.equal(r.status, 401);
}
assert.ok(limited);
console.log(
  JSON.stringify(
    {
      passed: true,
      checks: statuses,
      foreignOrigin: 403,
      rateLimit: 429,
      cookie: "HttpOnly + SameSite=Strict; Secure enforced on deployments",
    },
    null,
    2,
  ),
);
