import type { Metadata } from "next";
import type { Locale } from "./i18n";
import { site } from "./config";
export function pageMetadata(
  lang: Locale,
  path: string,
  title: string,
  description: string,
): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}${path}`,
      languages: {
        "fr-CA": `/fr${path}`,
        "en-CA": `/en${path}`,
        "x-default": `/fr${path}`,
      },
    },
    openGraph: {
      type: "website",
      url: `/${lang}${path}`,
      title,
      description,
      siteName: site.name,
      locale: lang === "fr" ? "fr_CA" : "en_CA",
      images: [{ url: `/og?lang=${lang}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/og?lang=${lang}`],
    },
  };
}
export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
