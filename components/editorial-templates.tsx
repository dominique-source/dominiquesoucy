import { FieldArchive } from "./premium-editorial";
import { ArchivePhoto } from "./photography";
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
import { pilotPoster } from "@/lib/homepage-media";
import { photograph } from "@/lib/photography";
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
          <p className="reflection-hero-intro">
            {lang === "fr"
              ? "Un espace pour approfondir une idée, questionner nos certitudes et explorer ce que le sport révèle de notre société."
              : "A place to explore an idea in depth, question our assumptions, and consider what sport reveals about our society."}
          </p>
        </header>
        <div className="reflection-method" aria-label={lang === "fr" ? "Notre démarche" : "Our approach"}>
          {[
            { number: "01", icon: "?", title: lang === "fr" ? "QUESTIONNER" : "QUESTION", body: lang === "fr" ? "Remettre une évidence en question." : "Challenge an assumption." },
            { number: "02", icon: "◇", title: lang === "fr" ? "EXPLORER" : "EXPLORE", body: lang === "fr" ? "Approfondir les idées et leurs contradictions." : "Explore ideas and their contradictions." },
            { number: "03", icon: "◎", title: lang === "fr" ? "DISCUTER" : "DISCUSS", body: lang === "fr" ? "Laisser de la place à la discussion." : "Leave room for discussion." },
          ].map((step) => (
            <div className="reflection-method-step" key={step.number}>
              <span className="reflection-method-icon" aria-hidden="true">{step.icon}</span>
              <div>
                <strong>{step.number} {step.title}</strong>
                <p>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
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
              <div className="screening-media" id="reflection-player" tabIndex={-1}>
                <AdaptiveVideo
                  videoUrl={pilotVideo.videoUrl}
                  orientation={pilotVideo.orientation}
                  layout={pilotVideo.layout}
                  poster={pilotVideo.poster}
                  cinematicPoster={pilotPoster}
                  title={pilotVideo.label}
                  lang={lang}
                />
              </div>
              <div className="screening-intro">
                <p className="eyebrow reflection-feature-eyebrow">
                  {lang === "fr" ? "ÉMISSION À DÉCOUVRIR" : "FEATURED EPISODE"}
                </p>
                <h2>{lang === "fr" ? "PILOTE — ÉPISODE 00" : "PILOT — EPISODE 00"}</h2>
                <p className="reflection-feature-subtitle">{b.pilotDescription}</p>
                <p className="reflection-feature-summary">
                  {lang === "fr"
                    ? "Un premier épisode pour explorer comment le sport reflète nos valeurs, nos contradictions et les grands enjeux qui nous rassemblent."
                    : "A first episode exploring how sport reflects our values, our contradictions, and the issues that bring us together."}
                </p>
                <div className="reflection-feature-points">
                  {(lang === "fr"
                    ? ["Un regard différent", "Des enjeux bien réels", "Une réflexion ouverte"]
                    : ["A different perspective", "Real-world issues", "An open conversation"]
                  ).map((point, index) => <span key={point}><b aria-hidden="true">{["◎", "◇", "▷"][index]}</b>{point}</span>)}
                </div>
                <div className="reflection-feature-actions">
                  <a className="reflection-watch" href="#reflection-player">
                    <span aria-hidden="true">▶</span>
                    {lang === "fr" ? "REGARDER LE PILOTE 00" : "WATCH PILOT 00"}
                  </a>
                  <a className="reflection-library-link" href="#bibliotheque">
                    {lang === "fr" ? "Explorer les réflexions" : "Explore reflections"} <span aria-hidden="true">→</span>
                  </a>
                </div>
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
      {allEntries.length === 0 && !active ? (
      <section className="reflection-upcoming" id="bibliotheque" aria-labelledby="reflection-upcoming-title">
        <div className="content-shell">
          <h2 id="reflection-upcoming-title">
            {lang === "fr" ? "LES PROCHAINES RÉFLEXIONS" : "UPCOMING REFLECTIONS"} <span>/</span>
          </h2>
          <div className="reflection-upcoming-body">
            <span aria-hidden="true" className="reflection-upcoming-symbol">□</span>
            <div>
              <h3>{lang === "fr" ? "De nouvelles réflexions arrivent bientôt." : "New reflections are coming soon."}</h3>
              <p>{lang === "fr"
                ? "Des formats longs pour aller plus loin que l’actualité, avec des analyses, des textes et des épisodes qui prennent le temps d’explorer les idées."
                : "Long-form perspectives that go beyond the headlines, with analysis, writing, and episodes that take time to explore ideas."}</p>
            </div>
          </div>
          <p className="reflection-upcoming-note">
            {lang === "fr"
              ? "Les prochaines publications apparaîtront dans la bibliothèque dès leur mise en ligne."
              : "New publications will appear in the library as soon as they are released."}
          </p>
        </div>
      </section>
      ) : (
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
      )}
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
      {!filtered && <FieldArchive lang={lang} />}
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
  const photo = photograph("03_moment_communautaire", lang);
  const steps = lang === "fr"
    ? [
        { n: "01", title: "OBSERVER", body: "Ce qui se passe, sans détour." },
        { n: "02", title: "QUESTIONNER", body: "Chercher ce qui se cache derrière." },
        { n: "03", title: "PARTAGER", body: "Ouvrir la conversation." },
      ]
    : [
        { n: "01", title: "OBSERVE", body: "What's happening, without spin." },
        { n: "02", title: "QUESTION", body: "Look beyond the surface." },
        { n: "03", title: "SHARE", body: "Open the conversation." },
      ];
  const formats = lang === "fr"
    ? [
        { n: "01", label: "VIDÉO", icon: "▷", name: "SUR LE VIF", body: "Une scène, une prise de parole, une réaction captée au bon moment." },
        { n: "02", label: "PHOTO", icon: "□", name: "REGARDER", body: "Une image authentique et le contexte qu’elle mérite." },
        { n: "03", label: "TEXTE", icon: "≡", name: "METTRE EN MOTS", body: "Une idée courte, directe, qui donne matière à penser." },
      ]
    : [
        { n: "01", label: "VIDEO", icon: "▷", name: "IN THE MOMENT", body: "A scene, a statement, a reaction captured as it happens." },
        { n: "02", label: "PHOTO", icon: "□", name: "LOOK CLOSER", body: "An authentic image and the context it deserves." },
        { n: "03", label: "TEXT", icon: "≡", name: "PUT IT IN WORDS", body: "A short, direct idea worth thinking about." },
      ];
  return (
    <div className="field-notes observations-page">
      <header className="observations-v2-hero">
        <div className="content-shell">
          <p className="eyebrow accent">{lang === "fr" ? "LE CARNET / OBSERVATIONS" : "THE JOURNAL / OBSERVATIONS"}</p>
          <div className="observations-v2-hero-grid">
            <h1>
              <span>{lang === "fr" ? "LE RÉEL." : "REAL LIFE."}</span>
              <span>{lang === "fr" ? "SANS FILTRE." : "UNFILTERED."}</span>
            </h1>
            <div className="observations-v2-intro">
              <h2>{lang === "fr" ? "Une scène vécue. Un fait qui interpelle." : "A lived moment. A fact that makes you think."}</h2>
              <p>{lang === "fr"
                ? "Une observation part du quotidien — sport, société, culture, humain — et ouvre une question qu’on mérite de se poser."
                : "An observation starts with everyday life — sport, society, culture, people — and opens a question worth asking."}</p>
            </div>
          </div>
          <div className="observations-v2-steps" aria-label={lang === "fr" ? "Démarche du carnet" : "Journal approach"}>
            {steps.map((step) => (
              <div className="observations-v2-step" key={step.n}>
                <span>{step.n}</span>
                <div><strong>{step.title}</strong><p>{step.body}</p></div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="observations-v2-story" aria-labelledby="observations-story-title">
        <div className="content-shell">
          <div className="observations-v2-story-head">
            <div>
              <p className="eyebrow">{lang === "fr" ? "UNE PHOTO. UNE HISTOIRE." : "ONE PHOTO. ONE STORY."}</p>
              <h2 id="observations-story-title">{lang === "fr" ? "UN MOMENT QUI FAIT RÉFLÉCHIR." : "A MOMENT THAT MAKES YOU THINK."}</h2>
            </div>
            <p>{lang === "fr"
              ? "Chaque observation commence quelque part. Parfois, il suffit d’une rencontre pour regarder les choses autrement."
              : "Every observation starts somewhere. Sometimes a single encounter can change how we see things."}</p>
          </div>
          <div className="observations-v2-story-grid">
            <figure className="observations-v2-photo">
              <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height}
                sizes="(max-width: 760px) 100vw, 42vw" />
              <figcaption>{lang === "fr" ? "ARCHIVES PERSONNELLES — PHOTOGRAPHIE ORIGINALE NON RETOUCHÉE" : "PERSONAL ARCHIVES — ORIGINAL UNRETOUCHED PHOTOGRAPH"}</figcaption>
            </figure>
            <div className="observations-v2-story-copy">
              <p className="eyebrow accent">{lang === "fr" ? "PHOTOGRAPHIE D’ARCHIVE · MOMENT VÉCU" : "ARCHIVE PHOTOGRAPH · REAL MOMENT"}</p>
              <h3>{lang === "fr" ? "L’HUMAIN DERRIÈRE LE SPORT." : "THE PEOPLE BEHIND SPORT."}</h3>
              <p className="observations-v2-story-lead">{lang === "fr"
                ? "Un sourire, une rencontre, une histoire. Le sport crée des moments qui dépassent le résultat."
                : "A smile, an encounter, a story. Sport creates moments that go beyond the score."}</p>
              <p className="observations-v2-story-disclaimer">{lang === "fr"
                ? "Cette photographie illustre l’esprit du carnet. Il ne s’agit pas d’un article publié : les premières observations viendront prendre place ici au fil des événements et des rencontres."
                : "This photograph illustrates the spirit of the journal. It is not a published article; the first observations will appear here as stories emerge."}</p>
              <div className="observations-v2-story-closer">
                {lang === "fr" ? "Des images réelles. Des questions ouvertes." : "Real images. Open questions."}
                <span aria-hidden="true">↗</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="observations-v2-formats" id="formats" aria-labelledby="observations-formats-title">
        <div className="content-shell">
          <div className="observations-v2-formats-head">
            <div>
              <p className="eyebrow accent">{lang === "fr" ? "LE CARNET PREND PLUSIEURS FORMES" : "THE JOURNAL TAKES MANY FORMS"}</p>
              <h2 id="observations-formats-title">{lang === "fr" ? "UNE IDÉE. TROIS FORMATS." : "ONE IDEA. THREE FORMATS."}</h2>
            </div>
            <p>{lang === "fr"
              ? "Pas de format imposé : c’est l’histoire qui détermine la manière de la raconter."
              : "No imposed format: the story determines how it should be told."}</p>
          </div>
          <div className="observations-v2-formats-grid">
            {formats.map((format) => (
              <article className="observations-v2-format" key={format.n}>
                <div className="observations-v2-format-top">
                  <span>{format.n} / {format.label}</span>
                  <span aria-hidden="true">{format.icon}</span>
                </div>
                <h3>{format.name}</h3>
                <p>{format.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {allEntries.length > 0 ? (
        <section className="observations-v2-published content-shell" id="carnet">
          <h2>{lang === "fr" ? "LE CARNET." : "THE JOURNAL."}</h2>
          <TopicFilters lang={lang} section="observations" entries={allEntries} active={active} observations />
          {entries.length ? (
            <div className="field-grid" role="region" aria-label={b.fieldNotes}>
              {entries.map((entry, index) => (
                <Reveal key={entry.slug} className={`field-note field-note-${index % 6} field-${entry.contentType} media-${entry.mediaAspect}`}>
                  <EditorialCard entry={entry} lang={lang} />
                </Reveal>
              ))}
            </div>
          ) : <div className="library-empty"><span className="empty-dash" aria-hidden="true" /><p>{b.noResults}</p></div>}
        </section>
      ) : (
        <section className="observations-v2-upcoming" id="carnet">
          <div className="content-shell">
            <div>
              <p className="eyebrow accent">{lang === "fr" ? "LE CARNET EST OUVERT" : "THE JOURNAL IS OPEN"}</p>
              <h2>{lang === "fr" ? "LES PROCHAINES OBSERVATIONS." : "UPCOMING OBSERVATIONS."}</h2>
              <p>{lang === "fr"
                ? "Les publications apparaîtront ici au fur et à mesure. Pas de fausse actualité, pas de remplissage : seulement des histoires et des idées à partager."
                : "Publications will appear here as they are released. No invented news, no filler: just stories and ideas worth sharing."}</p>
            </div>
            <a className="observations-v2-cta" href="#formats">
              {lang === "fr" ? "DÉCOUVRIR LES FORMATS" : "EXPLORE THE FORMATS"}
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      )}
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
  if (section === "sport-culture") return <SportCultureEditorial lang={lang} entries={entries} allEntries={allEntries} active={active} />;
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

export function SportCultureEditorial({
  lang, entries, allEntries, active,
}: {
  lang: Locale; entries: Entry[]; allEntries: Entry[]; active?: string;
}) {
  const fr = lang === "fr";
  const themes = fr ? [
    { number: "01", title: "SPORT & IDENTITÉ", body: "Ce qui nous rassemble, nous distingue et nous définit." },
    { number: "02", title: "SPORT & MÉDIAS", body: "Les récits que l’on construit autour des athlètes et des événements." },
    { number: "03", title: "SPORT & ÉDUCATION", body: "Les valeurs et les occasions que nous transmettons aux jeunes." },
    { number: "04", title: "CULTURE POPULAIRE", body: "L’influence du sport sur la musique, les traditions et nos vies." },
  ] : [
    { number: "01", title: "SPORT & IDENTITY", body: "What brings us together, sets us apart and defines us." },
    { number: "02", title: "SPORT & MEDIA", body: "The stories we tell around athletes and events." },
    { number: "03", title: "SPORT & EDUCATION", body: "The values and opportunities we pass on to young people." },
    { number: "04", title: "POPULAR CULTURE", body: "How sport shapes music, traditions and everyday life." },
  ];
  return <div className="sport-culture-editorial">
    <header className="sport-culture-hero">
      <div className="sport-culture-shell">
        <p className="eyebrow accent">SPORT / CULTURE / {fr ? "SOCIÉTÉ" : "SOCIETY"}</p>
        <div className="sport-culture-hero-grid">
          <h1><span>{fr ? "BIEN PLUS" : "MORE THAN"}</span><span>{fr ? "QU’UN JEU." : "A GAME."}</span></h1>
          <div className="sport-culture-hero-intro">
            <h2>{fr ? "Ce que le sport raconte de nous." : "What sport reveals about us."}</h2>
            <p>{fr
              ? "Le sport ne se limite pas aux résultats. Il raconte nos cultures, nos identités, nos ambitions et nos contradictions."
              : "Sport is more than results. It reflects our cultures, our identities, our ambitions and our contradictions."}</p>
          </div>
        </div>
        <div className="sport-culture-principles" aria-label={fr ? "Trois perspectives" : "Three perspectives"}>
          {(fr ? ["IDENTITÉ", "CULTURE", "SOCIÉTÉ"] : ["IDENTITY", "CULTURE", "SOCIETY"]).map((label,index)=>
            <div key={label}><span>0{index+1}</span><strong>{label}</strong></div>
          )}
        </div>
      </div>
    </header>
    <section className="sport-culture-archive" aria-labelledby="sport-culture-archive-title">
      <div className="sport-culture-shell">
        <div className="sport-culture-section-heading">
          <div><p className="eyebrow">{fr ? "ARCHIVES PERSONNELLES" : "PERSONAL ARCHIVES"}</p>
            <h2 id="sport-culture-archive-title">{fr ? "DU TERRAIN À LA CULTURE." : "FROM THE COURT TO CULTURE."}</h2></div>
          <p>{fr
            ? "Mon parcours sur le terrain nourrit mon regard sur les liens entre le sport, la culture et notre société."
            : "My experience on the court shapes how I see the connections between sport, culture and society."}</p>
        </div>
        <div className="sport-culture-archive-grid">
          <div className="sport-culture-archive-primary">
            <ArchivePhoto photo="07_archive_rouge_et_or" lang={lang} caption={fr ? "Archives personnelles · Rouge et Or · Photographie et signature originales" : "Personal archives · Rouge et Or · Original photo and signature"} />
          </div>
          <div className="sport-culture-archive-secondary">
            <ArchivePhoto photo="01_basket_action_archive" lang={lang} caption={fr ? "Archives personnelles · Photographie d’action originale" : "Personal archives · Original action photograph"} />
            <blockquote>{fr
              ? "Le terrain a été mon premier observatoire de la société."
              : "The court was my first window into society."}</blockquote>
            <p>{fr
              ? "Deux images de mon parcours. Un point de départ pour explorer ce que le sport signifie au-delà du jeu."
              : "Two images from my journey. A starting point to explore what sport means beyond the game."}</p>
          </div>
        </div>
      </div>
    </section>
    <section className="sport-culture-themes" aria-labelledby="sport-culture-themes-title">
      <div className="sport-culture-shell">
        <p className="eyebrow accent">{fr ? "LES QUESTIONS QUI NOUS TRAVERSENT" : "THE QUESTIONS THAT SHAPE US"}</p>
        <h2 id="sport-culture-themes-title">{fr ? "CE QUE LE SPORT RACONTE DE NOUS." : "WHAT SPORT SAYS ABOUT US."}</h2>
        <div className="sport-culture-theme-grid">
          {themes.map(theme=><div className="sport-culture-theme" key={theme.number}>
            <span>{theme.number}</span><h3>{theme.title}</h3><p>{theme.body}</p>
          </div>)}
        </div>
      </div>
    </section>
    <section className="sport-culture-publications" id="publications" aria-labelledby="sport-culture-publications-title">
      <div className="sport-culture-shell">
        <h2 id="sport-culture-publications-title">{fr ? "LES PUBLICATIONS." : "PUBLICATIONS."}</h2>
        {allEntries.length ? <>
          <TopicFilters lang={lang} section="sport-culture" entries={allEntries} active={active} />
          {entries.length ? <div className="subject-grid">
            {entries.map(e=><Reveal key={e.slug}><EditorialCard entry={e} lang={lang}/></Reveal>)}
          </div> : <p className="sport-culture-upcoming">{brand(lang).noResults}</p>}
        </> : <p className="sport-culture-upcoming">{fr
          ? "De nouvelles publications viendront prolonger ces thèmes. Les photographies présentées ci-dessus sont des archives, pas des articles déjà publiés."
          : "New stories will explore these themes. The photographs above are archives, not published articles."}</p>}
      </div>
    </section>
  </div>;
}
