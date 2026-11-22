// Local-only end-to-end HTTP check. Leaves explicitly labelled test contributions for browser review.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const base = process.env.QUESTIONS_TEST_URL || "http://localhost:3103";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Local test server only");
const jar = new Map();
const checks = [];
async function call(
  action,
  { body, method, anonymous = false, status = 200 } = {},
) {
  const headers = { origin: base };
  if (!anonymous)
    headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  if (body && !(body instanceof FormData))
    headers["content-type"] = "application/json";
  const r = await fetch(`${base}/api/questions/${action}`, {
    method: method || (body ? "POST" : "GET"),
    headers,
    ...(body
      ? { body: body instanceof FormData ? body : JSON.stringify(body) }
      : {}),
  });
  assert.equal(
    r.status,
    status,
    `${action}: ${r.status === status ? "" : await r.clone().text()}`,
  );
  for (const c of r.headers.getSetCookie()) {
    const pair = c.split(";")[0];
    const index = pair.indexOf("=");
    jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
  checks.push({ action, status: r.status });
  return r;
}
await call("admin", { anonymous: true, status: 401 });
await call("presentation", { anonymous: true, status: 401 });
await call("admin", {
  body: { operation: "settings", key: "paused", value: true },
  anonymous: true,
  status: 401,
});
const boot = await (await call("bootstrap")).json();
await new Promise((r) => setTimeout(r, 2800));
const ids = [];
for (const kind of ["audio", "video"]) {
  const bytes = await readFile(
    new URL(
      `../tests/fixtures/questions/test-${kind}.${kind === "audio" ? "wav" : "mp4"}`,
      import.meta.url,
    ),
  );
  const form = new FormData();
  form.set(
    "data",
    JSON.stringify({
      question: `Essai ${kind} local : cette contribution vérifie un média synthétique.`,
      context:
        "Test technique local uniquement. Aucun participant réel ni faux profil communautaire.",
      author: "Validation média",
      topic: kind === "audio" ? "humain" : "communaute",
      format: kind,
      transcript: "Son synthétique de validation; aucune voix personnelle.",
      publishConsent: true,
      reuseConsent: kind === "video",
      nonce: boot.nonce,
      website: "",
      submissionId: crypto.randomUUID(),
    }),
  );
  form.set(
    "media",
    new Blob([bytes], { type: kind === "audio" ? "audio/wav" : "video/mp4" }),
    `test.${kind === "audio" ? "wav" : "mp4"}`,
  );
  const result = await (
    await call("create", { body: form, status: 201 })
  ).json();
  ids.push(result.id);
  const feed = await (await call(`feed?id=${result.id}`)).json();
  const q = feed.questions[0];
  assert.equal(q.format, kind);
  assert.ok(q.media_id);
  assert.ok(q.duration > 0);
  const media = await call(`media?id=${q.media_id}`);
  assert.deepEqual(Buffer.from(await media.arrayBuffer()), bytes);
  const range = await fetch(`${base}/api/questions/media?id=${q.media_id}`, {
    headers: { range: "bytes=0-19" },
  });
  assert.equal(range.status, 206);
  assert.equal((await range.arrayBuffer()).byteLength, 20);
}
await call("reply", {
  body: {
    id: ids[0],
    text: "Réponse de validation persistante.",
    author: "Validation locale",
    publishConsent: true,
    nonce: boot.nonce,
    website: "",
  },
  status: 201,
});
await call("react", { body: { id: ids[0] } });
assert.equal(
  (await (await call(`feed?id=${ids[0]}`)).json()).questions[0].reactions,
  1,
);
await call("react", { body: { id: ids[0] } });
await call("report", {
  body: {
    id: ids[0],
    reason: "other",
    detail: "Signalement technique privé de validation.",
  },
});
const login = await fetch(`${base}/api/studio/login`, {
  method: "POST",
  headers: { origin: base, "content-type": "application/json" },
  body: JSON.stringify({ code: process.env.STUDIO_ACCESS_CODE }),
});
assert.equal(login.status, 200);
for (const c of login.headers.getSetCookie()) {
  const pair = c.split(";")[0],
    i = pair.indexOf("=");
  jar.set(pair.slice(0, i), pair.slice(i + 1));
}
await call("admin", {
  body: {
    operation: "curate",
    id: ids[0],
    notes: "NOTE_PRIVEE_VALIDATION_INVISIBLE_AU_PUBLIC",
    stage: "selected",
  },
});
const publicJson = JSON.stringify(
  await (await call(`feed?id=${ids[0]}`)).json(),
);
assert.ok(!publicJson.includes("NOTE_PRIVEE"));
assert.ok(!publicJson.includes("Signalement technique privé"));
assert.ok(!publicJson.includes("storage_key"));
let admin = await (await call("admin")).json();
assert.equal(
  admin.questions.find((q) => q.id === ids[0]).notes,
  "NOTE_PRIVEE_VALIDATION_INVISIBLE_AU_PUBLIC",
);
await call("admin", {
  body: {
    operation: "show",
    title: "Émission de validation locale",
    items: ids,
    revision: admin.show.revision,
  },
});
admin = await (await call("admin")).json();
assert.deepEqual(admin.show.items, ids);
assert.equal(admin.selected[0].reuse_consent, 0);
assert.equal(admin.selected[1].reuse_consent, 1);
await call("admin", { body: { operation: "hide", id: ids[0], hidden: true } });
assert.equal(
  (await (await call(`feed?id=${ids[0]}`)).json()).questions.length,
  0,
);
await call("admin", { body: { operation: "hide", id: ids[0], hidden: false } });
admin = await (await call("admin")).json();
await call("admin", {
  body: {
    operation: "show",
    title: "Émission de validation locale",
    items: ids,
    revision: admin.show.revision,
  },
});
await writeFile(
  "/private/tmp/questions-v71-http-checks.json",
  JSON.stringify({ passed: true, ids, checks }, null, 2),
);
console.log(
  JSON.stringify(
    {
      passed: true,
      ids,
      checks: checks.length,
      media: "WAV + MP4, exact playback bytes + HTTP ranges",
      privacy: "private notes/reports/storage keys absent from public data",
    },
    null,
    2,
  ),
);
