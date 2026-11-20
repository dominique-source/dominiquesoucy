import Link from "next/link";
import Image from "next/image";
import { dict, type Locale, type Section } from "@/lib/i18n";
import { brand } from "@/lib/brand-copy";
import {
  entryPath,
  featuredReflection,
  availableTopics,
  type Entry,
  type ObservationTopic,
} from "@/lib/content";
import {
  AbstractVisual,
  EditorialCard,
  EmptyState,
  SignatureQuote,
} from "./editorial";
import { AdaptiveVideo } from "./adaptive-video";
import { pilotVideo } from "@/lib/config";
import { Reveal } from "./reveal";
export function EntryMeta({ entry, lang }: { entry: Entry; lang: Locale }) {
  const d = dict(lang);
  return (
    <div className="card-meta">
      <span>{d.categories[entry.category]}</span>
      <time dateTime={entry.publicationDate}>
        {new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", {
          dateStyle: "long",
          timeZone: "UTC",
        }).format(new Date(entry.publicationDate))}
      </time>
      {entry.duration && <span>{entry.duration}</span>}
    </div>
  );
}
export function TopicFilters({
  lang,
  section,
  entries,
  active,
  observations = false,
}: {
  lang: Locale;
  section: Section;
  entries: Entry[];
  active?: string;
  observations?: boolean;
}) {
  const b = brand(lang);
  const d = dict(lang);
  const topics = observations
    ? availableTopics(entries)
    : (Object.keys(d.categories).filter((key) =>
        entries.some((e) => e.category === key),
      ) as ObservationTopic[]);
  return (
    <nav className="topic-filters" aria-label={d.allCategories}>
      <Link
        href={`/${lang}/${section}`}
        aria-current={!active ? "page" : undefined}
      >
        {b.all}
      </Link>
      {topics.map((topic) => (
        <Link
          key={topic}
          href={`/${lang}/${section}?category=${topic}`}
          aria-current={active === topic ? "page" : undefined}
        >
          {b.topics[topic]}
        </Link>
      ))}
    </nav>
  );
}
export function VideoEditorial({
  lang,
  entries,
  allEntries,
  active,
}: {
  lang: Locale;
  entries: Entry[];
  allEntries: Entry[];
  active?: string;
}) {
  const b = brand(lang);
  const d = dict(lang);
  const featured = featuredReflection(entries);
  const showPilot = !featured && !active;
  const orientation = featured?.videoUrl
    ? featured.orientation
    : showPilot
      ? pilotVideo.orientation
      : undefined;
  const others = entries.filter((e) => e.slug !== featured?.slug);
  return (
    <div className="video-editorial">
      <div className="content-shell">
        <header className="film-heading">
          <p className="eyebrow">
            {d.nav.reflexions} / {b.filmLabel}
          </p>
          <h1>
            {b.filmTitle[0]}
            <br />
            <span>{b.filmTitle[1]}</span>
          </h1>
          <p>{b.filmIntro}</p>
        </header>
        <section
          className={`screening-room ${orientation ? `video-orientation-${orientation}` : ""} ${featured || showPilot ? "" : "screening-empty"}`}
          aria-label={b.latestLabel}
        >
          {featured ? (
            <>
              <div className="screening-media">
                {featured.videoUrl ? (
                  <AdaptiveVideo
                    videoUrl={featured.videoUrl}
                    orientation={featured.orientation}
                    poster={featured.poster ?? featured.coverImage}
                    layout="featured"
                    title={featured.title}
                    lang={lang}
                    captions={featured.captions}
                  />
                ) : (
                  <Link href={entryPath(featured)} className="screen-cover">
                    {featured.coverImage ? (
                      <Image
                        src={featured.coverImage}
                        alt={featured.coverAlt!}
                        fill
                        sizes="(max-width: 850px) 100vw, 60vw"
                        priority
                      />
                    ) : (
                      <AbstractVisual />
                    )}
                    <span>{d.read}</span>
                  </Link>
                )}
              </div>
              <div className="screening-intro">
                <p className="eyebrow accent">{b.latestLabel}</p>
                <EntryMeta entry={featured} lang={lang} />
                <h2>
                  <Link href={entryPath(featured)}>{featured.title}</Link>
                </h2>
                <p>{featured.description}</p>
                <Link
                  className="button button-outline"
                  href={`${entryPath(featured)}#texte`}
                >
                  {b.transcript}
                </Link>
              </div>
            </>
          ) : showPilot ? (
            <>
              <div className="screening-media">
                <AdaptiveVideo
                  videoUrl={pilotVideo.videoUrl}
                  orientation={pilotVideo.orientation}
                  layout={pilotVideo.layout}
                  poster={pilotVideo.poster}
                  title={pilotVideo.label}
                  lang={lang}
                />
              </div>
              <div className="screening-intro">
                <p className="eyebrow accent">{d.nav.reflexions}</p>
                <h2 lang="fr">{pilotVideo.label}</h2>
                <p>{b.pilotDescription}</p>
                <div className="screening-note">{d.mission}</div>
              </div>
            </>
          ) : (
            <>
              <div className="empty-screen">
                <AbstractVisual kind="court" />
                <div className="screen-slate">
                  <span className="slate-brand">
                    DS<span>.</span>
                  </span>
                  <span className="eyebrow">{d.nav.reflexions}</span>
                  <span className="screen-slate-rule" />
                  <span>{b.formatLabel}</span>
                </div>
                <div className="screen-corners" aria-hidden="true" />
              </div>
              <div className="screening-intro">
                <p className="eyebrow accent">{b.filmLabel}</p>
                <h2>{b.filmEmpty}</h2>
                <p>{b.filmEmptyBody}</p>
                <div className="screening-note">{d.mission}</div>
              </div>
            </>
          )}
        </section>
      </div>
      <section className="film-library" id="bibliotheque">
        <div className="content-shell">
          <div className="library-heading">
            <h2>
              {b.filmLibrary}
              <span aria-hidden="true"> /</span>
            </h2>
            <p>{b.filmLibraryNote}</p>
          </div>
          <TopicFilters
            lang={lang}
            section="reflexions"
            entries={allEntries}
            active={active}
          />
          {others.length ? (
            <div className="film-library-grid">
              {others.map((e) => (
                <Reveal key={e.slug}>
                  <EditorialCard entry={e} lang={lang} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="library-empty">
              <span className="empty-dash" aria-hidden="true" />
              <p>{featured ? b.relatedEmpty : b.filmLibraryEmpty}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
export function FieldNotesEmpty({
  lang,
  filtered = false,
}: {
  lang: Locale;
  filtered?: boolean;
}) {
  const b = brand(lang);
  return (
    <div className="field-empty">
      <div className="field-empty-graphic">
        <AbstractVisual kind="lines" />
        <p aria-hidden="true">
          {b.fieldStatement[0]}
          <br />
          <span>{b.fieldStatement[1]}</span>
        </p>
        <span className="field-empty-caption">
          {b.fieldNotes} / DOMINIQUE SOUCY
        </span>
      </div>
      <div className="field-empty-copy">
        <p className="eyebrow accent">{b.fieldNotes}</p>
        <h2>{filtered ? b.noResults : b.fieldEmpty}</h2>
        <p>{filtered ? b.noResultsBody : b.fieldEmptyBody}</p>
        <div className="field-format-list">
          <span className="eyebrow">{b.fieldLegend}</span>
          {Object.entries(b.formats).map(([key, value]) => (
            <div key={key}>
              <span
                className={`format-glyph glyph-${key}`}
                aria-hidden="true"
              />
              {value}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export function FieldNotes({
  lang,
  entries,
  allEntries,
  active,
}: {
  lang: Locale;
  entries: Entry[];
  allEntries: Entry[];
  active?: string;
}) {
  const d = dict(lang);
  const b = brand(lang);
  return (
    <div className="field-notes content-shell">
      <header className="field-heading">
        <div>
          <p className="eyebrow">{b.fieldNotes}</p>
          <h1>
            {d.nav.observations}
            <span className="heading-swipe" aria-hidden="true" />
          </h1>
          <p>{b.fieldSubtitle}</p>
        </div>
        <div className="field-heading-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </header>
      <TopicFilters
        lang={lang}
        section="observations"
        entries={allEntries}
        active={active}
        observations
      />
      {entries.length ? (
        <div className="field-grid" role="region" aria-label={b.fieldNotes}>
          <h2 className="sr-only">{b.fieldNotes}</h2>
          {entries.map((entry, index) => (
            <Reveal
              key={entry.slug}
              className={`field-note field-note-${index % 6} field-${entry.contentType} media-${entry.mediaAspect}`}
            >
              <EditorialCard entry={entry} lang={lang} />
            </Reveal>
          ))}
        </div>
      ) : (
        <FieldNotesEmpty lang={lang} filtered={Boolean(active)} />
      )}
      <SignatureQuote lang={lang} full />
    </div>
  );
}
export function SubjectEditorial({
  lang,
  section,
  entries,
  allEntries,
  active,
}: {
  lang: Locale;
  section: "sport-culture" | "societe";
  entries: Entry[];
  allEntries: Entry[];
  active?: string;
}) {
  const d = dict(lang);
  const b = brand(lang);
  return (
    <div className={`subject-editorial subject-${section} content-shell`}>
      <header className="subject-heading">
        <p className="eyebrow accent">{b.topicIntro}</p>
        <h1>{d.nav[section]}</h1>
        <p>{d.descriptions[section]}</p>
        {section === "societe" && <p className="subjects">{d.subjects}</p>}
        <span className="subject-orbit" aria-hidden="true" />
      </header>
      <TopicFilters
        lang={lang}
        section={section}
        entries={allEntries}
        active={active}
      />
      {entries.length ? (
        <div className="subject-grid">
          {entries.map((e) => (
            <Reveal key={e.slug}>
              <EditorialCard entry={e} lang={lang} />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="subject-empty">
          <span className="eyebrow">{d.nav[section]}</span>
          <h2>{section === "societe" ? b.subjectSociety : b.subjectSport}</h2>
          <EmptyState lang={lang} compact />
        </div>
      )}
    </div>
  );
}
