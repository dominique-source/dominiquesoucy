import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdaptiveVideo } from "../components/adaptive-video";
import {
  videoLayouts,
  videoOrientations,
  videoRatios,
  resolveVideoOrientation,
  localVideoPoster,
} from "../lib/video-layout";
import { contentSchema, parseContent } from "../lib/content";
import { pilotVideo } from "../lib/config";
const url = pilotVideo.videoUrl;
for (const orientation of videoOrientations)
  for (const layout of videoLayouts) {
    test(`${orientation}/${layout} reserves the correct frame and defers external playback`, () => {
      const html = renderToStaticMarkup(
        createElement(AdaptiveVideo, {
          videoUrl: url,
          orientation,
          layout,
          title: "PILOTE — ÉPISODE 00",
          lang: "fr",
        }),
      );
      assert.ok(
        html.includes(`--video-aspect-ratio:${videoRatios[orientation]}`),
      );
      assert.ok(html.includes(`data-orientation="${orientation}"`));
      assert.ok(html.includes(`data-layout="${layout}"`));
      assert.ok(html.includes(`adaptive-video--${layout}`));
      assert.match(html, /class="video-frame"/);
      assert.match(html, /Charger la vidéo externe/);
      assert.match(
        html,
        /aria-label="Charger la vidéo externe — PILOTE — ÉPISODE 00"/,
      );
      assert.doesNotMatch(html, /<iframe|youtube-nocookie|autoplay/);
    });
    test(`${orientation}/${layout} self-hosted media retains native controls, poster and captions without preloading video`, () => {
      const html = renderToStaticMarkup(
        createElement(AdaptiveVideo, {
          videoUrl: "/assets/videos/test.mp4",
          orientation,
          layout,
          poster: "/assets/editorial/test.webp",
          captions: "/assets/captions/test.fr.vtt",
          title: "Test",
          lang: "fr",
        }),
      );
      assert.ok(
        html.includes(`--video-aspect-ratio:${videoRatios[orientation]}`),
      );
      assert.match(html, /<video[^>]+controls=""[^>]+preload="none"/);
      assert.match(html, /poster="\/assets\/editorial\/test.webp"/);
      assert.match(html, /<track kind="captions"/);
      assert.doesNotMatch(html, /autoplay|object-fit:cover/);
    });
  }
test("legacy component calls default to landscape/article and invalid URLs render nothing", () => {
  const html = renderToStaticMarkup(
    createElement(AdaptiveVideo, { videoUrl: url, title: "Test" }),
  );
  assert.match(html, /data-orientation="landscape"/);
  assert.match(html, /data-layout="article"/);
  assert.equal(
    renderToStaticMarkup(
      createElement(AdaptiveVideo, {
        videoUrl: "javascript:alert(1)",
        title: "Test",
      }),
    ),
    "",
  );
});
test("source metadata is optional and explicit overrides always take priority", () => {
  assert.equal(
    resolveVideoOrientation(undefined, { width: 1080, height: 1920 }),
    "portrait",
  );
  assert.equal(
    resolveVideoOrientation(undefined, { width: 1920, height: 1080 }),
    "landscape",
  );
  assert.equal(
    resolveVideoOrientation(undefined, { width: 1080, height: 1080 }),
    "square",
  );
  assert.equal(
    resolveVideoOrientation("square", { width: 1080, height: 1920 }),
    "square",
  );
  assert.equal(
    resolveVideoOrientation(undefined, { width: 0, height: 1080 }),
    "landscape",
  );
  assert.equal(resolveVideoOrientation(), "landscape");
});
const source = `---
slug: video-test
title: Données de test
description: Vérification technique.
category: sport
contentType: reflection
publicationDate: "2026-01-01"
language: fr
coverImage: null
videoUrl: ${url}
tags: []
status: draft
featured: false
---
`;
test("content does not infer portrait from the pilot URL or V2 thumbnail mediaAspect", () => {
  assert.equal(parseContent(source).orientation, "landscape");
  assert.equal(
    parseContent(source.replace("tags: []", "mediaAspect: portrait\ntags: []"))
      .orientation,
    "landscape",
  );
});
test("frontmatter accepts three explicit orientations, source dimensions and overrides", () => {
  for (const value of videoOrientations)
    assert.equal(
      parseContent(
        source.replace("tags: []", `orientation: ${value}\ntags: []`),
      ).orientation,
      value,
    );
  const metadata = source.replace(
    "tags: []",
    "videoDimensions: { width: 1080, height: 1920 }\ntags: []",
  );
  assert.equal(parseContent(metadata).orientation, "portrait");
  assert.equal(
    parseContent(
      metadata.replace("tags: []", "orientation: landscape\ntags: []"),
    ).orientation,
    "landscape",
  );
  assert.throws(() =>
    parseContent(source.replace("tags: []", "orientation: diagonal\ntags: []")),
  );
  assert.throws(() =>
    parseContent(
      source.replace(
        "tags: []",
        "videoDimensions: { width: -1, height: 1920 }\ntags: []",
      ),
    ),
  );
});
test("poster configuration uses only local assets and stays optional", () => {
  assert.equal(
    localVideoPoster("/assets/portraits/approved.webp"),
    "/assets/portraits/approved.webp",
  );
  assert.equal(
    localVideoPoster("https://unapproved.example/photo.jpg"),
    undefined,
  );
  assert.equal(localVideoPoster("/assets/../secret"), undefined);
  assert.equal(localVideoPoster(null), undefined);
  assert.ok(
    contentSchema.safeParse({
      ...parseContent(source),
      poster: "/assets/poster.webp",
    }).success,
  );
  assert.throws(() =>
    parseContent(
      source.replace(
        "tags: []",
        "poster: https://unapproved.example/photo.jpg\ntags: []",
      ),
    ),
  );
});
