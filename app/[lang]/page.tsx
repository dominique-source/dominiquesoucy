import { existsSync } from "node:fs";
import { join } from "node:path";
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
      <section className="home-era" aria-labelledby="home-era-title">
        <div className="home-era-inner">
          <p className="home-era-past">{lang === "fr" ? "Hier." : "Yesterday."}</p>
          <div className="home-era-bridge">
            <img src="/assets/logos/02_DS_signature.png" alt="" aria-hidden="true" style={{width:110,height:65,objectFit:"contain",position:"relative",zIndex:2}} />
            <svg viewBox="0 0 1000 140" preserveAspectRatio="none" aria-hidden="true">
              <path pathLength="1" d="M-20 90 Q200 5 390 72 T710 65 T1020 28" />
              <path pathLength="1" d="M-20 100 Q200 15 390 82 T710 75 T1020 38" />
            </svg>
            <p>{lang === "fr" ? "Le regard évolue. La curiosité demeure." : "Perspectives evolve. Curiosity remains."}</p>
          </div>
          <div className="home-era-present">
            <div><h2 id="home-era-title">{lang === "fr" ? "Aujourd’hui." : "Today."}</h2>
            <p>{d.eyebrow}</p></div>
            <div className="home-era-portraits">
              {["788","789","791","803","804"].filter(id => existsSync(join(process.cwd(),"public","assets","today",`portrait_${id}.jpg`))).map(id => (
                <img key={id} src={`/assets/today/portrait_${id}.jpg`} alt="Dominique Soucy" width={2048} height={1365} loading="lazy" />
              ))}
            </div>
          </div>
        </div>
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
