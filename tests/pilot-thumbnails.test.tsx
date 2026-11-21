import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { pilotVideo } from "../lib/config";
import { pilotThumbnails, thumbnailDestination } from "../lib/pilot-thumbnails";
import { PilotThumbnailLink } from "../components/pilot-thumbnail-link";

test("three distinct authentic thumbnail treatments share the existing portrait pilot", () => {
  assert.equal(
    pilotVideo.videoUrl,
    "https://www.youtube.com/watch?v=6Zy87nhpHS8",
  );
  assert.equal(pilotVideo.orientation, "portrait");
  assert.deepEqual(
    pilotThumbnails.map((entry) => entry.style),
    ["question", "manifesto", "documentary"],
  );
  for (const entry of pilotThumbnails) {
    assert.equal(entry.videoUrl, pilotVideo.videoUrl);
    assert.equal(thumbnailDestination(entry), "#pilote");
    assert.match(entry.image.src, /^\/assets\/dominique\/originals\//);
    assert.ok(existsSync(`public${entry.image.src}`));
    for (const lang of ["fr", "en"] as const) {
      assert.ok(entry.title[lang].every((line) => line.length > 0));
      assert.ok(entry.episodeLabel[lang].includes("00"));
    }
  }
});

test("future videos resolve independently without sending every thumbnail to the pilot", () => {
  const entry = {
    ...pilotThumbnails[0],
    videoUrl: "https://vimeo.com/123456789",
  };
  assert.equal(thumbnailDestination(entry), entry.videoUrl);
  assert.equal(
    thumbnailDestination({
      ...entry,
      watchPath: "/en/reflexions/a-published-video",
    }),
    "/en/reflexions/a-published-video",
  );
  assert.throws(() =>
    thumbnailDestination({ ...entry, videoUrl: "javascript:alert(1)" }),
  );
  assert.throws(() =>
    thumbnailDestination({ ...entry, watchPath: "//evil.example" }),
  );
  assert.equal(
    thumbnailDestination({
      ...entry,
      videoUrl: "https://youtu.be/6Zy87nhpHS8",
    }),
    "#pilote",
  );
});

test("thumbnail anchors retain native navigation and accessible player relationships without rendering another player", () => {
  for (const href of ["#pilote", "https://vimeo.com/123456789"]) {
    const html = renderToStaticMarkup(
      <PilotThumbnailLink
        href={href}
        className="pilot-thumbnail"
        label="Watch the video"
      >
        Editorial card
      </PilotThumbnailLink>,
    );
    assert.ok(html.includes(`href="${href}"`));
    assert.match(html, /aria-label="Watch the video"/);
    assert.equal(html.includes('aria-controls="pilote"'), href === "#pilote");
    assert.doesNotMatch(html, /<iframe|<video|autoplay/);
  }
});
