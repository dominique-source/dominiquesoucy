"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import "./impact-section.css";

const clip = "https://www.youtube.com/shorts/zJZ3l7RKwms";
const originalStatement = [
  "La ville a été mise au fait de la situation par Facebook.",
  "Aucun âge minimal n’est désormais exigé pour le patinage libre, dans la mesure où l’enfant est autonome et respecte les règles de sécurité.",
];

const copy = {
  fr: {
    kicker: "Au-delà des mots",
    title: "De la parole à l’action",
    lead: "On a soulevé un problème. La Ville a changé ses pratiques.",
    intro:
      "Cette photo a circulé avec la dénonciation du refus d’accès au patinage libre pour des jeunes à Québec. La Ville a appris la situation sur Facebook et a ajusté ses consignes.",
    file: "Dossier",
    caseTitle: "Le droit de jouer",
    date: "26 novembre 2026",
    city: "Ville de Québec",
    blurb:
      "Une problématique dénoncée. Une mobilisation citoyenne. Des pratiques municipales ajustées.",
    watch: "Voir l’extrait vidéo",
    read: "Voir la déclaration",
    close: "Fermer",
    role: "Conseillère municipale, Ville de Québec",
    source: "Extraits de la déclaration publiée sur Facebook",
    context:
      "Les nouvelles consignes ont été communiquées aux équipes des deux patinoires réfrigérées couvertes.",
    steps: [
      [
        "La dénonciation",
        "Dominique Soucy rapporte que des jeunes se sont vu refuser l’accès au patinage libre.",
      ],
      [
        "La mobilisation",
        "La Ville de Québec apprend la situation par Facebook.",
      ],
      [
        "Le changement",
        "Pour le patinage libre, l’autonomie de l’enfant et le respect des règles de sécurité guident désormais l’accès.",
      ],
    ],
    archive: "Nos dossiers d’impact",
    filters: ["Tous", "Municipal", "Provincial", "Fédéral"],
    upcoming: "À venir",
    topics: [
      "Patinoires – Ville de Québec",
      "Parcs et espaces publics",
      "Accès au sport scolaire",
      "Infrastructures sportives",
    ],
    previous: "Dossiers précédents",
    next: "Dossiers suivants",
    photoAlt:
      "Dominique Soucy à la patinoire, avec des jeunes qui patinent derrière lui.",
    note: "Photo de la publication originale",
  },
  en: {
    kicker: "Beyond words",
    title: "From words to action",
    lead: "We spoke up. The City changed its practices.",
    intro:
      "This photo circulated as people spoke out about young skaters being turned away in Québec City. The City learned about the issue on Facebook and updated its instructions.",
    file: "Case",
    caseTitle: "The right to play",
    date: "November 26, 2026",
    city: "Québec City",
    blurb:
      "A concern raised. A community mobilized. Municipal practices updated.",
    watch: "Watch the video excerpt",
    read: "Read the statement",
    close: "Close",
    role: "City councillor, Québec City",
    source: "Excerpts from the statement posted on Facebook (French original)",
    context:
      "The updated instructions were shared with staff at the two covered refrigerated rinks.",
    steps: [
      [
        "Speaking up",
        "Dominique Soucy reports that young people were turned away from a public skating session.",
      ],
      [
        "Community response",
        "Québec City learns about the situation through Facebook.",
      ],
      [
        "The change",
        "Children can attend public skating if they can skate independently and follow the safety rules.",
      ],
    ],
    archive: "Our impact cases",
    filters: ["All", "Municipal", "Provincial", "Federal"],
    upcoming: "Coming soon",
    topics: [
      "Ice rinks – Québec City",
      "Parks and public spaces",
      "Access to school sports",
      "Sports facilities",
    ],
    previous: "Previous cases",
    next: "Next cases",
    photoAlt: "Dominique Soucy at the rink with young skaters behind him.",
    note: "Photo from the original post",
  },
};

const translation =
  "There is no longer a minimum age for public skating, provided the child can skate independently and follows the safety rules.";
const cases = [
  { id: "001", category: 1, published: true },
  { id: "002", category: 1, published: false },
  { id: "003", category: 2, published: false },
  { id: "004", category: 3, published: false },
];

