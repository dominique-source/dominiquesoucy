import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  heroPortrait,
  heroPortraitStyle,
  type HeroPortrait,
} from "../lib/hero-media";

test("the extreme close-up uses the authentic face-dense source and excludes the lower torso", () => {
  assert.equal(
    heroPortrait.src,
    "/assets/dominique/originals/05_portrait_ballon.jpg",
  );
  assert.ok(existsSync(`public${heroPortrait.src}`));
  assert.equal(heroPortrait.silhouetteMask, undefined);
  for (const crop of [heroPortrait.desktopCrop, heroPortrait.mobileCrop]) {
    assert.ok(crop.scale >= 2.8 && crop.scale <= 3.1);
    const lastVisibleSourceRow =
      heroPortrait.height * (1 - crop.excludeBottom / 100);
    assert.ok(lastVisibleSourceRow > 230 && lastVisibleSourceRow < 350);
  }
  assert.equal(heroPortrait.maxRenderedWidth, 1200);
  assert.ok(heroPortrait.alt.fr.length > 30 && heroPortrait.alt.en.length > 30);
});

test("a replacement portrait carries its own dimensions, focus, zoom and mobile crop without component changes", () => {
  const replacement: HeroPortrait = {
    ...heroPortrait,
    src: "/assets/portraits/future-approved.jpg",
    width: 2400,
    height: 3000,
    desktopCrop: {
      objectPosition: "60% 10%",
      scale: 1.2,
      excludeBottom: 15,
      offsetY: "-2%",
    },
    mobileCrop: {
      objectPosition: "55% 5%",
      scale: 1.1,
      excludeBottom: 10,
      offsetY: "0%",
    },
    monochrome: false,
    maxRenderedWidth: 1200,
  };
  const style = heroPortraitStyle(replacement) as Record<
    string,
    string | number
  >;
  assert.equal(style["--portrait-ratio"], "2400 / 3000");
  assert.equal(style["--portrait-max-width"], "1000px");
  assert.equal(style["--portrait-desktop-position"], "60% 10%");
  assert.equal(style["--portrait-desktop-scale"], 1.2);
  assert.equal(style["--portrait-mobile-position"], "55% 5%");
  assert.equal(style["--portrait-mobile-clip"], "10%");
  assert.equal(style["--portrait-monochrome"], 0);
});
