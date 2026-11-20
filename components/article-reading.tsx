import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { dict, type Locale } from "@/lib/i18n";
import { brand } from "@/lib/brand-copy";
import { entryPath, type Entry } from "@/lib/content";
import { signature, site } from "@/lib/config";
import { AbstractVisual, EditorialCard } from "./editorial";
import { AdaptiveVideo } from "./adaptive-video";
import { EntryMeta } from "./editorial-templates";
import { ShareControls } from "./share-controls";
function ArticleBody({ entry }: { entry: Entry }) {
  return (
    <div className="prose">
      <ReactMarkdown
        components={{
          img: ({ src, alt }) =>
            typeof src === "string" &&
            src.startsWith("/assets/") &&
            !src.includes("..") ? (
              <Image src={src} alt={alt ?? ""} width={1000} height={667} />
            ) : null,
          a: ({ href, children }) => (
            <a
              href={href}
              rel={
                href?.startsWith("https:") ? "noopener noreferrer" : undefined
              }
            >
              {children}
            </a>
          ),
        }}
      >
        {entry.body}
      </ReactMarkdown>
    </div>
  );
}
function ArticleMedia({
  entry,
  lang,
  signatureCover = false,
}: {
  entry: Entry;
  lang: Locale;
  signatureCover?: boolean;
}) {
  if (entry.videoUrl && !signatureCover)
    return (
      <AdaptiveVideo
        videoUrl={entry.videoUrl}
        orientation={entry.orientation}
        poster={entry.poster ?? entry.coverImage}
        layout="article"
        title={entry.title}
        lang={lang}
        captions={entry.captions}
      />
    );
  if (entry.coverImage)
    return (
      <div className="article-cover">
        <Image
          src={entry.coverImage}
          alt={entry.coverAlt!}
          fill
          sizes="(max-width: 850px) 100vw, 65vw"
          priority
        />
      </div>
    );
  return signatureCover ? (
    <div className="signature-cover-placeholder">
      <AbstractVisual kind="lines" />
      <span>{brand(lang).photoContext}</span>
    </div>
  ) : null;
}
function RelatedStories({
  entries,
  lang,
  series = false,
}: {
  entries: Entry[];
  lang: Locale;
  series?: boolean;
}) {
  const b = brand(lang);
  return (
    <aside className="related-stories">
      <h2>{series ? b.relatedSeries : b.related}</h2>
      {entries.length ? (
        <div className="related-grid">
          {entries.map((entry) => (
            <EditorialCard key={entry.slug} entry={entry} lang={lang} />
          ))}
        </div>
      ) : (
        <p className="related-empty">{b.relatedEmpty}</p>
      )}
    </aside>
  );
}
export function ArticleLayout({
  entry,
  lang,
  related = [],
}: {
  entry: Entry;
  lang: Locale;
  related?: Entry[];
}) {
  const d = dict(lang);
  const b = brand(lang);
  const path = entryPath(entry);
  const back = `/${lang}/${entry.contentType === "reflection" ? "reflexions" : "observations"}`;
  if (entry.signature)
    return (
      <article className="signature-article">
        <header className="signature-masthead">
          <div>
            <p className="eyebrow">{b.signatureLabel}</p>
            <p className="signature-lockup" lang="fr">
              IMAGINE
              <br />
              VOULOIR<span>…</span>
            </p>
            <span className="signature-swipe" aria-hidden="true" />
            <blockquote lang="fr">{signature}</blockquote>
            {lang === "en" && (
              <p className="small muted">{d.signatureUnavailable}</p>
            )}
          </div>
          <ArticleMedia entry={entry} lang={lang} signatureCover />
        </header>
        <div className="signature-reading-grid">
          <div>
            <Link href={back} className="text-link">
              {d.back}
            </Link>
            <EntryMeta entry={entry} lang={lang} />
            <h1>{entry.title}</h1>
            <p className="article-deck">{entry.description}</p>
            <p className="article-byline">Dominique Soucy</p>
            {entry.videoUrl && <ArticleMedia entry={entry} lang={lang} />}
            <section id="texte" className="article-text">
              <h2 className="sr-only">{b.reading}</h2>
              <ArticleBody entry={entry} />
            </section>
            <ShareControls
              title={entry.title}
              url={site.url + path}
              lang={lang}
            />
            <ul className="tags" aria-label="Tags">
              {entry.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </div>
          <RelatedStories entries={related} lang={lang} series />
        </div>
      </article>
    );
  return (
    <article
      className={`article-reading ${entry.videoUrl ? "article-video" : ""}`}
    >
      <Link className="text-link" href={back}>
        {d.back}
      </Link>
      <div
        className={`article-media-stage ${entry.videoUrl ? `video-orientation-${entry.orientation}` : ""}`}
      >
        <header>
          <EntryMeta entry={entry} lang={lang} />
          <h1>{entry.title}</h1>
          <p className="article-deck">{entry.description}</p>
          <p className="article-byline">Dominique Soucy</p>
        </header>
        <ArticleMedia entry={entry} lang={lang} />
      </div>
      <div className="reading-columns">
        <aside className="reading-margin">
          <p className="eyebrow accent">{d.categories[entry.category]}</p>
          <ShareControls
            title={entry.title}
            url={site.url + path}
            lang={lang}
          />
        </aside>
        <section id="texte">
          <h2 className="sr-only">{b.reading}</h2>
          <ArticleBody entry={entry} />
          <ul className="tags" aria-label="Tags">
            {entry.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        </section>
      </div>
      {related.length > 0 && <RelatedStories entries={related} lang={lang} />}
    </article>
  );
}