export function ImpactSection({ lang }: { lang: Locale }) {
  const t = copy[lang];
  const declaration = useRef<HTMLDialogElement>(null);
  const rail = useRef<HTMLUListElement>(null);
  const [filter, setFilter] = useState(0);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const visible = cases.filter(
    (item) => filter === 0 || item.category === filter,
  );

  const syncRail = useCallback(() => {
    const track = rail.current;
    if (!track || !track.clientWidth) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const count = 1 + Math.ceil(Math.max(0, maxScroll - 1) / track.clientWidth);
    setPages(count);
    setPage(
      track.scrollLeft >= maxScroll - 1
        ? count - 1
        : Math.round(track.scrollLeft / track.clientWidth),
    );
  }, []);

  const attachRail = useCallback(
    (track: HTMLUListElement | null) => {
      rail.current = track;
      if (!track) return;
      const observer = new ResizeObserver(syncRail);
      observer.observe(track);
      return () => observer.disconnect();
    },
    [syncRail],
  );

  function moveTo(index: number) {
    const track = rail.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth });
  }

  return (
    <section id="impact" className="impact" aria-labelledby="impact-title">
      <header className="impact-banner">
        <div className="impact-banner-copy">
          <p className="impact-kicker">{t.kicker}</p>
          <h2 id="impact-title">{t.title}</h2>
          <p>
            <strong>{t.lead}</strong>
          </p>
          <p>{t.intro}</p>
        </div>
        <figure className="impact-photo">
          <Image
            src="/assets/impact/dominique-patinoire.webp"
            alt={t.photoAlt}
            fill
            sizes="(max-width: 760px) 100vw, 52vw"
          />
          <a className="impact-play" href={clip} aria-label={t.watch}>
            <span className="impact-triangle" aria-hidden="true" />
          </a>
          <figcaption className="impact-image-note">{t.note}</figcaption>
        </figure>
      </header>

      <article
        id="impact-001"
        className="impact-case"
        aria-labelledby="impact-case-title"
      >
        <div>
          <p className="impact-badge">{t.file} 001</p>
          <h3 id="impact-case-title">{t.caseTitle}</h3>
          <p className="impact-meta">
            <time dateTime="2026-11-26">{t.date}</time> · {t.city}
          </p>
          <p>{t.blurb}</p>
          <div className="impact-actions">
            <a className="impact-button impact-primary" href={clip}>
              <span className="impact-triangle" aria-hidden="true" /> {t.watch}
            </a>
            <button
              className="impact-button"
              type="button"
              onClick={() => declaration.current?.showModal()}
            >
              {t.read}
            </button>
          </div>
        </div>
        <div>
          <ol className="impact-steps">
            {t.steps.map(([title, description], index) => (
              <li key={title}>
                <span className="impact-step-mark" aria-hidden="true">
                  {index === 0 ? (
                    <span className="impact-triangle" />
                  ) : (
                    ["◎", "✓"][index - 1]
                  )}
                </span>
                <h4>{title}</h4>
                <p>{description}</p>
              </li>
            ))}
          </ol>
          <figure className="impact-quote">
            <blockquote>
              “{lang === "fr" ? originalStatement[1] : translation}”
            </blockquote>
            <figcaption>
              <strong>Elainie Lepage</strong> · {t.role}
            </figcaption>
          </figure>
        </div>
      </article>

      <div className="impact-archive">
        <header>
          <h3>{t.archive}</h3>
          <div className="impact-filters">
            {t.filters.map((label, index) => (
              <button
                key={label}
                type="button"
                aria-pressed={filter === index}
                onClick={() => {
                  moveTo(0);
                  setFilter(index);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </header>
        <ul
          key={filter}
          className="impact-rail"
          ref={attachRail}
          onScroll={syncRail}
        >
          {visible.map((item) => (
            <li
              key={item.id}
              className={item.published ? "impact-published" : ""}
            >
              {item.published ? (
                <a href="#impact-001">
                  <span>{item.id}</span>
                  <strong>{t.caseTitle}</strong>
                  <small>{t.topics[cases.indexOf(item)]}</small>
                </a>
              ) : (
                <div>
                  <span>{item.id}</span>
                  <strong>{t.upcoming}</strong>
                  <small>{t.topics[cases.indexOf(item)]}</small>
                </div>
              )}
            </li>
          ))}
        </ul>
        {pages > 1 && (
          <div className="impact-pagination">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => moveTo(page - 1)}
              aria-label={t.previous}
            >
              ‹
            </button>
            <span aria-live="polite">
              {page + 1} / {pages}
            </span>
            <button
              type="button"
              disabled={page === pages - 1}
              onClick={() => moveTo(page + 1)}
              aria-label={t.next}
            >
              ›
            </button>
          </div>
        )}
      </div>

      <dialog
        ref={declaration}
        className="impact-dialog"
        aria-labelledby="impact-declaration-title"
      >
        <form method="dialog">
          <button type="submit" className="impact-button">
            {t.close} <span aria-hidden="true">×</span>
          </button>
        </form>
        <h3 id="impact-declaration-title">{t.read}</h3>
        <p>
          <strong>Elainie Lepage</strong> · {t.role}
        </p>
        <p className="impact-meta">{t.source}</p>
        <blockquote lang="fr">
          {originalStatement.map((line) => (
            <p key={line}>« {line} »</p>
          ))}
        </blockquote>
        {lang === "en" && <p>{translation}</p>}
        <p>{t.context}</p>
      </dialog>
    </section>
  );
}
