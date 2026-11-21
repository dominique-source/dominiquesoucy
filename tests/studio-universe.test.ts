import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  studioUniverse,
  heroPortrait,
  heroAtmosphere,
} from "../lib/homepage-media";
import manifest from "../public/assets/studio/manifest.json";

test("the studio uses the exact supplied artwork without raster changes", () => {
  const hash = createHash("sha256")
    .update(readFileSync(`public${studioUniverse.image.src}`))
    .digest("hex");
  assert.equal(
    hash,
    "494086538de7ff46be1941b29da7f7b5ab7e7eba8cc70c0d2ea050b09dfda69e",
  );
  assert.equal(hash, manifest.sha256);
  assert.equal(studioUniverse.image.width, manifest.width);
  assert.equal(studioUniverse.image.height, manifest.height);
});

test("localized slogans retain the embedded French artwork and provide a separate English caption", () => {
  assert.equal(studioUniverse.presentation.fr, "embedded");
  assert.equal(studioUniverse.presentation.en, "caption");
  assert.equal(
    studioUniverse.slogan.fr.join(" "),
    "Bienvenue dans mon univers",
  );
  assert.equal(studioUniverse.slogan.en.join(" "), "Welcome to my world");
  assert.equal(studioUniverse.desktopCrop.fit, "contain");
  assert.equal(studioUniverse.mobileCrop.fit, "contain");
  assert.ok(
    studioUniverse.alt.fr.length > 50 && studioUniverse.alt.en.length > 50,
  );
  assert.equal(
    heroPortrait.src,
    "/assets/dominique/originals/05_portrait_ballon.jpg",
  );
  assert.equal(heroPortrait.silhouetteMask, undefined);
});

test("the hero atmosphere reuses the exact studio source at a restrained opacity", () => {
  assert.equal(heroAtmosphere.src, studioUniverse.image.src);
  assert.ok(heroAtmosphere.opacity > 0 && heroAtmosphere.opacity <= 0.1);
});
