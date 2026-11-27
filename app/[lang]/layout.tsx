import type { Metadata } from "next";
import { locale, dict } from "@/lib/i18n";
import { site } from "@/lib/config";
import { Header, Footer } from "@/components/site";
import { LocaleProvider } from "@/components/locale-provider";
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
    icons: { icon: "/assets/logos/05_DS_MEDIA.png" },
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
    <LocaleProvider lang={lang}>
      <a className="skip-link" href="#main">
        {dict(lang).skip}
      </a>
      <Header lang={lang} />
      <main id="main">{children}</main>
      <Footer lang={lang} />
    </LocaleProvider>
  );
}
