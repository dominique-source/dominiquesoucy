import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { dict, type Locale, type Section } from "@/lib/i18n";
import { entryPath, type Entry } from "@/lib/content";
import { signature } from "@/lib/config";
import { VideoPlayer } from "./video-player";
import { Reveal } from "./reveal";
export function AbstractVisual({
  kind = "court",
  className = "",
}: {
  kind?: "court" | "type" | "lines";
  className?: string;
}) {
  return (
    <div className={`abstract-visual ${kind} ${className}`} aria-hidden="true">
      <div className="court-circle" />
      <div className="court-line" />
      <span className="visual-type">{kind === "type" ? "DS" : ""}</span>
      <span className="visual-caption">DOMINIQUE SOUCY / POINT DE VUE</span>
    </div>
  );
}
export function EmptyState({
  lang,
  compact = false,
}: {
  lang: Locale;
  compact?: boolean;
}) {
  const d = dict(lang);
  return (
    <div className={`empty-state ${compact ? "compact" : ""}`}>
      <span className="empty-mark" aria-hidden="true">
        [&nbsp;]
      </span>
      <div>
        <h3>{d.soon}</h3>
        <p>{d.empty}</p>
      </div>
    </div>
  );
}
export function EditorialCard({ entry, lang }: { entry: Entry; lang: Locale }) {
  const d = dict(lang);
  return (
    <article className="editorial-card">
      <Link
        href={entryPath(entry)}
        className="card-image"
        tabIndex={-1}
        aria-hidden="true"
      >
        {entry.coverImage ? (
          <Image
            src={entry.coverImage}
            alt=""
            fill
            sizes="(max-width: 700px) 100vw, 45vw"
          />
        ) : (
          <AbstractVisual
            kind={entry.contentType === "thought" ? "type" : "court"}
          />
        )}
        <span className="media-tag">
          {entry.videoUrl
            ? d.video
            : entry.contentType === "thought"
              ? d.thought
              : d.text}
          {entry.duration ? ` / ${entry.duration}` : ""}
        </span>
      </Link>
      <div className="card-meta">
        <span>{d.categories[entry.category]}</span>
        <time dateTime={entry.publicationDate}>
          {new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", {
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          }).format(new Date(entry.publicationDate))}
        </time>
      </div>
      {entry.signature && (
        <span className="series-label">IMAGINE VOULOIR…</span>
      )}
      <h3>
        <Link href={entryPath(entry)}>{entry.title}</Link>
      </h3>
      <p>{entry.description}</p>
    </article>
  );
}
export function FeaturedReflection({
  entry,
  lang,
}: {
  entry?: Entry;
  lang: Locale;
}) {
  return entry ? (
    <div className="featured">
      <EditorialCard entry={entry} lang={lang} />
    </div>
  ) : (
    <div className="featured-empty">
      <AbstractVisual />
      <EmptyState lang={lang} />
    </div>
  );
}
export function ObservationGrid({
  entries,
  lang,
}: {
  entries: Entry[];
  lang: Locale;
}) {
  return entries.length ? (
    <div className="editorial-grid">
      {entries.map((e) => (
        <Reveal key={e.slug}>
          <EditorialCard entry={e} lang={lang} />
        </Reveal>
      ))}
    </div>
  ) : (
    <EmptyState lang={lang} compact />
  );
}
export function CategoryNavigation({
  lang,
  section,
  active,
}: {
  lang: Locale;
  section: Section;
  active?: string;
}) {
  const d = dict(lang);
  return (
    <nav className="category-nav" aria-label={d.allCategories}>
      <Link
        href={`/${lang}/${section}`}
        aria-current={!active ? "page" : undefined}
      >
        {d.allCategories}
      </Link>
      {Object.entries(d.categories).map(([key, label]) => (
        <Link
          key={key}
          href={`/${lang}/${section}?category=${key}`}
          aria-current={active === key ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
export function SignatureQuote({
  lang,
  full = false,
}: {
  lang: Locale;
  full?: boolean;
}) {
  const d = dict(lang);
  return (
    <aside className="signature-quote">
      <p className="eyebrow">{d.signature}</p>
      <p className="signature-title" lang="fr">
        IMAGINE
        <br />
        VOULOIR<span>…</span>
      </p>
      {full && <blockquote lang="fr">{signature}</blockquote>}
      {lang === "en" && <p className="small muted">{d.signatureUnavailable}</p>}
      <div className="signature-credit">DOMINIQUE SOUCY</div>
    </aside>
  );
}
export function ArticleLayout({ entry, lang }: { entry: Entry; lang: Locale }) {
  const d = dict(lang);
  return (
    <article className="article-layout">
      <Link
        className="text-link"
        href={`/${lang}/${entry.contentType === "reflection" ? "reflexions" : "observations"}`}
      >
        {d.back}
      </Link>
      <header>
        <p className="eyebrow accent">
          {d.categories[entry.category]} / {entry.videoUrl ? d.video : d.text}
        </p>
        <h1>{entry.title}</h1>
        <p className="article-deck">{entry.description}</p>
        <div className="card-meta">
          <span>Dominique Soucy</span>
          <time dateTime={entry.publicationDate}>
            {new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", {
              dateStyle: "long",
              timeZone: "UTC",
            }).format(new Date(entry.publicationDate))}
          </time>
          {entry.duration && <span>{entry.duration}</span>}
        </div>
      </header>
      {entry.videoUrl ? (
        <VideoPlayer
          url={entry.videoUrl}
          title={entry.title}
          lang={lang}
          captions={entry.captions}
        />
      ) : entry.coverImage ? (
        <div className="article-cover">
          <Image
            src={entry.coverImage}
            alt={entry.coverAlt!}
            fill
            sizes="(max-width: 1000px) 100vw, 1000px"
            priority
          />
        </div>
      ) : null}
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
      {entry.signature && <SignatureQuote lang={lang} full />}
      <ul className="tags" aria-label="Tags">
        {entry.tags.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </article>
  );
}
export function SocialGraphic({
  title,
  format = "landscape",
  series = false,
}: {
  title: string;
  format?: "portrait" | "vertical" | "landscape";
  series?: boolean;
}) {
  return (
    <div className={`social-graphic ${format}`}>
      <span>DOMINIQUE SOUCY</span>
      {series && <span className="series-label">IMAGINE VOULOIR…</span>}
      <strong>{title}</strong>
      <span>SPORT / SOCIÉTÉ / HUMAIN</span>
    </div>
  );
}
