"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Curated, Category, Question, Show } from "@/lib/questions/schema";
import { QuestionMedia, questionRequest, errorMessage } from "./shared";
type Selected = Question & { reuse_consent: number; hidden: number };
type Data = {
  questions: Curated[];
  categories: Category[];
  selected: Selected[];
  show: Show;
  settings: Record<string, string>;
  hasMore: boolean;
};
function Presentation({
  questions,
  title,
  fr,
  onClose,
}: {
  questions: Selected[];
  title: string;
  fr: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [controls, setControls] = useState(true);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  const q = questions[Math.min(index, questions.length - 1)];
  return (
    <dialog
      ref={ref}
      className="q-presentation ds-questions"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={fr ? "Mode présentation privé" : "Private presentation mode"}
    >
      <div className="q-presentation-stage">
        <p className="q-eyebrow">DOMINIQUE SOUCY / {title}</p>
        {q ? (
          <>
            <span className="q-presentation-count">
              {index + 1} / {questions.length}
            </span>
            <h1>{q.title}</h1>
            {q.context && <p>{q.context}</p>}
            <strong>
              {q.reuse_consent
                ? q.author ||
                  (fr ? "Une voix de la communauté" : "A community voice")
                : fr
                  ? "Question de la communauté"
                  : "Community question"}
            </strong>
            {q.format !== "text" &&
              (q.reuse_consent ? (
                <QuestionMedia question={q} privateView />
              ) : (
                <p className="q-notice">
                  {fr
                    ? "Pas d’autorisation de réutilisation de la voix ou de l’image. Média non présenté."
                    : "No permission to reuse voice or image. Media is not presented."}
                </p>
              ))}
          </>
        ) : (
          <h1>
            {fr ? "Aucune question sélectionnée." : "No selected questions."}
          </h1>
        )}
      </div>
      <div
        className={`q-presentation-controls ${controls ? "" : "q-controls-hidden"}`}
      >
        <button
          onClick={() => setIndex((v) => Math.max(0, v - 1))}
          disabled={index === 0}
        >
          ← {fr ? "Précédente" : "Previous"}
        </button>
        <button
          onClick={() => setIndex((v) => Math.min(questions.length - 1, v + 1))}
          disabled={index >= questions.length - 1}
        >
          {fr ? "Suivante" : "Next"} →
        </button>
        <button onClick={onClose}>
          {fr ? "Quitter la présentation" : "Exit presentation"}
        </button>
      </div>
      <button
        className="q-presentation-toggle"
        onClick={() => setControls((v) => !v)}
      >
        {controls
          ? fr
            ? "Masquer les commandes"
            : "Hide controls"
          : fr
            ? "Afficher les commandes"
            : "Show controls"}
      </button>
    </dialog>
  );
}
export function PrivateQuestionConsole({ lang }: { lang: "fr" | "en" }) {
  const fr = lang === "fr";
  const [data, setData] = useState<Data | null>(null);
  const [catalog, setCatalog] = useState<Record<string, Selected>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("");
  const [sort, setSort] = useState("recent");
  const [date, setDate] = useState("");
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("");
  const [presenting, setPresenting] = useState(false);
  const dirty = useRef(false);
  const query = new URLSearchParams({
    q: search,
    topic,
    sort,
    date,
    offset: String(offset),
  }).toString();
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        const r = await fetch(`/api/questions/admin?${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const next = await r.json();
        if (!r.ok) throw new Error(next.error);
        if (active) {
          setData(next);
          setCatalog((v) => ({
            ...v,
            ...Object.fromEntries(
              [...next.questions, ...next.selected].map((q: Selected) => [
                q.id,
                q,
              ]),
            ),
          }));
          if (!dirty.current) {
            setTitle(next.show.title);
            setItems(next.show.items);
            setRevision(next.show.revision);
          }
          setError("");
        }
      } catch (e) {
        if (active && !(e instanceof Error && e.name === "AbortError"))
          setError(
            errorMessage(e instanceof Error ? e.message : "UNAVAILABLE", fr),
          );
      }
    }
    const debounce = setTimeout(() => void load(), 200);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 8000);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(debounce);
      clearInterval(interval);
    };
  }, [query, refresh, fr]);
  async function change(body: unknown) {
    setBusy(true);
    setError("");
    try {
      await questionRequest("admin", body);
      setRefresh((v) => v + 1);
      setStatus(fr ? "Modification enregistrée." : "Change saved.");
      return true;
    } catch (e) {
      setError(
        errorMessage(e instanceof Error ? e.message : "UNAVAILABLE", fr),
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  function select(id: string) {
    dirty.current = true;
    setItems((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
    setStatus(
      fr
        ? "Sélection modifiée — enregistre ton émission."
        : "Selection changed — save your episode.",
    );
  }
  function move(id: string, to: number) {
    dirty.current = true;
    setItems((v) => {
      const from = v.indexOf(id);
      if (from < 0 || to < 0 || to >= v.length) return v;
      const copy = [...v];
      copy.splice(from, 1);
      copy.splice(to, 0, id);
      return copy;
    });
    setStatus(
      fr
        ? "Ordre modifié — enregistre ton émission."
        : "Order changed — save your episode.",
    );
  }
  return (
    <section className="ds-questions q-private">
      <header className="q-private-header">
        <div>
          <p className="q-eyebrow">
            DOMINIQUE SOUCY / {fr ? "RÉGIE PRIVÉE" : "PRIVATE CONTROL ROOM"}
          </p>
          <h1>
            {fr ? "PRÉPARER MON ÉMISSION" : "PREPARE MY EPISODE"}
            <span>.</span>
          </h1>
        </div>
        <div className="q-inline">
          <Link href={`/${lang}/questions`}>
            {fr ? "Fil public" : "Public feed"} ↗
          </Link>
          <Link href={`/${lang}/studio-live`}>
            {fr ? "Conférence de presse LIVE" : "Live press conference"} ↗
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/studio/logout", { method: "POST" });
              location.reload();
            }}
          >
            {fr ? "Verrouiller" : "Lock"}
          </button>
        </div>
      </header>
      <p className="q-notice">
        {fr
          ? "Notes, signalements, consentements et sélection restent privés. Le mode présentation masque ces données; vérifie les autorisations avant toute diffusion."
          : "Notes, reports, consent and selections stay private. Presentation mode hides these details; check permission before any broadcast."}
      </p>
      {error && (
        <p className="q-error" role="alert">
          {error}
        </p>
      )}
      <p className="q-muted" role="status">
        {status}
      </p>
      <div className="q-console-layout">
        <div>
          <div className="q-filterbar">
            <label>
              {fr ? "Rechercher" : "Search"}
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOffset(0);
                }}
              />
            </label>
            <label>
              {fr ? "Sujet" : "Topic"}
              <select
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setOffset(0);
                }}
              >
                <option value="">{fr ? "Tous" : "All"}</option>
                {data?.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c[lang]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {fr ? "Classement" : "Sort"}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recent">{fr ? "Récentes" : "Newest"}</option>
                <option value="popular">{fr ? "Populaires" : "Popular"}</option>
                <option value="oldest">{fr ? "Anciennes" : "Oldest"}</option>
              </select>
            </label>
            <label>
              {fr ? "Date" : "Date"}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          {data?.questions.map((q) => (
            <article className="q-card q-admin-card" key={q.id}>
              <div className="q-card-top">
                <strong>
                  {q.author || (fr ? "Sans pseudonyme" : "No alias")}
                </strong>
                <time>{new Date(q.created_at).toLocaleString(lang)}</time>
                <span className="q-topic-label">
                  {data.categories.find((c) => c.id === q.topic)?.[lang]}
                </span>
              </div>
              <h2>{q.title}</h2>
              <p>{q.context}</p>
              <QuestionMedia question={q} privateView />
              <p className="q-muted">
                {q.reactions} {fr ? "réactions" : "reactions"} ·{" "}
                {q.report_count} {fr ? "signalements" : "reports"} ·{" "}
                {q.reuse_consent
                  ? fr
                    ? "Réutilisation autorisée"
                    : "Reuse authorized"
                  : fr
                    ? "Réutilisation média non autorisée"
                    : "Media reuse not authorized"}{" "}
                {q.hidden ? ` · ${fr ? "MASQUÉE" : "HIDDEN"}` : ""}
              </p>
              <div className="q-inline">
                <button
                  aria-pressed={items.includes(q.id)}
                  onClick={() => select(q.id)}
                  disabled={busy || !!q.hidden}
                >
                  {items.includes(q.id)
                    ? fr
                      ? "Retirer de l’émission"
                      : "Remove from episode"
                    : fr
                      ? "Sélectionner pour l’émission"
                      : "Select for episode"}
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void change({
                      operation: "hide",
                      id: q.id,
                      hidden: !q.hidden,
                    })
                  }
                >
                  {q.hidden
                    ? fr
                      ? "Rendre visible"
                      : "Make visible"
                    : fr
                      ? "Masquer d’urgence"
                      : "Emergency hide"}
                </button>
                <Link href={`/${lang}/questions/${q.id}`}>
                  {fr ? "Voir la discussion" : "View discussion"} ↗
                </Link>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  void change({
                    operation: "curate",
                    id: q.id,
                    notes: form.get("notes"),
                    stage: form.get("stage"),
                  });
                }}
              >
                <label>
                  {fr ? "Statut éditorial privé" : "Private editorial status"}
                  <select name="stage" defaultValue={q.stage}>
                    <option value="todo">
                      {fr ? "À traiter" : "To review"}
                    </option>
                    <option value="selected">
                      {fr ? "Sélectionnée" : "Selected"}
                    </option>
                    <option value="used">{fr ? "Utilisée" : "Used"}</option>
                    <option value="archived">
                      {fr ? "Archivée" : "Archived"}
                    </option>
                  </select>
                </label>
                <label>
                  {fr ? "Notes privées" : "Private notes"}
                  <textarea
                    name="notes"
                    defaultValue={q.notes}
                    maxLength={5000}
                  />
                </label>
                <button disabled={busy}>
                  {fr ? "Enregistrer les notes" : "Save notes"}
                </button>
              </form>
              {q.reports.length > 0 && (
                <details>
                  <summary>
                    {fr
                      ? "Voir les signalements privés"
                      : "View private reports"}{" "}
                    ({q.report_count})
                  </summary>
                  {q.reports.map((r, i) => (
                    <p key={i}>
                      {r.reason}: {r.detail}
                    </p>
                  ))}
                </details>
              )}
              <details className="q-remove">
                <summary>
                  {fr ? "Supprimer définitivement" : "Delete permanently"}
                </summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void change({ operation: "remove", id: q.id });
                  }}
                >
                  <label className="q-check">
                    <input type="checkbox" required />
                    {fr
                      ? "Je confirme le retrait définitif de la question, des réponses et du média."
                      : "I confirm permanent removal of this question, replies and media."}
                  </label>
                  <button disabled={busy}>
                    {fr ? "Confirmer la suppression" : "Confirm deletion"}
                  </button>
                </form>
              </details>
            </article>
          ))}
          {data && !data.questions.length && (
            <div className="q-empty">
              <h2>
                {fr
                  ? "La prochaine conversation reste à écrire."
                  : "The next conversation is still to be written."}
              </h2>
              <p>
                {fr
                  ? "Les questions publiques apparaîtront ici, sans approbation préalable."
                  : "Public questions will appear here, with no prior approval queue."}
              </p>
            </div>
          )}
          <div className="q-inline">
            {offset > 0 && (
              <button onClick={() => setOffset((v) => Math.max(0, v - 40))}>
                ← {fr ? "Précédentes" : "Previous"}
              </button>
            )}
            {data?.hasMore && (
              <button onClick={() => setOffset((v) => v + 40)}>
                {fr ? "Suivantes" : "Next"} →
              </button>
            )}
          </div>
        </div>
        <aside className="q-programme">
          <p className="q-eyebrow">
            {fr
              ? "LA CONDUCTRICE DE TON ÉMISSION"
              : "YOUR EPISODE RUNNING ORDER"}
          </p>
          <label>
            {fr ? "Titre de l’émission" : "Episode title"}
            <input
              value={title}
              maxLength={120}
              placeholder={
                fr
                  ? "Donne un titre à ton émission"
                  : "Give your episode a title"
              }
              onChange={(e) => {
                dirty.current = true;
                setTitle(e.target.value);
              }}
            />
          </label>
          <ol
            aria-label={
              fr ? "Ordre de passage des questions" : "Question running order"
            }
          >
            {items.map((id, i) => (
              <li
                key={id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const source = e.dataTransfer.getData("text/plain");
                  if (items.includes(source)) move(source, i);
                }}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                <p>{catalog[id]?.title || id}</p>
                <div>
                  <button
                    aria-label={`${fr ? "Monter la question" : "Move question up"} ${i + 1}`}
                    disabled={i === 0}
                    onClick={() => move(id, i - 1)}
                  >
                    ↑
                  </button>
                  <button
                    aria-label={`${fr ? "Descendre la question" : "Move question down"} ${i + 1}`}
                    disabled={i === items.length - 1}
                    onClick={() => move(id, i + 1)}
                  >
                    ↓
                  </button>
                  <button
                    aria-label={`${fr ? "Retirer la question" : "Remove question"} ${i + 1}`}
                    onClick={() => select(id)}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {!items.length && (
            <p className="q-muted">
              {fr
                ? "Sélectionne des questions dans la liste pour construire ton émission."
                : "Select questions from the list to build your episode."}
            </p>
          )}
          <button
            className="q-primary"
            disabled={busy || !title.trim()}
            onClick={async () => {
              if (await change({ operation: "show", title, items, revision })) {
                dirty.current = false;
                setRefresh((v) => v + 1);
              }
            }}
          >
            {fr ? "ENREGISTRER MON ÉMISSION" : "SAVE MY EPISODE"}
          </button>
          <button
            disabled={!data?.selected.length || busy}
            onClick={() => setPresenting(true)}
          >
            {fr ? "MODE PRÉSENTATION" : "PRESENTATION MODE"} ↗
          </button>
          <p className="q-muted">
            {fr
              ? "La présentation utilise la sélection enregistrée. Glisse les questions ou utilise les flèches accessibles au clavier, puis enregistre."
              : "Presentation uses the saved selection. Drag questions or use the keyboard-accessible arrows, then save."}
          </p>
          <details>
            <summary>
              OBS / {fr ? "SOURCE NAVIGATEUR" : "BROWSER SOURCE"}
            </summary>
            <p>
              {fr
                ? "Dans une source navigateur OBS, ouvre cette URL privée puis utilise Interagir pour te connecter et lancer Mode présentation. OBS utilise son propre profil : la session de ton navigateur habituel n’y est pas partagée. Ne mets jamais le code dans l’URL. Masque les commandes après connexion. L’application ne démarre ni ne contrôle OBS."
                : "In an OBS browser source, open this private URL and use Interact to sign in and start Presentation mode. OBS has its own profile; your normal browser session is not shared. Never put the code in the URL. Hide controls after signing in. This application does not start or control OBS."}
            </p>
          </details>
          <details className="q-emergency">
            <summary>
              {fr ? "CONTRÔLES D’URGENCE" : "EMERGENCY CONTROLS"}
            </summary>
            <button
              disabled={busy}
              onClick={() =>
                void change({
                  operation: "settings",
                  key: "paused",
                  value: data?.settings.paused !== "1",
                })
              }
            >
              {data?.settings.paused === "1"
                ? fr
                  ? "Rouvrir les publications"
                  : "Reopen posting"
                : fr
                  ? "Suspendre les publications"
                  : "Pause posting"}
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void change({
                  operation: "settings",
                  key: "feed_hidden",
                  value: data?.settings.feed_hidden !== "1",
                })
              }
            >
              {data?.settings.feed_hidden === "1"
                ? fr
                  ? "Rouvrir le fil public"
                  : "Reopen public feed"
                : fr
                  ? "Masquer le fil public"
                  : "Hide public feed"}
            </button>
          </details>
        </aside>
      </div>
      {presenting && data && (
        <Presentation
          questions={data.selected}
          title={data.show.title}
          fr={fr}
          onClose={() => setPresenting(false)}
        />
      )}
    </section>
  );
}
