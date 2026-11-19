import type { MetadataRoute } from "next";
import { site } from "@/lib/config";
import { locales, sections } from "@/lib/i18n";
import { published, loadContent, entryPath } from "@/lib/content";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...locales.flatMap((lang) =>
      ["", ...sections, "a-propos"].map((p) => ({
        url: `${site.url}/${lang}${p ? `/${p}` : ""}`,
      })),
    ),
    ...published(loadContent()).map((e) => ({
      url: site.url + entryPath(e),
      lastModified: e.publicationDate,
    })),
  ];
}
