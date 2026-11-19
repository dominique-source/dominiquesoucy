import Link from "next/link";
import { Hero, AboutPreview, PurInstinctBridge } from "@/components/site";
import {
  FeaturedReflection,
  ObservationGrid,
  SignatureQuote,
} from "@/components/editorial";
import { Reveal } from "@/components/reveal";
import { locale, dict } from "@/lib/i18n";
import { getEntries } from "@/lib/content";
import { pageMetadata, jsonLd } from "@/lib/metadata";
import { site } from "@/lib/config";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const lang = locale((await params).lang);
  return pageMetadata(
    lang,
    "",
    "Dominique Soucy — " + dict(lang).eyebrow,
    dict(lang).positioning,
  );
}
export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const lang = locale((await params).lang);
  const d = dict(lang);
  const entries = getEntries(lang);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Dominique Soucy",
            url: site.url,
            description: d.bio,
          }),
        }}
      />
      <Hero lang={lang} />
      <div className="content-shell">
        <Reveal>
          <section className="editorial-section">
            <div className="section-header">
              <h2>{d.latest}</h2>
              <Link className="text-link" href={`/${lang}/reflexions`}>
                {d.all}
              </Link>
            </div>
            <FeaturedReflection
              lang={lang}
              entry={entries.find((e) => e.contentType === "reflection")}
            />
          </section>
        </Reveal>
        <Reveal>
          <section className="editorial-section">
            <div className="section-header">
              <div>
                <p className="eyebrow accent">{d.descriptions.observations}</p>
                <h2>{d.nav.observations}</h2>
              </div>
              <Link className="text-link" href={`/${lang}/observations`}>
                {d.all}
              </Link>
            </div>
            <ObservationGrid
              lang={lang}
              entries={getEntries(lang, "observations").slice(0, 3)}
            />
          </section>
        </Reveal>
        <Reveal>
          <SignatureQuote lang={lang} full />
        </Reveal>
        <div className="topic-columns">
          {(["sport-culture", "societe"] as const).map((section) => (
            <Reveal key={section}>
              <section className="editorial-section">
                <p className="eyebrow">{d.descriptions[section]}</p>
                <div className="section-header">
                  <h2>{d.nav[section]}</h2>
                </div>
                {section === "societe" && (
                  <p className="subjects">{d.subjects}</p>
                )}
                <ObservationGrid
                  lang={lang}
                  entries={getEntries(lang, section).slice(0, 2)}
                />
                <Link className="text-link" href={`/${lang}/${section}`}>
                  {d.all}
                </Link>
              </section>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <AboutPreview lang={lang} />
        </Reveal>
        <Reveal>
          <section className="formats">
            <h2>{d.formats}</h2>
            <div className="format-grid">
              {[
                [d.nav.reflexions, d.formatLong, "reflexions"],
                [d.nav.observations, d.formatShort, "observations"],
                [d.thought, d.formatThought, "observations"],
              ].map(([title, text, path]) => (
                <div key={title}>
                  <h3>
                    <Link href={`/${lang}/${path}`}>{title}</Link>
                  </h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
        <Reveal>
          <PurInstinctBridge lang={lang} />
        </Reveal>
      </div>
    </>
  );
}
