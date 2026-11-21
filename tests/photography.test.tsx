import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import manifest from "../public/assets/dominique/assets-manifest.json";
import { photograph, type PhotoId } from "../lib/photography";

test("all seven originals remain byte-identical to the supplied archive", () => {
  assert.equal(manifest.photos.length, 7);
  for (const photo of manifest.photos) {
    const path = `public${photo.original}`;
    const supplied = execFileSync("unzip", [
      "-p",
      "dominiquesoucy_photos_complet_repo.zip",
      path,
    ]);
    const hash = (bytes: Buffer) =>
      createHash("sha256").update(bytes).digest("hex");
    assert.equal(hash(readFileSync(path)), hash(supplied), path);
    for (const lang of ["fr", "en"] as const) {
      const result = photograph(photo.id as PhotoId, lang);
      assert.equal(result.src, photo.original);
      assert.ok(result.alt.length > 20);
      assert.ok(result.width > 0 && result.height > 0);
    }
  }
});
