import { ImpactSection } from "@/components/impact-section";
import { MediaLibrary } from "@/components/media-library";
import { CinematicHero } from "@/components/cinematic-hero";
import { locale, dict } from "@/lib/i18n";
import { pageMetadata, jsonLd } from "@/lib/metadata";
import { site } from "@/lib/config";
import "./home-streamlined.css";
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
    <div className="home-v2 home-streamlined">
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
      <MediaLibrary lang={lang} />
      <ImpactSection lang={lang} />
      <section aria-label={lang === "fr" ? "30 ans sur le terrain" : "30 years on the field"} style={{background:"#0a0a0a",width:"100%"}}>
        <iframe src="/journey-prototype-v3.html" title="The Journey" loading="lazy" style={{display:"block",width:"100%",height:"100svh",border:0}} />
      </section>
    </div>
  );
}
