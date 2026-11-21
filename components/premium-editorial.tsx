import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import { brand } from "@/lib/brand-copy";
import { pilotVideo } from "@/lib/config";
import type { Entry } from "@/lib/content";
import { featuredReflection } from "@/lib/content";
import { archiveLabel } from "@/lib/photography";
import { AdaptiveVideo } from "./adaptive-video";
import {
  ArchivePhoto,
  EditorialPortrait,
  PhotoStorySection,
  PhotoWithCaption,
} from "./photography";
import { EditorialCard } from "./editorial";
import { Reveal } from "./reveal";
const wording = {
  fr: {
    archive: "Le parcours en images",
    athlete: "L’athlète.",
    human: "L’humain.",
    entrepreneur: "L’entrepreneur.",
    thinker: "Le regard.",
    athleteBody: "Ancien joueur canadien de basketball de haut niveau.",
    entrepreneurBody: "Entrepreneur et créateur de PürInstinct.",
    chapter: "Le parcours",
    open: "Explorer",
    field: "Sur le vif. Sans détour.",
    archiveContext:
      "Un aperçu des archives personnelles. Les nouvelles observations seront publiées dans le carnet.",
    sport: "Du terrain à la culture.",
    society: "Prendre du recul.",
    preview: "Un espace éditorial",
    current: "À l’écran",
    intro: "Le parcours. Le regard.",
    photo: "Photographies d’archives",
    noDate: "Images d’archives · dates non renseignées",
  },
  en: {
    archive: "A journey in photographs",
    athlete: "The athlete.",
    human: "The human.",
    entrepreneur: "The entrepreneur.",
    thinker: "The perspective.",
    athleteBody: "A former high-level Canadian basketball player.",
    entrepreneurBody: "Entrepreneur and creator of PürInstinct.",
    chapter: "The journey",
    open: "Explore",
    field: "In the moment. Unfiltered.",
    archiveContext:
      "A glimpse into the personal archives. New observations will appear in the journal.",
    sport: "From court to culture.",
    society: "Take a step back.",
    preview: "An editorial space",
    current: "On screen",
    intro: "The journey. The perspective.",
    photo: "Archival photographs",
    noDate: "Archival images · dates not provided",
  },
};
export function PremiumHero({ lang }: { lang: Locale }) {
  const d = dict(lang);
  return (
    <section className="premium-hero content-shell">
      <div className="premium-hero-copy">
        <p className="eyebrow accent">{d.eyebrow}</p>
        <h1>
          <span>DOMINIQUE</span>
          <span>
            SOUCY<b>.</b>
          </span>
        </h1>
        <p className="premium-position">{d.positioning}</p>
        <p className="premium-mission">{d.mission}</p>
        <div className="premium-actions">
          <Link className="button button-cut" href={`/${lang}/reflexions`}>
            {d.explore}
          </Link>
          <Link className="text-link" href={`/${lang}/a-propos`}>
            {d.discover}
          </Link>
        </div>
      </div>
      <div className="premium-hero-image">
        <EditorialPortrait lang={lang} priority background="light" />
        <p className="portrait-colophon">
          DOMINIQUE SOUCY{" "}
          <span>
            {lang === "fr" ? "Un regard personnel." : "A personal perspective."}
          </span>
        </p>
      </div>
      <div className="premium-colophon">
        <span>{d.mission}</span>
        <span>DOMINIQUESOUCY.COM</span>
      </div>
    </section>
  );
}
export function PilotFeature({ lang }: { lang: Locale }) {
  const d = dict(lang),
    b = brand(lang),
    w = wording[lang];
  return (
    <section className="premium-pilot" aria-labelledby="home-pilot-title">
      <div className="content-shell pilot-composition">
        <div className="pilot-copy">
          <p className="eyebrow accent">
            {d.nav.reflexions} / {w.current}
          </p>
          <h2 id="home-pilot-title" lang="fr">
            PILOTE
            <span>
              ÉPISODE 00<span className="accent">.</span>
            </span>
          </h2>
          <p>{b.pilotDescription}</p>
          <p className="pilot-statement">{d.mission}</p>
          <Link className="text-link" href={`/${lang}/reflexions`}>
            {d.explore}
          </Link>
        </div>
        <div
          id="pilote"
          className="pilot-player"
          tabIndex={-1}
          role="group"
          aria-label={pilotVideo.label}
        >
          <p className="eyebrow" lang="fr">
            {pilotVideo.label}
          </p>
          <AdaptiveVideo
            videoUrl={pilotVideo.videoUrl}
            orientation={pilotVideo.orientation}
            poster={pilotVideo.poster}
            layout="featured"
            title={pilotVideo.label}
            lang={lang}
          />
        </div>
      </div>
    </section>
  );
}
export function PremiumHomeEditorial({
  lang,
  entries,
}: {
  lang: Locale;
  entries: Entry[];
}) {
  const d = dict(lang),
    w = wording[lang],
    featured = featuredReflection(entries);
  return (
    <>
      {featured && (
        <section className="content-shell published-feature">
          <p className="eyebrow accent">{d.latest}</p>
          <EditorialCard entry={featured} lang={lang} />
        </section>
      )}
      <section className="home-journal">
        <div className="content-shell">
          <div className="journal-heading">
            <p className="eyebrow">{w.preview}</p>
            <h2>
              {d.nav.observations}
              <span className="accent">.</span>
            </h2>
          </div>
          <PhotoStorySection className="journal-spread">
            <PhotoWithCaption
              photo="04_equipe_purathlete"
              lang={lang}
              caption={archiveLabel(lang)}
            />
            <div>
              <p className="eyebrow">{w.photo}</p>
              <h3>{w.field}</h3>
              <p>{w.archiveContext}</p>
              <Link className="text-link" href={`/${lang}/observations`}>
                {w.open}
              </Link>
            </div>
          </PhotoStorySection>
        </div>
      </section>
      <section className="home-topics content-shell">
        <PhotoStorySection className="sport-preview">
          <ArchivePhoto
            photo="07_archive_rouge_et_or"
            lang={lang}
            caption={archiveLabel(lang)}
          />
          <div>
            <p className="eyebrow accent">{d.nav["sport-culture"]}</p>
            <h2>{w.sport}</h2>
            <p>{d.descriptions["sport-culture"]}</p>
            <Link className="text-link" href={`/${lang}/sport-culture`}>
              {w.open}
            </Link>
          </div>
        </PhotoStorySection>
        <Reveal className="society-preview">
          <p className="eyebrow">{d.nav.societe}</p>
          <h2>{w.society}</h2>
          <p>{d.descriptions.societe}</p>
          <p className="society-subjects">{d.subjects}</p>
          <Link className="text-link" href={`/${lang}/societe`}>
            {w.open}
          </Link>
        </Reveal>
      </section>
    </>
  );
}
export function AboutNarrative({ lang }: { lang: Locale }) {
  const d = dict(lang),
    w = wording[lang];
  return (
    <div className="about-premium">
      <header className="content-shell about-opening">
        <p className="eyebrow accent">DOMINIQUE SOUCY / {d.nav["a-propos"]}</p>
        <h1>{w.intro}</h1>
        <p>{d.bio}</p>
        <nav aria-label={w.chapter}>
          {[w.athlete, w.human, w.entrepreneur, w.thinker].map((s, i) => (
            <a href={`#chapter-${i + 1}`} key={s}>
              {s}
            </a>
          ))}
        </nav>
      </header>
      <section id="chapter-1" className="chapter chapter-athlete content-shell">
        <PhotoStorySection>
          <ArchivePhoto
            photo="07_archive_rouge_et_or"
            lang={lang}
            caption={archiveLabel(lang)}
          />
          <div className="chapter-copy">
            <p className="eyebrow accent">{w.chapter} / 01</p>
            <h2>{w.athlete}</h2>
            <p>{w.athleteBody}</p>
            <ArchivePhoto
              photo="01_basket_action_archive"
              lang={lang}
              caption={w.noDate}
              className="small-archive"
            />
          </div>
        </PhotoStorySection>
      </section>
      <section id="chapter-2" className="chapter chapter-human">
        <div className="content-shell">
          <PhotoStorySection>
            <div className="chapter-copy">
              <p className="eyebrow">{w.chapter} / 02</p>
              <h2>{w.human}</h2>
              <p>{d.bridgeBody}</p>
              <PhotoWithCaption
                photo="03_moment_communautaire"
                lang={lang}
                caption={archiveLabel(lang)}
                className="human-inset"
              />
            </div>
            <PhotoWithCaption
              photo="06_moment_humain"
              lang={lang}
              caption={archiveLabel(lang)}
              background="light"
            />
          </PhotoStorySection>
        </div>
      </section>
      <section
        id="chapter-3"
        className="chapter chapter-entrepreneur content-shell"
      >
        <div className="chapter-heading">
          <p className="eyebrow accent">{w.chapter} / 03</p>
          <h2>{w.entrepreneur}</h2>
          <p>{w.entrepreneurBody}</p>
        </div>
        <PhotoStorySection>
          <PhotoWithCaption
            photo="04_equipe_purathlete"
            lang={lang}
            caption={archiveLabel(lang)}
          />
          <PhotoWithCaption
            photo="05_portrait_ballon"
            lang={lang}
            caption={archiveLabel(lang)}
          />
        </PhotoStorySection>
      </section>
      <section id="chapter-4" className="chapter chapter-thinker content-shell">
        <PhotoStorySection>
          <EditorialPortrait
            lang={lang}
            caption="Dominique Soucy"
            background="light"
          />
          <div className="chapter-copy">
            <p className="eyebrow accent">{w.chapter} / 04</p>
            <h2>{w.thinker}</h2>
            <p>{d.bio2}</p>
            <Link href={`/${lang}/reflexions`} className="text-link">
              {d.explore}
            </Link>
          </div>
        </PhotoStorySection>
      </section>
    </div>
  );
}
export function FieldArchive({ lang }: { lang: Locale }) {
  const w = wording[lang];
  return (
    <div className="field-archive">
      <PhotoWithCaption
        photo="03_moment_communautaire"
        lang={lang}
        caption={archiveLabel(lang)}
      />
      <p>{w.archiveContext}</p>
    </div>
  );
}
export function SportArchive({ lang }: { lang: Locale }) {
  return (
    <div className="sport-archive-spread">
      <ArchivePhoto
        photo="07_archive_rouge_et_or"
        lang={lang}
        caption={archiveLabel(lang)}
      />
      <div>
        <p className="eyebrow accent">{wording[lang].photo}</p>
        <h2>{wording[lang].sport}</h2>
        <ArchivePhoto
          photo="01_basket_action_archive"
          lang={lang}
          caption={wording[lang].noDate}
          className="small-archive"
        />
      </div>
    </div>
  );
}
