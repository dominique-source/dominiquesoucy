import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { pilotPoster } from "../lib/homepage-media";
import { pilotVideo } from "../lib/config";
import { videoSource, activatedEmbedUrl } from "../lib/video";

test("the pilot uses a replaceable authentic local archive poster with FR/EN controls", () => {
  assert.equal(pilotPoster.videoUrl, pilotVideo.videoUrl);
  assert.equal(pilotPoster.visible, true);
  assert.ok(pilotPoster.src.startsWith("/assets/dominique/originals/"));
  assert.ok(existsSync(`public${pilotPoster.src}`));
  for (const lang of ["fr", "en"] as const) {
    assert.ok(pilotPoster.alt[lang].length > 20);
    assert.ok(pilotPoster.playLabel[lang].length > 20);
    assert.ok(pilotPoster.episode[lang].includes("00"));
    assert.ok(pilotPoster.photoCredit[lang].length > 20);
  }
});

test("autoplay is opt-in after activation and retains a usable privacy-enhanced player", () => {
  const source = videoSource(pilotVideo.videoUrl)!;
  assert.equal(
    source.src,
    "https://www.youtube-nocookie.com/embed/6Zy87nhpHS8",
  );
  assert.equal(activatedEmbedUrl(source.src, false), source.src);
  const activated = new URL(activatedEmbedUrl(source.src, true));
  assert.equal(activated.hostname, "www.youtube-nocookie.com");
  assert.equal(activated.pathname, "/embed/6Zy87nhpHS8");
  assert.equal(activated.searchParams.get("autoplay"), "1");
  assert.equal(activated.searchParams.get("controls"), "1");
  assert.equal(activated.searchParams.get("playsinline"), "1");
});
