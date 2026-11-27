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
      <section aria-label={lang === "fr" ? "30 ans sur le terrain" : "30 years on the field"} style={{background:"#0a0a0a",width:"100%"}}>
        <iframe src="/journey-prototype-v3.html" title="The Journey" loading="lazy" style={{display:"block",width:"100%",height:"100svh",border:0}} />
      </section>
      <MediaLibrary lang={lang} />
      <ImpactSection lang={lang} />
      <section className="content-shell home-connect" aria-labelledby="home-connect-title">
        <p className="eyebrow accent">{lang==="fr"?"RESTONS CONNECTÉS":"STAY CONNECTED"}</p>
        <h2 id="home-connect-title">{lang==="fr"?"La conversation continue.":"The conversation continues."}</h2>
        <div className="home-connect-links">
          {site.social.map(s=><a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer">{s.name} ↗</a>)}
          <a href={site.purinstinct || "https://purinstinctgames.com"} target="_blank" rel="noopener noreferrer">PürInstinct ↗</a>
        </div>
      </section>
    </div>
  );
}
