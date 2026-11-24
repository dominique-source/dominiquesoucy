"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { dict } from "@/lib/i18n";
import styles from "./about-immersive.module.css";

const ids = ["etre", "sport", "societe", "creation", "transmission"] as const;
type Universe = (typeof ids)[number];
type Stage = 0 | 1 | 2 | 3 | 4;
const copy = {
  fr: {
    intro: ["Une empreinte.", "Un individu.", "Des milliards d'univers.", "Un monde en commun."],
    lead: "Je suis un univers parmi des milliards d'autres.",
    sub: "Voici celui à travers lequel je perçois le monde.",
    next: "Suivant", prev: "Précédent", skip: "Passer l'introduction", replay: "Revoir l'introduction",
    discover: "Explorer les cinq univers", back: "Retour à la main", home: "Dominique Soucy",
    unavailable: "À venir", note: "Une exploration en construction. Les contenus et les images seront enrichis au fil du temps.",
    explore: "Explorer les réflexions", names: ["L'Être", "Le Sport", "La Société", "La Création", "La Transmission"],
    questions: ["Qui suis-je ?", "Pourquoi jouons-nous ?", "Comment vivons-nous ensemble ?", "Que puis-je faire exister ?", "Que vais-je laisser ?"],
    descriptions: [
      "Identité, conscience et regard intérieur.",
      "Le sport comme laboratoire des comportements humains.",
      "Les valeurs collectives, les institutions et notre manière de vivre ensemble.",
      "L'art, les idées, l'entrepreneuriat et ce qui prend forme.",
      "Les relations, les générations et ce que nous transmettons."
    ],
    open: "Entrer dans cet univers", sections: ["Regards", "Images et vidéos", "Notes et réflexions"]
  },
  en: {
    intro: ["A fingerprint.", "One individual.", "Billions of universes.", "One shared world."],
    lead: "I am one universe among billions of others.",
    sub: "This is the one through which I see the world.",
    next: "Next", prev: "Previous", skip: "Skip introduction", replay: "Replay introduction",
    discover: "Explore the five universes", back: "Back to the hand", home: "Dominique Soucy",
    unavailable: "Coming soon", note: "An evolving exploration. More stories and visuals will follow.",
    explore: "Explore reflections", names: ["The Self", "Sport", "Society", "Creation", "Legacy"],
    questions: ["Who am I?", "Why do we play?", "How do we live together?", "What can I bring into being?", "What will I leave behind?"],
    descriptions: [
      "Identity, consciousness and the inner perspective.",
      "Sport as a laboratory for human behaviour.",
      "Collective values, institutions and the ways we live together.",
      "Art, ideas, entrepreneurship and bringing things into existence.",
      "Relationships, generations and what we pass on."
    ],
    open: "Enter this universe", sections: ["Perspectives", "Images and video", "Notes and reflections"]
  }
} as const;

