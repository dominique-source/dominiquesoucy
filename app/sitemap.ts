import type { MetadataRoute } from "next";
import { site } from "@/lib/config";
import { locales } from "@/lib/i18n";
export default function sitemap(): MetadataRoute.Sitemap {
  return locales.map((lang) => ({ url: `${site.url}/${lang}` }));
}
