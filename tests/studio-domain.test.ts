import test from "node:test";
import assert from "node:assert/strict";
import {
  canAsk,
  exportText,
  journalists,
  questionInstructions,
  silentSession,
  transition,
  voiceCommand,
  type Mode,
} from "../lib/studio/domain";
import { validCode, sameOrigin } from "../lib/studio/auth";
import * as store from "../lib/studio/store";
test("free reflection never authorizes questions; silence is latched until explicit reopening", () => {
  for (const m of [
    "reflection",
    "priority",
    "paused",
    "ended",
    "speaking",
  ] as Mode[])
    assert.equal(canAsk(m, false), false);
  assert.equal(canAsk("questions", true), false);
  assert.equal(canAsk("questions", false), true);
  assert.equal(transition("reflection", "next"), "reflection");
  assert.equal(transition("speaking", "silence"), "priority");
  assert.equal(transition("priority", "next"), "priority");
  assert.equal(transition("priority", "open"), "questions");
  assert.equal(transition("ended", "open"), "ended");
  assert.equal(transition("questions", "reflection"), "reflection");
});
test("French and English commands require an exact normalized utterance", () => {
  for (const [text, command] of [
    ["Maintenant, on passe aux questions.", "open"],
    ["Attends, j’ai pas fini.", "silence"],
    ["Laisse-moi terminer.", "silence"],
    ["Silence, les journalistes.", "silence"],
    ["Reprenons les questions.", "open"],
    ["Prochaine question.", "next"],
    ["Répète la question.", "repeat"],
    ["Fin de conférence.", "end"],
    ["Let me finish.", "silence"],
    ["Next question", "next"],
    ["Back to reflection", "reflection"],
  ])
    assert.equal(voiceCommand(text), command);
  assert.equal(
    voiceCommand(
      "Il a dit : maintenant on passe aux questions, mais je réfléchis encore",
    ),
    undefined,
  );
});
test("provider session disables every automatic response from VAD", () => {
  for (const lang of ["fr", "en"]) {
    const s = silentSession(lang);
    assert.equal(s.audio.input.turn_detection.create_response, false);
    assert.equal(s.audio.input.turn_detection.interrupt_response, false);
    assert.equal(s.audio.input.transcription.language, lang);
  }
});
test("five configurable journalists, grounded questions, respectful intensity and bounded notes", () => {
  assert.equal(journalists.length, 5);
  assert.equal(new Set(journalists.map((j) => j.style)).size, 5);
  const p = questionInstructions(
    0,
    "Alex",
    journalists[0].style,
    99,
    "fr",
    "x".repeat(10000),
  );
  assert.match(p, /ONE concise new question/);
  assert.match(p, /level 3 of 3/);
  assert.match(p, /Quebec French/);
  assert.ok(p.length < 5000);
  assert.match(p, /never personal worth/);
});
test("server code comparison has no shipped default and accepts formatting only", () => {
  const testOnly = "test-only-pass";
  assert.equal(validCode(undefined, testOnly), false);
  assert.equal(validCode("wrong", testOnly), false);
  assert.equal(validCode("x".repeat(33), testOnly), false);
  assert.equal(validCode("", ""), false);
  assert.equal(validCode("42-73-18", "427318"), true);
});
test("mutation endpoints reject foreign and absent origins", () => {
  const url = "https://example.test/api/studio/login";
  assert.equal(sameOrigin(new Request(url)), false);
  assert.equal(
    sameOrigin(new Request(url, { headers: { origin: "https://evil.test" } })),
    false,
  );
  assert.equal(
    sameOrigin(
      new Request(url, { headers: { origin: "https://example.test" } }),
    ),
    true,
  );
});
test("local session store expires and revokes opaque records", async () => {
  await store.set("test:expired", "secret", -1);
  assert.equal(await store.get("test:expired"), null);
  await store.set("test:session", "opaque", 20);
  assert.equal(await store.get("test:session"), "opaque");
  await store.del("test:session");
  assert.equal(await store.get("test:session"), null);
});
test("attempt counters reject attempts after the configured threshold", async () => {
  const key = `test:${crypto.randomUUID()}`;
  for (let i = 0; i < 5; i++)
    assert.equal(await store.limit(key, 5, 900), true);
  assert.equal(await store.limit(key, 5, 900), false);
});
test("voluntary exports preserve private labels and can isolate questions", () => {
  const entries = [
    {
      id: "1",
      speaker: "Dominique",
      text: "Private context",
      visibility: "private" as const,
    },
    {
      id: "2",
      speaker: "Alex",
      text: "A question?",
      visibility: "publishable" as const,
    },
  ];
  assert.match(exportText(entries), /\[private\] Dominique/);
  assert.doesNotMatch(exportText(entries, true), /Private context/);
  assert.match(exportText(entries, true), /\[publishable\] Alex/);
});
