import test from "node:test";
import assert from "node:assert/strict";
import {
  parseContent,
  availableTopics,
  matchesTopic,
  relatedEntries,
  type Entry,
} from "../lib/content";
import { brandCopy } from "../lib/brand-copy";
const source = `---
slug: test-v2
title: Gabarit technique, non éditorial
description: Données de vérification uniquement.
category: societe
contentType: observation
publicationDate: "2026-01-01"
language: fr
coverImage: null
tags: []
status: published
featured: false
---
Texte de vérification.
`;
const entry = (overrides: Partial<Entry> = {}): Entry => ({
  ...parseContent(source),
  ...overrides,
});
test("V1 frontmatter remains valid; V2 topics and aspect ratio have safe defaults", () => {
  const e = entry();
  assert.deepEqual(e.topics, []);
  assert.equal(e.mediaAspect, "landscape");
  assert.equal(e.signature, false);
});
test("only themes backed by published observations become filters", () => {
  const entries = [
    entry({ topics: ["education", "communaute"] }),
    entry({
      slug: "draft",
      category: "sport",
      status: "draft",
      topics: ["culture"],
    }),
  ];
  assert.deepEqual(availableTopics(entries), [
    "societe",
    "education",
    "communaute",
  ]);
  assert.equal(availableTopics([]).length, 0);
  assert.ok(matchesTopic(entries[0], "education"));
  assert.ok(matchesTopic(entries[0], "societe"));
  assert.ok(!matchesTopic(entries[0], "culture"));
});
test("invalid themes and aspect ratios fail content validation", () => {
  assert.throws(() =>
    parseContent(source.replace("tags: []", "tags: []\ntopics: [invented]")),
  );
  assert.throws(() =>
    parseContent(source.replace("tags: []", "tags: []\nmediaAspect: invented")),
  );
});
test("signature related stories preserve language, series, publication status and chronology", () => {
  const current = entry({ signature: true });
  const next = entry({
    slug: "next",
    signature: true,
    publicationDate: "2026-02-01",
  });
  const old = entry({ slug: "old", signature: true });
  const entries = [
    current,
    old,
    next,
    entry({ slug: "other", signature: false }),
    entry({ slug: "english", language: "en", signature: true }),
    entry({ slug: "draft", status: "draft", signature: true }),
    entry({ slug: "future", publicationDate: "2999-01-01", signature: true }),
  ];
  assert.deepEqual(
    relatedEntries(current, entries).map((e) => e.slug),
    ["next", "old"],
  );
  assert.equal(relatedEntries(current, [current]).length, 0);
});
test("V2 interface dictionaries have matching nested keys", () => {
  const keys = (v: object): string[] =>
    Object.entries(v)
      .flatMap(([key, value]) =>
        value && typeof value === "object" && !Array.isArray(value)
          ? keys(value).map((k) => key + "." + k)
          : [key],
      )
      .sort();
  assert.deepEqual(keys(brandCopy.fr), keys(brandCopy.en));
});
