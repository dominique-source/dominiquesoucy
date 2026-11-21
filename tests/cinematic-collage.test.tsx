import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import manifest from "../public/assets/home-cinematic/manifest.json";

test("V6 media is byte-identical to its uploaded package, with design mockups kept outside public", () => {
  assert.equal(manifest.referenceOnly, true);
  assert.deepEqual(manifest.videos, []);
  const files = [
    manifest.texture,
    ...manifest.photographs.flatMap((photo) => [photo.source, photo.bw]),
  ];
  for (const file of files) {
    const path = `public${file}`;
    const supplied = execFileSync("unzip", [
      "-p",
      "dominiquesoucy_homepage_cinematic_assets.zip",
      path,
    ]);
    const hash = (bytes: Buffer) =>
      createHash("sha256").update(bytes).digest("hex");
    assert.equal(hash(readFileSync(path)), hash(supplied), path);
  }
  assert.equal(existsSync(`public${manifest.designReference}`), false);
  assert.equal(
    existsSync(`design/homepage-v6${manifest.designReference}`),
    true,
  );
});
