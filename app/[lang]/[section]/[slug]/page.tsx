import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { locale, dict, sections, type Section } from "@/lib/i18n";
import { findEntry, entryPath, entrySection } from "@/lib/content";
import { ArticleLayout } from "@/components/editorial";
import { site } from "@/lib/config";
import { pageMetadata, jsonLd } from "@/lib/metadata";
type Props = {
  params: Promise<{ lang: string; section: string; slug: string }>;
};
async function resolve(params: Props["params"]) {
  const p = await params;
  const lang = locale(p.lang);
  if (!sections.includes(p.section as Section)) notFound();
  const section = p.section as Section;
  return {
    lang,
    section,
    entry: findEntry(lang, section, p.slug),
    original: findEntry(lang === "fr" ? "en" : "fr", section, p.slug),
  };
}
export async function generateMetadata({ params }: Props) {
  const { lang, entry } = await resolve(params);
  if (!entry)
    return {
      title: dict(lang).noTranslation,
      robots: { index: false, follow: true },
    };
  const canonical = entryPath(entry);
  const metadata = pageMetadata(
    lang,
    canonical.replace(`/${lang}`, ""),
    entry.title,
    entry.description,
  );
  return {
    ...metadata,
    alternates: {
      canonical,
      languages: {
        [lang === "fr" ? "fr-CA" : "en-CA"]: canonical,
        ...(findEntry(
          lang === "fr" ? "en" : "fr",
          entrySection(entry),
          entry.slug,
        )
          ? {
              [lang === "fr" ? "en-CA" : "fr-CA"]: entryPath(
                entry,
                lang === "fr" ? "en" : "fr",
              ),
            }
          : {}),
      },
    },
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: entry.publicationDate,
      authors: ["Dominique Soucy"],
      images: entry.coverImage
        ? [{ url: entry.coverImage, alt: entry.coverAlt }]
        : [{ url: `/og?lang=${lang}` }],
    },
  };
}
export default async function Article({ params }: Props) {
  const { lang, section, entry, original } = await resolve(params);
  const d = dict(lang);
  if (!entry) {
    if (!original) notFound();
    return (
      <div className="content-shell fallback-page">
        <p className="eyebrow accent">DOMINIQUE SOUCY</p>
        <h1>{d.noTranslation}</h1>
        <Link className="button" href={entryPath(original)}>
          {d.original}
        </Link>
      </div>
    );
  }
  if (section !== entrySection(entry)) permanentRedirect(entryPath(entry));
  return (
    <div className="content-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: entry.title,
            description: entry.description,
            datePublished: entry.publicationDate,
            inLanguage: entry.language,
            author: {
              "@type": "Person",
              name: "Dominique Soucy",
              url: site.url,
            },
            mainEntityOfPage: site.url + entryPath(entry),
            ...(entry.coverImage ? { image: site.url + entry.coverImage } : {}),
          }),
        }}
      />
      <ArticleLayout entry={entry} lang={lang} />
    </div>
  );
}
