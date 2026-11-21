import type { MetadataRoute } from "next";
import { site } from "@/lib/config";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/fr/studio-live", "/en/studio-live", "/api/studio/"],
    },
    sitemap: site.url + "/sitemap.xml",
  };
}
