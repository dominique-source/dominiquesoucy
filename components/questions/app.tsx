"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, Question, Reply } from "@/lib/questions/schema";
import { QuestionComposer } from "./composer";
import { errorMessage, questionRequest, QuestionMedia } from "./shared";
type Feed = {
  questions: Question[];
  categories: Category[];
  hasMore: boolean;
  total: number;
  paused: boolean;
  updatedAt: number;
  replies?: Reply[];
};
export function QuestionsApp({
  lang,
  questionId,
}: {
  lang: "fr" | "en";
  questionId?: string;
}) {
  const fr = lang === "fr";
  const router = useRouter();
  const [data, setData] = useState<Feed | null>(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [online, setOnline] = useState(false);
  const [booted, setBooted] = useState(false);
  const [nonce, setNonce] = useState("");
  const [composer, setComposer] = useState<"text" | "audio" | "video" | null>(
    null,
  );
  const [topic, setTopic] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState(false);
  const [format, setFormat] = useState("");
  const [sort, setSort] = useState("live");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [date, setDate] = useState("");
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const query = new URLSearchParams({
    ...(questionId ? { id: questionId } : {}),
    q: debounced,
    topic,
    format,
    sort: sort === "live" ? "recent" : sort,
    date,
    offset: String(offset),
  }).toString();
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let alive = true;
    questionRequest("bootstrap")
      .then((v) => {
        if (alive) {
          setNonce(v.nonce);
          setBooted(true);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        const r = await fetch(`/api/questions/feed?${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const next = await r.json();
        if (!r.ok) throw new Error(next.error);
        if (active) {
          setData(next);
          setError("");
          setOnline(true);
        }
      } catch (e) {
        if (active && !(e instanceof Error && e.name === "AbortError")) {
          setOnline(false);
          setError(
            errorMessage(e instanceof Error ? e.message : "UNAVAILABLE", fr),
          );
        }
      }
    }
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine)
        void load();
    }, 8000);
    const wake = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", wake);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [query, refresh, fr]);
  async function act(action: string, body: unknown) {
    setActionError("");
    setBusy(true);
    try {
      await questionRequest(action, body);
      setRefresh((v) => v + 1);
      return true;
    } catch (e) {
      setActionError(
        errorMessage(e instanceof Error ? e.message : "UNAVAILABLE", fr),
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function share(q: Question) {
    const url = `${location.origin}/${lang}/questions/${q.id}`;
    try {
      if (navigator.share) await navigator.share({ title: q.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setActionError(fr ? "Lien copié." : "Link copied.");
      }
    } catch {
      setActionError(
        fr
          ? "Copie le lien depuis le titre de la question."
          : "Copy the link from the question title.",
      );
    }
  }
  return (
    <section className="ds-questions">
      <div className="q-shell">
        <div className="q-layout">
          <aside className="q-introduction">
            <div className="q-portrait">
              <Image
                src="/assets/questions/dominique_visage_portrait_4x5.webp"
                width={800}
                height={1000}
                alt={
                  fr
                    ? "Dominique Soucy souriant, tourné vers la conversation."
                    : "Dominique Soucy smiling, facing the conversation."
                }
                priority
                sizes="(max-width:850px) 100vw, 38vw"
              />
              <span className="q-photo-credit">
                DOMINIQUE SOUCY /{" "}
                {fr ? "PORTRAIT AUTHENTIQUE" : "AUTHENTIC PORTRAIT"}
              </span>
            </div>
            <div className="q-intro-copy">
              <span className="q-editorial-mark" aria-hidden="true">
                /
              </span>
              <p>
                {fr
                  ? "Des questions qui élargissent la réflexion. Des conversations qui continuent."
                  : "Questions that broaden our thinking. Conversations that keep going."}
              </p>
              <strong>
                DOMINIQUE SOUCY<span>.</span>
              </strong>
            </div>
            <div className="q-community">
              <Image
                src="/assets/questions/icons/users.svg"
                alt=""
                width="28"
                height="28"
              />
              <div>
                <strong>{data ? data.total : "—"}</strong>
                <span>{fr ? "questions publiques" : "public questions"}</span>
              </div>
              <p>
                {fr
                  ? "Pas besoin de profil pour prendre part à la conversation."
                  : "No profile needed to join the conversation."}
              </p>
            </div>
            <div className="q-topic-guide">
              <h2>
                {fr
                  ? "Un terrain de réflexion commun."
                  : "Common ground for reflection."}
              </h2>
              <p>
                {fr
                  ? "Sport, société, humain, communauté, leadership, jeunesse, PürInstinct. Ton regard a sa place."
                  : "Sport, society, humanity, community, leadership, youth, PürInstinct. Your perspective belongs here."}
              </p>
              <Link href={`/${lang}/studio-live/questions`}>
                {fr
                  ? "ESPACE PRIVÉ DE DOMINIQUE"
                  : "DOMINIQUE’S PRIVATE CONSOLE"}{" "}
                ↗
              </Link>
            </div>
          </aside>
          <div className="q-content">
            <header className="q-page-heading">
              <p className="q-eyebrow">
                {fr ? "POUR LA COMMUNAUTÉ" : "FOR THE COMMUNITY"}
              </p>
              <h1>
                {fr ? "BOÎTE À QUESTIONS" : "QUESTION BOX"}
                <span>.</span>
              </h1>
              <Image
                width={340}
                height={14}
                className="q-underline"
                src="/assets/questions/lime-underline.svg"
                alt=""
              />
              <p>
                {fr
                  ? "Pose tes questions à Dominique — par écrit, en audio ou en vidéo. Un espace pour réfléchir ensemble et poursuivre la discussion."
                  : "Ask Dominique a question — in writing, audio or video. A space to think together and keep the conversation going."}
              </p>
            </header>
            <div className="q-publish-actions">
              <button
                className="q-primary"
                onClick={() => setComposer("text")}
                disabled={!booted || data?.paused}
              >
                ＋ {fr ? "Poser une question" : "Ask a question"}
              </button>
              {(["text", "audio", "video"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setComposer(f)}
                  disabled={!booted || data?.paused}
                >
                  <Image
                    src={`/assets/questions/icons/${f === "text" ? "pen" : f === "audio" ? "micro" : "video"}.svg`}
                    alt=""
                    width="20"
                    height="20"
                  />
                  {f === "text"
                    ? fr
                      ? "Écrire"
                      : "Write"
                    : f === "audio"
                      ? "Audio"
                      : fr
                        ? "Vidéo"
                        : "Video"}
                </button>
              ))}
            </div>
            {questionId ? (
              <Link className="q-back" href={`/${lang}/questions`}>
                ← {fr ? "Toutes les questions" : "All questions"}
              </Link>
            ) : (
              <>
                <div
                  className="q-topics"
                  role="group"
                  aria-label={fr ? "Filtrer par sujet" : "Filter by topic"}
                >
                  <button
                    aria-pressed={!topic}
                    onClick={() => {
                      setTopic("");
                      setOffset(0);
                    }}
                  >
                    {fr ? "Tout le fil" : "All questions"}
                  </button>
                  {data?.categories.map((c) => (
                    <button
                      key={c.id}
                      aria-pressed={topic === c.id}
                      onClick={() => {
                        setTopic(c.id);
                        setOffset(0);
                      }}
                    >
                      {c[lang]} <span>{c.count}</span>
                    </button>
                  ))}
                </div>
                <div
                  className={`q-filterbar ${advancedFilters ? "q-filters-expanded" : ""}`}
                >
                  <label className="q-search">
                    <span className="q-sr-only">
                      {fr ? "Rechercher une question" : "Search questions"}
                    </span>
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setOffset(0);
                      }}
                      placeholder={
                        fr ? "Rechercher une question…" : "Search questions…"
                      }
                    />
                  </label>
                  <button
                    className="q-filter-toggle"
                    aria-expanded={advancedFilters}
                    onClick={() => setAdvancedFilters((v) => !v)}
                  >
                    {fr ? "Filtres" : "Filters"}
                  </button>
                  <label>
                    <span className="q-sr-only">
                      {fr ? "Classement" : "Sort order"}
                    </span>
                    <select
                      value={sort}
                      onChange={(e) => {
                        setSort(e.target.value);
                        setOffset(0);
                      }}
                    >
                      <option value="live">
                        {fr ? "Fil actualisé" : "Updating feed"}
                      </option>
                      <option value="recent">
                        {fr ? "Plus récentes" : "Newest"}
                      </option>
                      <option value="popular">
                        {fr ? "Plus populaires" : "Most popular"}
                      </option>
                      <option value="oldest">
                        {fr ? "Plus anciennes" : "Oldest"}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span className="q-sr-only">
                      {fr ? "Format" : "Format"}
                    </span>
                    <select
                      value={format}
                      onChange={(e) => {
                        setFormat(e.target.value);
                        setOffset(0);
                      }}
                    >
                      <option value="">
                        {fr ? "Tous formats" : "All formats"}
                      </option>
                      <option value="text">{fr ? "Texte" : "Text"}</option>
                      <option value="audio">Audio</option>
                      <option value="video">{fr ? "Vidéo" : "Video"}</option>
                    </select>
                  </label>
                  <label className="q-date">
                    <span>{fr ? "Par date" : "By date"}</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setOffset(0);
                      }}
                    />
                  </label>
                </div>
              </>
            )}
            <div className="q-feed-status" role="status">
              <span
                className={online ? "q-status-dot is-online" : "q-status-dot"}
              />
              {online
                ? `${fr ? "Actualisation automatique" : "Automatic refresh"} · 8s · ${new Date(data!.updatedAt).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : error
                  ? fr
                    ? "Connexion au fil indisponible"
                    : "Feed connection unavailable"
                  : fr
                    ? "Connexion au fil…"
                    : "Connecting to feed…"}
            </div>
            {data?.paused && (
              <p className="q-notice">
                {fr
                  ? "Les nouvelles publications sont temporairement suspendues."
                  : "New posts are temporarily paused."}
              </p>
            )}
            {error && (
              <div className="q-notice" role="alert">
                {error}
                <button onClick={() => setRefresh((v) => v + 1)}>
                  {fr ? "Réessayer" : "Retry"}
                </button>
              </div>
            )}
            <p className="q-error" role="status">
              {actionError}
            </p>
            <div
              className="q-feed"
              aria-label={fr ? "Fil des questions" : "Question feed"}
            >
              {data?.questions.map((q) => (
                <article className="q-card" key={q.id}>
                  <div className="q-card-top">
                    <span className="q-avatar" aria-hidden="true">
                      {q.author ? q.author.slice(0, 1).toUpperCase() : "?"}
                    </span>
                    <div>
                      <strong>
                        {q.author ||
                          (fr
                            ? "Une voix de la communauté"
                            : "A community voice")}
                      </strong>
                      <time dateTime={new Date(q.created_at).toISOString()}>
                        {new Date(q.created_at).toLocaleString(lang, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                    </div>
                    <span className="q-topic-label">
                      {data.categories.find((c) => c.id === q.topic)?.[lang] ||
                        q.topic}
                    </span>
                    <span className="q-format-label">
                      {q.format === "text"
                        ? fr
                          ? "ÉCRIT"
                          : "TEXT"
                        : q.format.toUpperCase()}
                    </span>
                  </div>
                  <h2>
                    <Link href={`/${lang}/questions/${q.id}`}>{q.title}</Link>
                  </h2>
                  {q.context && <p className="q-body">{q.context}</p>}
                  <QuestionMedia question={q} />
                  {q.transcript && (
                    <details className="q-transcript">
                      <summary>
                        {fr
                          ? "Transcription fournie par le participant"
                          : "Participant-provided transcript"}
                      </summary>
                      <p>{q.transcript}</p>
                    </details>
                  )}
                  {q.format !== "text" && !q.transcript && (
                    <p className="q-muted">
                      {fr
                        ? "Aucune transcription fournie."
                        : "No transcript provided."}
                    </p>
                  )}
                  <div className="q-card-actions">
                    <button
                      aria-pressed={q.reacted}
                      disabled={!booted || busy}
                      onClick={() => void act("react", { id: q.id })}
                    >
                      <span aria-hidden="true">♡</span>
                      <span className="q-sr-only">
                        {fr
                          ? "Réagir à cette question"
                          : "React to this question"}
                      </span>
                      {q.reactions}
                    </button>
                    <Link href={`/${lang}/questions/${q.id}#reponses`}>
                      ↳ {q.replies} {fr ? "réponses" : "replies"}
                    </Link>
                    <button onClick={() => void share(q)}>
                      {fr ? "Partager" : "Share"} ↗
                    </button>
                    <details className="q-report">
                      <summary>{fr ? "Signaler" : "Report"}</summary>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = new FormData(e.currentTarget);
                          void act("report", {
                            id: q.id,
                            reason: form.get("reason"),
                            detail: form.get("detail"),
                          }).then((ok) => {
                            if (ok)
                              setActionError(
                                fr
                                  ? "Signalement envoyé à la régie privée."
                                  : "Report sent to the private console.",
                              );
                          });
                        }}
                      >
                        <label>
                          {fr ? "Motif" : "Reason"}
                          <select name="reason">
                            <option value="spam">Spam</option>
                            <option value="harassment">
                              {fr ? "Harcèlement" : "Harassment"}
                            </option>
                            <option value="privacy">
                              {fr ? "Vie privée" : "Privacy"}
                            </option>
                            <option value="illegal">
                              {fr ? "Contenu illégal" : "Illegal content"}
                            </option>
                            <option value="other">
                              {fr ? "Autre" : "Other"}
                            </option>
                          </select>
                        </label>
                        <label>
                          {fr
                            ? "Précisions privées (facultatif)"
                            : "Private details (optional)"}
                          <textarea name="detail" maxLength={500} />
                        </label>
                        <button disabled={busy || !booted}>
                          {fr ? "Envoyer le signalement" : "Submit report"}
                        </button>
                      </form>
                    </details>
                  </div>
                  {q.own && (
                    <details className="q-remove">
                      <summary>
                        {fr ? "Gérer ma question" : "Manage my question"}
                      </summary>
                      <p>
                        {fr
                          ? "La suppression retire la question, ses réponses et son média. Elle est définitive."
                          : "Deletion removes the question, replies and media permanently."}
                      </p>
                      <button
                        disabled={busy}
                        onClick={() => void act("remove-own", { id: q.id })}
                      >
                        {fr ? "Confirmer la suppression" : "Confirm deletion"}
                      </button>
                    </details>
                  )}
                </article>
              ))}
              {data && !data.questions.length && !error && (
                <div className="q-empty">
                  <span aria-hidden="true">?</span>
                  <h2>
                    {questionId
                      ? fr
                        ? "Cette question n’est plus disponible."
                        : "This question is no longer available."
                      : debounced || topic || format || date
                        ? fr
                          ? "Aucune question ne correspond."
                          : "No questions match these filters."
                        : fr
                          ? "La conversation commence ici."
                          : "The conversation starts here."}
                  </h2>
                  <p>
                    {fr
                      ? "Pose la première question. Ton point de vue peut ouvrir la discussion."
                      : "Ask the first question. Your perspective can start a conversation."}
                  </p>
                  <button
                    className="q-primary"
                    disabled={!booted || data.paused}
                    onClick={() => setComposer("text")}
                  >
                    {fr ? "PRENDRE LA PAROLE" : "TAKE THE FLOOR"} →
                  </button>
                </div>
              )}
            </div>
            {!questionId && data && (
              <div className="q-pagination">
                {offset > 0 && (
                  <button onClick={() => setOffset((v) => Math.max(0, v - 40))}>
                    ← {fr ? "Précédentes" : "Previous"}
                  </button>
                )}
                {data.hasMore && (
                  <button onClick={() => setOffset((v) => v + 40)}>
                    {fr ? "Questions suivantes" : "Next questions"} →
                  </button>
                )}
              </div>
            )}
            {questionId && data?.questions[0] && (
              <section className="q-thread" id="reponses">
                <h2>
                  {fr
                    ? "La discussion continue."
                    : "Keep the conversation going."}
                </h2>
                {data.replies?.map((reply) => (
                  <article key={reply.id}>
                    <strong>
                      {reply.author ||
                        (fr
                          ? "Une voix de la communauté"
                          : "A community voice")}
                    </strong>
                    <time dateTime={new Date(reply.created_at).toISOString()}>
                      {new Date(reply.created_at).toLocaleString(lang)}
                    </time>
                    <p>{reply.text}</p>
                  </article>
                ))}
                {!data.replies?.length && (
                  <p className="q-muted">
                    {fr ? "Aucune réponse pour le moment." : "No replies yet."}
                  </p>
                )}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formEl = e.currentTarget;
                    const form = new FormData(formEl);
                    setBusy(true);
                    setActionError("");
                    try {
                      const fresh = await questionRequest("bootstrap");
                      await questionRequest("reply", {
                        id: questionId,
                        text: form.get("text"),
                        author: form.get("author"),
                        publishConsent: form.get("consent") === "on",
                        nonce: nonce || fresh.nonce,
                        website: "",
                      });
                      formEl.reset();
                      setRefresh((v) => v + 1);
                    } catch (e) {
                      setActionError(
                        errorMessage(
                          e instanceof Error ? e.message : "UNAVAILABLE",
                          fr,
                        ),
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label>
                    {fr ? "Ta réponse" : "Your reply"}
                    <textarea
                      name="text"
                      required
                      minLength={2}
                      maxLength={2000}
                    />
                  </label>
                  <label>
                    {fr
                      ? "Prénom ou pseudonyme (facultatif)"
                      : "First name or alias (optional)"}
                    <input name="author" maxLength={40} />
                  </label>
                  <label className="q-check">
                    <input type="checkbox" name="consent" required />
                    {fr
                      ? "J’accepte que ma réponse soit publique."
                      : "I consent to my reply being public."}
                  </label>
                  <button
                    className="q-primary"
                    disabled={busy || !booted || data.paused}
                  >
                    {fr ? "PUBLIER MA RÉPONSE" : "PUBLISH REPLY"}
                  </button>
                </form>
              </section>
            )}
            <details className="q-privacy">
              <summary>
                {fr
                  ? "CONFIDENTIALITÉ ET RÈGLES DE PARTICIPATION"
                  : "PRIVACY AND PARTICIPATION RULES"}
              </summary>
              <p>
                {fr
                  ? "Questions, pseudonymes, réponses et médias publiés sont publics jusqu’à leur retrait. Le cookie de ce navigateur permet de reconnaître tes contributions et limiter les réactions répétées; aucun compte ni coordonnée n’est demandé. Les identifiants techniques sont hachés côté serveur. Les signalements et notes éditoriales restent privés. Tu peux supprimer tes questions depuis le navigateur utilisé ou demander un retrait via Signaler. Les contrôles automatiques et les signalements ne garantissent pas une détection de tout contenu problématique."
                  : "Published questions, aliases, replies and media remain public until removal. A browser cookie recognizes your contributions and limits repeated reactions; no account or contact details are requested. Technical identifiers are hashed on the server. Reports and editorial notes remain private. Delete your questions from the original browser or request removal using Report. Automated checks and reports cannot guarantee detection of every harmful contribution."}
              </p>
            </details>
          </div>
        </div>
      </div>
      {composer && (
        <QuestionComposer
          lang={lang}
          categories={data?.categories || []}
          initialFormat={composer}
          onClose={() => setComposer(null)}
          onPublished={(id) => {
            setComposer(null);
            router.push(`/${lang}/questions/${id}`);
            setRefresh((v) => v + 1);
          }}
        />
      )}
    </section>
  );
}
