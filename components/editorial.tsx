import Link from "next/link";
import { AdaptiveVideo } from "./adaptive-video";
import Image from "next/image";
import { dict, type Locale, type Section } from "@/lib/i18n";
import { entryPath, type Entry } from "@/lib/content";
import { signature } from "@/lib/config";
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
      {entry.videoUrl ? (
        <div className="card-video">
          <AdaptiveVideo
            videoUrl={entry.videoUrl}
            orientation={entry.orientation}
            poster={entry.poster ?? entry.coverImage}
            title={entry.title}
            captions={entry.captions}
            lang={lang}
            layout="card"
          />
        </div>
      ) : (
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
      )}
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
