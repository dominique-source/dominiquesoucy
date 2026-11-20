import Link from "next/link";
import Image from "next/image";
import { dict, type Locale, type Section } from "@/lib/i18n";
import { brand } from "@/lib/brand-copy";
import { type Entry, entryPath } from "@/lib/content";
import { AbstractVisual, SignatureQuote } from "./editorial";
import { Reveal } from "./reveal";
export function EditorialEntryPoints({
  lang,
  entries,
}: {
  lang: Locale;
  entries: Entry[];
}) {
  const d = dict(lang);
  const b = brand(lang);
  const tiles: {
    section: Section;
    label: string;
    entry?: Entry;
    description: string;
  }[] = [
    {
      section: "reflexions",
      label: d.latest,
      entry: entries.find((e) => e.contentType === "reflection"),
      description: b.latestEmpty,
    },
    {
      section: "observations",
      label: d.nav.observations,
      entry: entries.find((e) => e.contentType !== "reflection"),
      description: d.descriptions.observations,
    },
    {
      section: "sport-culture",
      label: d.nav["sport-culture"],
      entry: entries.find((e) => e.category === "sport"),
      description: b.subjectSport,
    },
    {
      section: "societe",
      label: d.nav.societe,
      entry: entries.find((e) => e.category === "societe"),
      description: b.subjectSociety,
    },
  ];
  return (
    <nav className="entry-points" aria-label={b.mobileNav}>
      {tiles.map((tile, i) => (
        <Reveal key={tile.section}>
          <Link
            className={`entry-tile entry-tile-${i}`}
            href={
              tile.entry ? entryPath(tile.entry) : `/${lang}/${tile.section}`
            }
          >
            <div className="entry-tile-art" aria-hidden="true">
              {tile.entry?.coverImage ? (
                <Image
                  src={tile.entry.coverImage}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 100vw, 25vw"
                />
              ) : (
                <AbstractVisual
                  kind={i === 1 ? "type" : i === 2 ? "lines" : "court"}
                />
              )}
            </div>
            <span className="eyebrow entry-label">{tile.label}</span>
            <span className="tile-rule" aria-hidden="true" />
            <h2>{tile.entry?.title ?? tile.description}</h2>
            <span className="entry-description">
              {tile.entry?.description ?? b.availableSoon}
            </span>
            <span className="entry-open">
              {b.exploreSection}
              <span aria-hidden="true">+</span>
            </span>
          </Link>
        </Reveal>
      ))}
    </nav>
  );
}
export function HomeSignature({ lang }: { lang: Locale }) {
  const d = dict(lang);
  const b = brand(lang);
  return (
    <section className="home-perspective">
      <SignatureQuote lang={lang} full />
      <div className="home-bio">
        <p className="eyebrow">{d.nav["a-propos"]}</p>
        <h2>{b.homePerson}</h2>
        <p>{d.bio}</p>
        <Link className="text-link" href={`/${lang}/a-propos`}>
          {d.discover}
        </Link>
      </div>
    </section>
  );
}