function urlFor(id: Universe | null) {
  return id ? "?univers=" + id : window.location.pathname;
}
function readUniverse(): Universe | null {
  const id = new URLSearchParams(window.location.search).get("univers");
  return ids.find(item => item === id) ?? null;
}
export function AboutImmersive({ lang }: { lang: Locale }) {
  const t = copy[lang], d = dict(lang);
  const [stage, setStage] = useState<Stage>(0);
  const [intro, setIntro] = useState(true);
  const [selected, setSelected] = useState<Universe | null>(null);
  const [active, setActive] = useState<Universe | null>(null);
  const [ready, setReady] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const syncUrl = useCallback(() => {
    const id = readUniverse();
    setSelected(id);
    if (id) setIntro(false);
  }, []);
  useEffect(() => {
    syncUrl();
    setIntro(!readUniverse() && !sessionStorage.getItem("ds-human-universe-intro-seen"));
    setReady(true);
    window.addEventListener("popstate", syncUrl);
    return () => window.removeEventListener("popstate", syncUrl);
  }, [syncUrl]);
  useEffect(() => {
    if (!ready) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selected) closeUniverse();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, ready]);
  useEffect(() => {
    if (selected) backRef.current?.focus();
  }, [selected]);
  const finishIntro = () => {
    sessionStorage.setItem("ds-human-universe-intro-seen", "1");
    setIntro(false);
    setStage(4);
  };
  const openUniverse = (id: Universe) => {
    window.history.pushState(null, "", urlFor(id));
    setSelected(id);
  };
  const closeUniverse = () => {
    const old = selected;
    window.history.pushState(null, "", window.location.pathname);
    setSelected(null);
    if (old) requestAnimationFrame(() => triggerRefs.current[old]?.focus());
  };
  const index = selected ? ids.indexOf(selected) : -1;
  return (
    <div className={styles.root}>
      {intro && !selected ? (
        <section className={styles.intro} aria-label={lang === "fr" ? "Introduction immersive" : "Immersive introduction"}>
          <div className={styles.ambient} data-stage={stage} aria-hidden="true">
            <div className={styles.ridges} /><div className={styles.orbit} /><div className={styles.globe} />
          </div>
          <div className={styles.introContent} key={stage}>
            <p className={styles.eyebrow}>DS. / THE HUMAN UNIVERSE — 0{stage + 1}</p>
            <h1>{stage === 4 ? (lang === "fr" ? "Mon univers" : "My universe") : t.intro[stage]}</h1>
            <p>{stage === 4 ? t.sub : "DOMINIQUE SOUCY"}</p>
          </div>
          <nav className={styles.introControls} aria-label={lang === "fr" ? "Contrôles de l'introduction" : "Introduction controls"}>
            <button onClick={() => setStage(s => Math.max(0, s - 1) as Stage)} disabled={stage === 0}>{t.prev}</button>
            <span aria-live="polite">{stage + 1} / 5</span>
            <button onClick={() => stage === 4 ? finishIntro() : setStage(s => Math.min(4, s + 1) as Stage)}>{stage === 4 ? t.discover : t.next}</button>
            <button className={styles.skip} onClick={finishIntro}>{t.skip}</button>
          </nav>
        </section>
      ) : selected ? (
        <section className={styles.universe} data-universe={selected} aria-labelledby="universe-title">
          <div className={styles.universeTop}>
            <button ref={backRef} onClick={closeUniverse} className={styles.back}>← {t.back}</button>
            <span>DS. / {String(index + 1).padStart(2, "0")} — 05</span>
          </div>
          <div className={styles.universeHero}>
            <div className={styles.worldMark} aria-hidden="true"><span /></div>
            <div className={styles.universeCopy}>
              <p className={styles.eyebrow}>THE HUMAN UNIVERSE / 0{index + 1}</p>
              <h1 id="universe-title">{t.names[index]}</h1>
              <h2>{t.questions[index]}</h2>
              <p>{t.descriptions[index]}</p>
            </div>
          </div>
          <div className={styles.editorial}>
            {t.sections.map((section, i) => <article key={section}>
              <span className={styles.eyebrow}>0{i + 1} / {section}</span>
              <h3>{section}</h3>
              {i === 0 ? <p>{t.descriptions[index]}</p> : <p>{t.unavailable}</p>}
              {i === 0 && (selected === "sport" || selected === "societe") ? <Link href={`/${lang}/${selected === "sport" ? "sport-culture" : "societe"}`}>{t.explore} ↗</Link> : null}
            </article>)}
          </div>
          <p className={styles.note}>{t.note}</p>
        </section>
      ) : (
        <section className={styles.hub} aria-labelledby="hub-title">
          <div className={styles.hubHeading}>
            <p className={styles.eyebrow}>DS. / THE HUMAN UNIVERSE</p>
            <h1 id="hub-title">{lang === "fr" ? "Mon univers" : "My universe"}</h1>
            <p>{t.sub}</p>
            <p className={styles.bio}>{d.bio}</p>
          </div>
          <div className={styles.handScene}>
            <div className={styles.handShape} aria-hidden="true">
              <span className={styles.palm} /><span className={styles.finger} /><span className={styles.finger} /><span className={styles.finger} /><span className={styles.finger} /><span className={styles.finger} />
            </div>
            <div className={styles.hotspots} role="group" aria-label={t.discover}>
              {ids.map((id, i) => <button key={id} ref={el => { triggerRefs.current[id] = el; }}
                className={styles.hotspot} data-active={active === id}
                onMouseEnter={() => setActive(id)} onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(id)} onBlur={() => setActive(null)}
                onClick={() => openUniverse(id)}>
                <span className={styles.hotspotNumber}>0{i + 1}</span>
                <strong>{t.names[i]}</strong><small>{t.questions[i]}</small>
              </button>)}
            </div>
          </div>
          <button className={styles.replay} onClick={() => { setStage(0); setIntro(true); }}>{t.replay} ↺</button>
        </section>
      )}
    </div>
  );
}
