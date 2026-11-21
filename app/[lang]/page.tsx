import { CinematicHero } from "@/components/cinematic-hero";
import { PilotThumbnailCollection } from "@/components/pilot-thumbnail-collection";
import { PurInstinctBridge } from "@/components/site";
import { HomeSignature } from "@/components/home-editorial";
import {
  PilotFeature,
  PremiumHomeEditorial,
} from "@/components/premium-editorial";
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
  return (
    <div className="home-v2">
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
      <CinematicHero lang={lang} />
      <PilotThumbnailCollection lang={lang} />
      <PilotFeature lang={lang} />
      <PremiumHomeEditorial lang={lang} entries={getEntries(lang)} />
      <div className="content-shell">
        <Reveal>
          <HomeSignature lang={lang} />
        </Reveal>
        <Reveal>
          <PurInstinctBridge lang={lang} />
        </Reveal>
      </div>
    </div>
  );
}
