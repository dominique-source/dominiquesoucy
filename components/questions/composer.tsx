"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { Category } from "@/lib/questions/schema";
import { QuestionRecorder } from "./recorder";
import { errorMessage, questionRequest } from "./shared";
import Script from "next/script";
type ChallengeAPI = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
    },
  ) => string;
  remove: (id: string) => void;
};
function Challenge({
  sitekey,
  onToken,
}: {
  sitekey: string;
  onToken: (s: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const render = useCallback(() => {
    const api = (window as Window & { turnstile?: ChallengeAPI }).turnstile;
    if (ref.current && api && widget.current === undefined)
      widget.current = api.render(ref.current, {
        sitekey,
        callback: onToken,
        "expired-callback": () => onToken(""),
      });
  }, [sitekey, onToken]);
  useEffect(() => {
    render();
    return () => {
      const api = (window as Window & { turnstile?: ChallengeAPI }).turnstile;
      if (widget.current && api) api.remove(widget.current);
    };
  }, [render]);
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onLoad={render}
      />
      <div ref={ref} />
    </>
  );
}
export function QuestionComposer({
  lang,
  categories,
  initialFormat,
  onClose,
  onPublished,
}: {
  lang: "fr" | "en";
  categories: Category[];
  initialFormat: "text" | "audio" | "video";
  onClose: () => void;
  onPublished: (id: string) => void;
}) {
  const fr = lang === "fr";
  const [format, setFormat] = useState(initialFormat);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState("");
  const [boot, setBoot] = useState<{
    nonce: string;
    limits: { audio: number; video: number; maxBytes: number };
    local: boolean;
    turnstileKey: string | null;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [similar, setSimilar] = useState<{ id: string; title: string }[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const submission = useRef("");
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    questionRequest("bootstrap")
      .then((data) => {
        if (!cancelled) {
          setBoot(data);
          timer = setTimeout(() => setReady(true), 2700);
        }
      })
      .catch((e) => setError(errorMessage(e.message, fr)));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      abort.current?.abort();
      element?.close();
    };
  }, [fr]);
  useEffect(() => {
    if (title.trim().length < 12) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(
        `/api/questions/feed?q=${encodeURIComponent(title.trim().slice(0, 60))}`,
        { signal: controller.signal },
      )
        .then((r) => r.json())
        .then((data) => setSimilar((data.questions || []).slice(0, 3)))
        .catch(() => {});
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [title]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!boot || !ready) return;
    if (format !== "text" && !file) {
      setError(
        fr
          ? "Enregistre ou choisis ton fichier avant de publier."
          : "Record or select your file before publishing.",
      );
      return;
    }
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    if (!submission.current) submission.current = crypto.randomUUID();
    const data = {
      question: title,
      context: String(form.get("context") || ""),
      author: String(form.get("author") || ""),
      topic: String(form.get("topic") || ""),
      format,
      transcript: String(form.get("transcript") || ""),
      publishConsent: form.get("publishConsent") === "on",
      reuseConsent: form.get("reuseConsent") === "on",
      nonce: boot.nonce,
      website: String(form.get("website") || ""),
      submissionId: submission.current,
    };
    const body = new FormData();
    body.set("data", JSON.stringify(data));
    if (file && format !== "text") body.set("media", file);
    if (challenge) body.set("challenge", challenge);
    abort.current = new AbortController();
    try {
      const r = await fetch("/api/questions/create", {
        method: "POST",
        body,
        signal: abort.current.signal,
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      onPublished(result.id);
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        setError(
          errorMessage(e instanceof Error ? e.message : "UNAVAILABLE", fr),
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      className="q-dialog ds-questions"
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="q-composer-title"
    >
      <div className="q-dialog-head">
        <div>
          <p className="q-eyebrow">
            {fr
              ? "UNE QUESTION. UNE CONVERSATION."
              : "ONE QUESTION. ONE CONVERSATION."}
          </p>
          <h2 id="q-composer-title">
            {fr ? "À toi la parole." : "The floor is yours."}
          </h2>
        </div>
        <button
          type="button"
          aria-label={fr ? "Fermer" : "Close"}
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <form onSubmit={submit}>
        <div
          className="q-format-picker"
          role="group"
          aria-label={fr ? "Format de la question" : "Question format"}
        >
          {(["text", "audio", "video"] as const).map((f) => (
            <button
              type="button"
              key={f}
              aria-pressed={format === f}
              onClick={() => {
                setFormat(f);
                setFile(null);
              }}
              disabled={busy}
            >
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
        <label>
          {fr ? "Ta question" : "Your question"}
          <textarea
            required
            minLength={10}
            maxLength={280}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              fr
                ? "Qu’aimerais-tu qu’on explore ensemble?"
                : "What would you like us to explore together?"
            }
          />
        </label>
        {title.length >= 12 && similar.length > 0 && (
          <aside className="q-similar">
            <strong>
              {fr
                ? "Des questions proches existent déjà"
                : "Similar questions already exist"}
            </strong>
            {similar.map((q) => (
              <a
                key={q.id}
                href={`/${lang}/questions/${q.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {q.title} ↗
              </a>
            ))}
          </aside>
        )}
        <div className="q-two-fields">
          <label>
            {fr
              ? "Prénom ou pseudonyme (facultatif)"
              : "First name or alias (optional)"}
            <input name="author" maxLength={40} />
          </label>
          <label>
            {fr ? "Sujet" : "Topic"}
            <select name="topic" required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c[lang]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          {fr ? "Contexte (facultatif)" : "Context (optional)"}
          <textarea name="context" maxLength={3000} />
        </label>
        {format !== "text" && boot && (
          <>
            <QuestionRecorder
              key={format}
              kind={format}
              fr={fr}
              maxSeconds={boot.limits[format]}
              maxBytes={boot.limits.maxBytes}
              file={file}
              onFile={setFile}
            />
            <label>
              {fr
                ? "Transcription ou description du média (facultative)"
                : "Media transcript or description (optional)"}
              <textarea name="transcript" maxLength={6000} />
            </label>
            {boot.local && (
              <p className="q-muted">
                {fr
                  ? "Essai local : contrôles techniques des fichiers. L’analyse automatique de contenu devra être connectée pour publier des médias sur Vercel."
                  : "Local test: technical file checks. Automated content screening must be connected for media publication on Vercel."}
              </p>
            )}
          </>
        )}
        <div className="q-honeypot" aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <p className="q-notice">
          {fr
            ? "Ta contribution admissible sera immédiatement publique et pourra être sélectionnée pour une émission. N’ajoute ni coordonnées privées, ni contenu illégal, ni média d’une personne sans son accord. Des contrôles automatiques de sécurité s’appliquent."
            : "Eligible contributions become public immediately and may be selected for an episode. Do not include private contact details, illegal content or anyone’s media without permission. Automated safety checks apply."}
        </p>
        <label className="q-check">
          <input type="checkbox" name="publishConsent" required />
          {fr
            ? "J’accepte la publication publique de ma question et je confirme avoir les droits nécessaires."
            : "I consent to public publication of my question and confirm I have the necessary rights."}
        </label>
        <label className="q-check">
          <input type="checkbox" name="reuseConsent" />
          {fr
            ? "J’autorise séparément la réutilisation de ma voix et de mon image dans une émission (facultatif)."
            : "I separately authorize reuse of my voice and image in an episode (optional)."}
        </label>
        {boot?.turnstileKey && (
          <Challenge sitekey={boot.turnstileKey} onToken={setChallenge} />
        )}
        <p role="alert" className="q-error">
          {error}
        </p>
        <button
          className="q-primary"
          disabled={busy || !ready || (!challenge && !!boot?.turnstileKey)}
        >
          {busy
            ? fr
              ? "Envoi en cours…"
              : "Uploading…"
            : fr
              ? "PUBLIER MA QUESTION →"
              : "PUBLISH MY QUESTION →"}
        </button>
        <p className="q-muted">
          {fr
            ? "Tu peux demander le retrait avec Signaler. Ce navigateur permet aussi de supprimer tes propres questions."
            : "Use Report to request removal. This browser also lets you delete your own questions."}
        </p>
      </form>
    </dialog>
  );
}
