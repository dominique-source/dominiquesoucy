import { existsSync } from "node:fs";
import path from "node:path";
import { loadContent } from "../lib/content";
const entries = loadContent();
for (const entry of entries)
  for (const asset of [
    entry.coverImage,
    entry.captions,
    entry.videoUrl?.startsWith("/assets/") ? entry.videoUrl : undefined,
  ])
    if (asset && !existsSync(path.join(process.cwd(), "public", asset)))
      throw new Error(`Missing asset: ${asset}`);
console.log(`Validated ${entries.length} editorial entries.`);
