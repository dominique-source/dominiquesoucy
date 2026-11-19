import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { locale, dict } from "@/lib/i18n";
import { site } from "@/lib/config";
import { Header, Footer } from "@/components/site";
import "../globals.css";
const display = localFont({
  src: "../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-italic.woff2",
  variable: "--font-display",
  display: "swap",
});
const sans = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2",
      weight: "600",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});
export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark",
};
export function generateStaticParams() {
  return [{ lang: "fr" }, { lang: "en" }];
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const lang = locale((await params).lang);
  const d = dict(lang);
  return {
    metadataBase: new URL(site.url),
    title: {
      default: "Dominique Soucy — " + d.eyebrow,
      template: "%s — Dominique Soucy",
    },
    description: d.positioning,
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: lang === "fr" ? "fr_CA" : "en_CA",
      title: site.name,
      description: d.positioning,
      images: [
        {
          url: `/og?lang=${lang}`,
          width: 1200,
          height: 630,
          alt: `Dominique Soucy — ${d.eyebrow}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: site.name,
      description: d.positioning,
      images: [`/og?lang=${lang}`],
    },
    icons: { icon: "/assets/brand/favicon.svg" },
  };
}
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const lang = locale((await params).lang);
  return (
    <html
      lang={lang === "fr" ? "fr-CA" : "en-CA"}
      className={`${display.variable} ${sans.variable}`}
    >
      <body>
        <a className="skip-link" href="#main">
          {dict(lang).skip}
        </a>
        <Header lang={lang} />
        <main id="main">{children}</main>
        <Footer lang={lang} />
      </body>
    </html>
  );
}
