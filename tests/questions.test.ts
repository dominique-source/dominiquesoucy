import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { database, throttle } from "../lib/questions/db";
import * as repo from "../lib/questions/repository";
import { questionInput, checkText } from "../lib/questions/schema";
import { issueNonce, checkNonce } from "../lib/questions/identity";
import {
  inspectMedia,
  mediaSignature,
  storeMedia,
  readMedia,
} from "../lib/questions/media";
let root: string;
before(async () => {
  root = await mkdtemp(join(tmpdir(), "ds-questions-test-"));
  process.env.QUESTIONS_DATABASE_URL = `file:${join(root, "db.sqlite")}`;
  process.env.QUESTIONS_PRIVACY_SECRET = "local-test-only-privacy-key";
  await database();
});
after(async () => {
  (await database()).close();
  await rm(root, { recursive: true, force: true });
});
const input = (question: string, topic = "sport") => ({
  question,
  context: "Contexte d’essai technique.",
  author: "Essai local",
  topic,
  format: "text",
  transcript: "",
  reuseConsent: false,
  submissionId: crypto.randomUUID(),
});
test("persistent SQL starts empty with real category definitions only", async () => {
  const f = await repo.feed({});
  assert.equal(f.total, 0);
  assert.equal(f.questions.length, 0);
  assert.equal(f.categories.length, 7);
  assert.ok(f.categories.every((c) => c.count === 0));
});
test("public creation is immediate, durable across clients, and idempotent", async () => {
  const data = input(
    "Essai technique : quel rôle joue le sport dans la communauté?",
  );
  const id = await repo.createQuestion(data, "owner-a", "source-a");
  assert.equal(await repo.createQuestion(data, "owner-a", "source-a"), id);
  const other = createClient({ url: process.env.QUESTIONS_DATABASE_URL! });
  assert.equal(
    (
      await other.execute({
        sql: "SELECT id FROM q_questions WHERE id=?",
        args: [id],
      })
    ).rows.length,
    1,
  );
  other.close();
  const f = await repo.feed({ id });
  assert.equal(f.questions[0].title, data.question);
  assert.equal(f.questions[0].reactions, 0);
  assert.equal(f.questions[0].own, false);
  assert.equal((await repo.feed({ id }, "owner-a")).questions[0].own, true);
});
test("search, topic, format, date and SQL injection input are safely filtered", async () => {
  await repo.createQuestion(
    input("Essai de société : comment préserver la discussion?", "societe"),
    "owner-b",
    "source-b",
  );
  assert.equal(
    (await repo.feed({ search: "préserver", topic: "societe", format: "text" }))
      .questions.length,
    1,
  );
  assert.equal(
    (await repo.feed({ search: "' OR 1=1 --" })).questions.length,
    0,
  );
  assert.equal((await repo.feed({ format: "audio" })).questions.length, 0);
  assert.equal((await repo.feed({ date: "2000-01-01" })).questions.length, 0);
});
test("reactions are unique per visitor and source; toggling cannot inflate totals", async () => {
  const id = (await repo.feed({ topic: "sport" })).questions[0].id;
  await repo.react(id, "a", "same-source");
  await repo.react(id, "b", "same-source");
  assert.equal((await repo.feed({ id })).questions[0].reactions, 1);
  await repo.react(id, "c", "other-source");
  assert.equal((await repo.feed({ sort: "popular" })).questions[0].id, id);
  assert.equal((await repo.feed({ id })).questions[0].reactions, 2);
  await repo.react(id, "a", "same-source");
  assert.equal((await repo.feed({ id })).questions[0].reactions, 1);
});
test("reply threads persist and never expose owner hashes", async () => {
  const id = (await repo.feed({ topic: "sport" })).questions[0].id;
  await repo.addReply(
    id,
    "Réponse technique publiée dans le fil.",
    "Essai réponse",
    "owner-r",
  );
  const replies = await repo.replies(id);
  assert.equal(replies.length, 1);
  assert.equal(replies[0].text, "Réponse technique publiée dans le fil.");
  assert.equal("owner_hash" in replies[0], false);
});
test("private notes, consent flags and reports never enter the public DTO", async () => {
  const id = (await repo.feed({ topic: "sport" })).questions[0].id;
  await repo.curate(id, "NOTE_STRICTEMENT_PRIVEE", "todo");
  await repo.report(id, "reporter", "privacy", "SIGNALEMENT_PRIVE");
  const publicData = JSON.stringify(await repo.feed({ id }));
  for (const value of [
    "NOTE_STRICTEMENT_PRIVEE",
    "SIGNALEMENT_PRIVE",
    "owner_hash",
    "source_hash",
    "reuse_consent",
    "storage_key",
  ])
    assert.ok(!publicData.includes(value));
  const privateData = await repo.privateFeed({ id });
  assert.equal(privateData.questions[0].notes, "NOTE_STRICTEMENT_PRIVEE");
  assert.equal(privateData.questions[0].reports[0].detail, "SIGNALEMENT_PRIVE");
});
test("episode selections reorder transactionally and reject stale revisions", async () => {
  const ids = (await repo.feed({})).questions.map((q) => q.id);
  await repo.saveShow("Émission de validation locale", ids, 0);
  assert.deepEqual((await repo.currentShow()).items, ids);
  await repo.saveShow("Émission de validation locale", [...ids].reverse(), 1);
  await assert.rejects(
    repo.saveShow("Ancienne révision", ids, 1),
    /CONFLICT_REFRESH/,
  );
  assert.deepEqual((await repo.currentShow()).items, [...ids].reverse());
  assert.equal((await repo.selectedQuestions()).length, 2);
});
test("emergency hide removes public questions, threads and presentation selection", async () => {
  const id = (await repo.feed({ topic: "sport" })).questions[0].id;
  await repo.hide(id, true);
  assert.equal((await repo.feed({ id })).questions.length, 0);
  assert.equal((await repo.replies(id)).length, 0);
  assert.equal((await repo.currentShow()).items.includes(id), false);
  assert.equal((await repo.privateFeed({ id })).questions.length, 1);
  await repo.hide(id, false);
});
test("posting pause and feed emergency switches take effect without a moderation queue", async () => {
  await repo.setSetting("paused", true);
  await assert.rejects(
    repo.createQuestion(
      input("Une autre question de validation technique?"),
      "x",
      "x",
    ),
    /POSTING_PAUSED/,
  );
  await repo.setSetting("paused", false);
  await repo.setSetting("feed_hidden", true);
  await assert.rejects(repo.feed({}), /FEED_HIDDEN/);
  assert.ok((await repo.privateFeed({})).questions.length > 0);
  await repo.setSetting("feed_hidden", false);
});
test("atomic spam counters expire and cannot silently exceed their threshold", async () => {
  await throttle("test", 2, 60);
  await throttle("test", 2, 60);
  await assert.rejects(throttle("test", 2, 60), /RATE_LIMITED/);
  await (
    await database()
  ).execute("UPDATE q_rates SET expires=0 WHERE key='test'");
  await throttle("test", 2, 60);
});
test("form proofs reject future, expired, too-fast and cross-visitor submissions", async () => {
  const nonce = await issueNonce("owner", 100000);
  await checkNonce("owner", nonce, 103000);
  await assert.rejects(checkNonce("owner", nonce, 100010), /INVALID_FORM/);
  await assert.rejects(checkNonce("other", nonce, 103000), /INVALID_FORM/);
  await assert.rejects(checkNonce("owner", nonce, 2000000), /INVALID_FORM/);
});
test("public consent is mandatory and personal contact data is rejected", () => {
  assert.equal(
    questionInput.safeParse({
      ...input("Une question de validation?"),
      publishConsent: false,
      nonce: "n",
      website: "",
    }).success,
    false,
  );
  assert.throws(
    () => checkText("Écris-moi à test@example.com"),
    /PERSONAL_DATA_OR_LINK/,
  );
  assert.throws(
    () => checkText("<script>https://example.com</script>"),
    /PERSONAL_DATA_OR_LINK/,
  );
  assert.throws(() => checkText("Je vais te tuer"), /UNSAFE_TEXT/);
  assert.doesNotThrow(() =>
    checkText("Le sport peut-il mieux accueillir les jeunes?"),
  );
});
test("dangerous and forged file headers are rejected by signature and actual probing", async () => {
  assert.throws(
    () => mediaSignature(Buffer.from("<script>alert(1)</script>")),
    /INVALID_MEDIA/,
  );
  const forged = Buffer.alloc(64);
  forged.write("ftyp", 4);
  await assert.rejects(
    inspectMedia(
      new File([forged], "fake.mp4", { type: "video/mp4" }),
      "video",
    ),
    /INVALID_MEDIA/,
  );
});
test("real WAV decoding, storage, playback bytes and deletion work", async () => {
  const bytes = await readFile(
    new URL("./fixtures/questions/test-audio.wav", import.meta.url),
  );
  const inspected = await inspectMedia(
    new File([bytes], "test.wav", { type: "audio/wav" }),
    "audio",
  );
  assert.ok(inspected.duration > 0.9 && inspected.duration < 1.1);
  const key = await storeMedia(inspected.bytes, inspected.ext, inspected.mime);
  assert.deepEqual(await readMedia(key), bytes);
  const id = await repo.createQuestion(
    { ...input("Question audio de validation locale?"), format: "audio" },
    "media-owner",
    "media-source",
    {
      key,
      mime: inspected.mime,
      duration: inspected.duration,
      size: bytes.length,
      width: null,
      height: null,
    },
  );
  assert.ok((await repo.feed({ id })).questions[0].media_id);
  await assert.rejects(repo.remove(id, "someone-else"), /FORBIDDEN/);
  await repo.remove(id, "media-owner");
  assert.equal((await repo.feed({ id })).questions.length, 0);
  await assert.rejects(readMedia(key));
});
test("real MP4 audio/video probing preserves dimensions and refuses video disguised as audio", async () => {
  const bytes = await readFile(
    new URL("./fixtures/questions/test-video.mp4", import.meta.url),
  );
  const file = new File([bytes], "test.mp4", { type: "video/mp4" });
  const video = await inspectMedia(file, "video");
  assert.equal(video.width, 320);
  assert.equal(video.height, 180);
  assert.ok(video.duration > 1.9 && video.duration < 2.2);
  await assert.rejects(inspectMedia(file, "audio"), /INVALID_MEDIA/);
});
test("administrative removal cascades public replies, reactions and reports", async () => {
  const id = (await repo.feed({ topic: "sport" })).questions[0].id;
  await repo.remove(id);
  const db = await database();
  for (const table of ["q_replies", "q_reactions", "q_reports", "q_curation"]) {
    assert.equal(
      (
        await db.execute({
          sql: `SELECT COUNT(*) n FROM ${table} WHERE question_id=?`,
          args: [id],
        })
      ).rows[0].n,
      0,
    );
  }
  assert.equal((await repo.feed({ id })).questions.length, 0);
});
