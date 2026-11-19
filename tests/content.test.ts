import test from "node:test";
import assert from "node:assert/strict";
import {
  parseContent,
  published,
  featuredReflection,
  matchesSection,
  entryPath,
  validateEntries,
} from "../lib/content";
import { videoSource } from "../lib/video";
const source = `---
slug: fixture-only
title: Fixture technique — ne pas publier
description: Données de test uniquement.
category: societe
contentType: reflection
publicationDate: "2026-01-01"
language: fr
coverImage: null
tags: [test]
status: draft
featured: false
---
Corps de test.
`;
const entry = () => parseContent(source);
test("frontmatter is typed and Markdown body is preserved", () => {
  assert.equal(entry().slug, "fixture-only");
  assert.match(entry().body, /Corps de test/);
});
test("drafts and future entries cannot be publicly listed", () => {
  const e = entry();
  assert.equal(published([e]).length, 0);
  assert.equal(
    published([{ ...e, status: "published", publicationDate: "2999-01-01" }])
      .length,
    0,
  );
  assert.equal(
    published([{ ...e, status: "published" }], "2026-01-02").length,
    1,
  );
});
test("invalid dates, missing alt text, unsafe paths and unsupported video sources fail", () => {
  assert.throws(() =>
    parseContent(source.replace('"2026-01-01"', '"2026-02-30"')),
  );
  assert.throws(() =>
    parseContent(
      source.replace(
        "coverImage: null",
        "coverImage: /assets/editorial/image.webp",
      ),
    ),
  );
  assert.throws(() =>
    parseContent(
      source.replace("coverImage: null", "coverImage: /assets/../secret"),
    ),
  );
  assert.throws(() =>
    parseContent(
      source.replace(
        "featured: false",
        "featured: false\nvideoUrl: javascript:alert(1)",
      ),
    ),
  );
});
test("ordering, categories, featured selection and canonical routes", () => {
  const e = entry();
  const newer = {
    ...e,
    slug: "new",
    publicationDate: "2026-02-01",
    status: "published" as const,
  };
  const old = { ...e, status: "published" as const, featured: true };
  const sorted = published([old, newer], "2026-03-01");
  assert.equal(sorted[0].slug, "new");
  assert.equal(featuredReflection(sorted)?.slug, e.slug);
  assert.ok(matchesSection(e, "societe"));
  assert.ok(!matchesSection(e, "sport-culture"));
  assert.ok(!matchesSection(e, "observations"));
  assert.equal(entryPath(e), "/fr/reflexions/fixture-only");
});
test("duplicate language and slug combinations are rejected", () => {
  assert.throws(() => validateEntries([entry(), entry()]), /Duplicate/);
  assert.equal(
    validateEntries([entry(), { ...entry(), language: "en" }]).length,
    2,
  );
});
test("video providers normalize to controlled embed URLs", () => {
  assert.equal(
    videoSource("https://youtu.be/abcdefghijk")?.src,
    "https://www.youtube-nocookie.com/embed/abcdefghijk",
  );
  assert.equal(
    videoSource("https://www.youtube.com/watch?v=abcdefghijk")?.kind,
    "embed",
  );
  assert.equal(
    videoSource("https://vimeo.com/123456")?.src,
    "https://player.vimeo.com/video/123456",
  );
  assert.equal(videoSource("/assets/videos/test.mp4")?.kind, "file");
  assert.equal(videoSource("https://cdn.example.com/test.webm")?.kind, "file");
  assert.equal(
    videoSource("https://youtube.com.evil.example/watch?v=abcdefghijk"),
    null,
  );
  assert.equal(videoSource("javascript:alert(1)"), null);
  assert.equal(videoSource("http://example.com/file.mp4"), null);
});
