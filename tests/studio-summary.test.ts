import test from "node:test";
import assert from "node:assert/strict";
import { summaryInput, summarize } from "../lib/studio/summary";
test("summary requires explicit consent and bounded transcript", () => {
  assert.equal(
    summaryInput.safeParse({ lang: "fr", transcript: "private" }).success,
    false,
  );
  assert.equal(
    summaryInput.safeParse({
      lang: "fr",
      transcript: "x".repeat(40001),
      consent: true,
    }).success,
    false,
  );
  assert.equal(
    summaryInput.safeParse({
      lang: "en",
      transcript: "A reflection",
      consent: true,
    }).success,
    true,
  );
});
test("summary provider request disables response storage and preserves private review instructions", async (t) => {
  let payload: Record<string, unknown> = {};
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string | URL | Request, options?: RequestInit) => {
      payload = JSON.parse(String(options?.body));
      return Response.json({
        status: "completed",
        output: [
          {
            content: [
              {
                type: "output_text",
                text: "Private summary — review required",
              },
            ],
          },
        ],
      });
    },
  );
  assert.equal(
    await summarize("Dominique: Sport creates community.", "fr"),
    "Private summary — review required",
  );
  assert.equal(payload.store, false);
  assert.match(String(payload.instructions), /never invent/i);
  assert.match(String(payload.instructions), /PRIVATE/);
  assert.equal(payload.input, "Dominique: Sport creates community.");
});
