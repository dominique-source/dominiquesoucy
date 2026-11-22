"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  canAsk,
  exportText,
  journalists,
  transition,
  voiceCommand,
  type Command,
  type Entry,
  type Mode,
} from "@/lib/studio/domain";
import { microphone, RealtimeStudio } from "@/lib/studio/realtime";
import { StudioAudioRecording } from "@/lib/studio/recording";
import { AudioMeter } from "./meter";
import { StudioGuide } from "./guide";
const labels = {
  fr: {
    reflection: "Réflexion en cours",
    questions: "Questions ouvertes",
    priority: "Dominique a la parole",
    speaking: "Journaliste en intervention",
    paused: "Pause",
    ended: "Conférence terminée",
  },
  en: {
    reflection: "Reflection in progress",
    questions: "Questions open",
    priority: "Dominique has the floor",
    speaking: "Journalist speaking",
    paused: "Paused",
    ended: "Conference ended",
  },
};
function saveFile(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export function StudioDashboard({
  lang,
  provider,
  expires,
}: {
  lang: "fr" | "en";
  provider: boolean;
  expires: number;
}) {
  const fr = lang === "fr";
  const t = (f: string, e: string) => (fr ? f : e);
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("reflection");
  const modeRef = useRef<Mode>("reflection");
  const [active, setActive] = useState(false);
  const [liveView, setLiveView] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<Command | null>(null);
  const voiceFlash = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [connection, setConnection] = useState("offline");
  const connectionRef = useRef("offline");
  const [demo, setDemo] = useState(!provider);
  const demoRef = useRef(!provider);
  const [consent, setConsent] = useState(false);
  const [recordConsent, setRecordConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const capture = useRef<StudioAudioRecording | null>(null);
  const [recordedFile, setRecordedFile] = useState<{ blob: Blob; extension: string } | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const entriesRef = useRef<Entry[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engine = useRef<RealtimeStudio | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const started = useRef(0);
  const [index, setIndex] = useState(-1);
  const indexRef = useRef(-1);
  const [names, setNames] = useState(journalists.map((j) => j.name));
  const namesRef = useRef(names);
  useEffect(() => {
    namesRef.current = names;
  }, [names]);
  const [styles, setStyles] = useState(journalists.map((j) => j.style));
  const stylesRef = useRef(styles);
  useEffect(() => {
    stylesRef.current = styles;
  }, [styles]);
  const [intensity, setIntensity] = useState(2);
  const intensityRef = useRef(2);
  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);
  const [delay, setDelay] = useState(2500);
  const delayRef = useRef(delay);
  useEffect(() => {
    delayRef.current = delay;
  }, [delay]);
  const [memory, setMemory] = useState("");
  const memoryRef = useRef(memory);
  useEffect(() => {
    memoryRef.current = memory;
  }, [memory]);
  const [aiSummary, setAiSummary] = useState("");
  const [summaryConsent, setSummaryConsent] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const summaryAbort = useRef<AbortController | null>(null);
  async function prepareSummary() {
    if (activeRef.current || !summaryConsent || !provider) return;
    const source = entriesRef.current;
    setSummarizing(true);
    setError("");
    summaryAbort.current = new AbortController();
    try {
      const r = await fetch("/api/studio/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: true,
          lang,
          transcript: exportText(source),
        }),
        signal: summaryAbort.current.signal,
      });
      if (!r.ok) throw new Error("summary");
      const body = await r.json();
      if (entriesRef.current === source) setAiSummary(body.summary);
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        setError(
          t(
            "Résumé indisponible. Le bilan local reste exportable; vérifie la clé, la connexion et la longueur du texte.",
            "Summary unavailable. The local review remains exportable; check the key, connection and transcript length.",
          ),
        );
    } finally {
      setSummarizing(false);
    }
  }
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [format, setFormat] = useState("16:9");
  const [testing, setTesting] = useState(false);
  const testingRef = useRef(false);
  const testTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setCurrent = (m: Mode) => {
    modeRef.current = m;
    setMode(m);
  };
  function status(s: string) {
    connectionRef.current = s;
    setConnection(s);
    if (
      ["disconnected", "provider-error", "expired", "audio-blocked"].includes(s)
    ) {
      silence();
      setCurrent("paused");
      streamRef.current
        ?.getTracks()
        .forEach((track) => (track.enabled = false));
      setError(
        t(
          "Connexion ou audio indisponible. Termine puis redémarre la séance pour reconnecter.",
          "Connection or audio unavailable. End and restart the session to reconnect.",
        ),
      );
    }
  }
  function clearTimers() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (watchdog.current) clearTimeout(watchdog.current);
    watchdog.current = null;
  }
  function silence() {
    clearTimers();
    engine.current?.silence();
    busyRef.current = false;
    setBusy(false);
  }
  function stopRecording() {
    capture.current?.stop();
    capture.current = null;
    setRecording(false);
  }
  function downloadRecording() {
    if (!recordedFile) return;
    const url = URL.createObjectURL(recordedFile.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dom-soucy-studio-live-${new Date().toISOString().slice(0, 10)}.${recordedFile.extension}`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function stopMedia() {
    engine.current?.close();
    engine.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }
  function finish() {
    setLiveView(false);
    stopRecording();
    silence();
    activeRef.current = false;
    setActive(false);
    stopMedia();
    setCurrent("ended");
    status("offline");
  }
  function append(speaker: string, text: string) {
    if (!text.trim()) return;
    const next = [
      ...entriesRef.current,
      {
        id: crypto.randomUUID(),
        speaker,
        text: text.slice(0, 12000),
        visibility: "private" as const,
      },
    ].slice(-1000);
    entriesRef.current = next;
    setEntries(next);
  }
  function ask(repeat = false) {
    if (!activeRef.current || !canAsk(modeRef.current, busyRef.current)) return;
    clearTimers();
    const next = repeat
      ? Math.max(0, indexRef.current)
      : (indexRef.current + 1) % 5;
    indexRef.current = next;
    setIndex(next);
    busyRef.current = true;
    setBusy(true);
    setCurrent("speaking");
    if (demoRef.current) {
      const previous = [...entriesRef.current]
        .reverse()
        .find((e) => e.speaker !== "Dominique");
      const topic = [...entriesRef.current]
        .reverse()
        .find((e) => e.speaker === "Dominique" && !voiceCommand(e.text))
        ?.text.slice(0, 180);
      const questions = fr
        ? [
            "Quel exemple concret appuie ce que tu viens de dire?",
            "Comment cette expérience t’a-t-elle fait sentir?",
            "Quel serait le meilleur argument contre ta position?",
            "Que changerais-tu si les règles du sport étaient à réinventer?",
            "Quelle valeur veux-tu préserver, même au prix d’une contradiction?",
          ]
        : [
            "What concrete example supports what you just said?",
            "How did that experience make you feel?",
            "What is the strongest argument against your position?",
            "What would you change if sport’s rules could be reinvented?",
            "Which value would you protect even at the cost of a contradiction?",
          ];
      append(
        namesRef.current[next],
        repeat && previous
          ? previous.text
          : `${t("[Question de démonstration prédéfinie]", "[Preset demonstration question]")} ${questions[next]}${topic ? `\n${t("Contexte saisi", "Typed context")}: « ${topic} »` : ""}`,
      );
      busyRef.current = false;
      setBusy(false);
      setCurrent("questions");
      return;
    }
    try {
      const last = [...entriesRef.current]
        .reverse()
        .find((e) => e.speaker !== "Dominique");
      engine.current?.ask(
        next,
        namesRef.current[next],
        stylesRef.current[next],
        intensityRef.current,
        lang,
        memoryRef.current,
        repeat ? last?.text : undefined,
      );
      watchdog.current = setTimeout(() => {
        if (busyRef.current) {
          silence();
          setCurrent("priority");
          setError(
            t(
              "Réponse interrompue par sécurité après 45 secondes.",
              "Response stopped after the 45-second safety limit.",
            ),
          );
        }
      }, 45000);
    } catch {
      status("disconnected");
    }
  }
  function command(c: Command) {
    setLastVoiceCommand(c);
    if (voiceFlash.current) clearTimeout(voiceFlash.current);
    voiceFlash.current = setTimeout(() => setLastVoiceCommand(null), 1600);
    if (c === "end") {
      finish();
      return;
    }
    if (!activeRef.current) return;
    if (c === "next" || c === "repeat") {
      if (modeRef.current !== "questions" && modeRef.current !== "speaking")
        return;
      silence();
      setCurrent("questions");
      ask(c === "repeat");
      return;
    }
    silence();
    const m = transition(modeRef.current, c);
    setCurrent(m);
    streamRef.current
      ?.getAudioTracks()
      .forEach((track) => (track.enabled = m !== "paused"));
    if (c === "open") ask();
  }
  function receive(speaker: "Dominique" | "journalist", text: string) {
    if (!activeRef.current || modeRef.current === "paused") return;
    const c = speaker === "Dominique" ? voiceCommand(text) : undefined;
    append(
      speaker === "Dominique"
        ? "Dominique"
        : namesRef.current[Math.max(0, indexRef.current)],
      text,
    );
    if (c) command(c);
  }
  function afterUtterance() {
    if (!activeRef.current || !canAsk(modeRef.current, busyRef.current)) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => ask(), delayRef.current);
  }
  async function listDevices() {
    setDevices(await navigator.mediaDevices.enumerateDevices());
  }
  async function testMic() {
    if (activeRef.current || testingRef.current) return;
    setError("");
    testingRef.current = true;
    setTesting(true);
    try {
      const s = await microphone(input);
      streamRef.current = s;
      setStream(s);
      await listDevices();
      testTimer.current = setTimeout(() => {
        s.getTracks().forEach((x) => x.stop());
        streamRef.current = null;
        setStream(null);
        testingRef.current = false;
        setTesting(false);
      }, 5000);
    } catch (e) {
      testingRef.current = false;
      setTesting(false);
      mediaError(e);
    }
  }
  function mediaError(e: unknown) {
    const name = e instanceof Error ? e.name : "";
    const message = e instanceof Error ? e.message : "";
    setError(
      message.includes("PROVIDER_INVALID_KEY")
        ? t("OpenAI refuse la clé API (401/403). Vérifie qu’elle appartient au bon projet et qu’elle autorise Realtime.", "OpenAI rejected the API key (401/403). Check the project and Realtime access.")
        : message.includes("PROVIDER_QUOTA")
          ? t("OpenAI refuse la connexion : limite de facturation ou de requêtes. Vérifie Billing, les crédits et les limites API.", "OpenAI connection refused: billing or rate limit. Check Billing, credits and API limits.")
        : message.includes("PROVIDER_BAD_REQUEST")
          ? t("OpenAI refuse les paramètres Realtime. Le Studio doit ajuster sa configuration vocale.", "OpenAI rejected the Realtime session configuration.")
        : message === "RECORDING_UNAVAILABLE"
        ? t("Impossible de lancer l’enregistrement audio. Vérifie les permissions et essaie Chrome ou Safari récent.", "Unable to start audio recording. Check permissions and try a recent version of Chrome or Safari.")
        : message.includes("STUDIO_HTTP_401_")
        ? t("Ta session a expiré. Recharge la page et reconnecte-toi.", "Your session expired. Reload and sign in again.")
        : message.includes("STUDIO_HTTP_429_")
          ? t("Limite de connexions atteinte. Réessaie dans 15 minutes.", "Connection limit reached. Try again in 15 minutes.")
          : message.includes("PROVIDER_NOT_CONFIGURED")
            ? t("OPENAI_API_KEY n’est pas configurée sur le serveur. Active la démonstration ou configure la clé dans Vercel.", "OPENAI_API_KEY is not configured. Use demo mode or add the key in Vercel.")
            : message.includes("PROVIDER_UNAVAILABLE") || message.includes("STUDIO_HTTP_502_")
              ? t("Le fournisseur vocal IA est indisponible. Vérifie la clé et le modèle Realtime configuré.", "The AI voice provider is unavailable. Check the configured API key and Realtime model.")
              : message.includes("STUDIO_HTTP_503_")
                ? t("Le Studio est indisponible côté serveur. Vérifie les paramètres Vercel et Redis.", "Studio is unavailable on the server. Check Vercel and Redis settings.")
                : name === "NotAllowedError"
        ? t(
            "Permission micro refusée. Autorise-la dans les réglages du navigateur, puis réessaie.",
            "Microphone permission denied. Allow it in browser settings, then retry.",
          )
        : name === "NotFoundError"
          ? t("Aucun microphone détecté.", "No microphone detected.")
          : t(
              "Le micro ou la connexion est indisponible. Vérifie le périphérique et réessaie.",
              "Microphone or connection unavailable. Check your device and retry.",
            ),
    );
  }
  async function startSession(now: number) {
    if (activeRef.current || testingRef.current || !consent || (recordConsent && demo)) return;
    setError("");
    if (recordedFile && !window.confirm(t("Le dernier enregistrement n’a peut-être pas été téléchargé. Commencer une nouvelle séance et l’effacer?", "Your previous recording may not be downloaded. Start a new session and discard it?"))) return;
    setRecordedFile(null);
    silence();
    stopMedia();
    setCurrent("reflection");
    entriesRef.current = [];
    setEntries([]);
    indexRef.current = -1;
    setIndex(-1);
    demoRef.current = demo;
    setAiSummary("");
    summaryAbort.current?.abort();
    started.current = now;
    setSeconds(0);
    activeRef.current = true;
    setActive(true);
    if (demo) {
      status("demo");
      setLiveView(true);
      return;
    }
    try {
      const s = await microphone(input);
      if (!activeRef.current) {
        s.getTracks().forEach((x) => x.stop());
        return;
      }
      streamRef.current = s;
      setStream(s);
      await listDevices();
      if (recordConsent) {
        try {
          capture.current = await StudioAudioRecording.start(
            s,
            (blob, extension) => setRecordedFile({ blob, extension }),
            () => setError(t("Échec de l’enregistrement local. Vérifie l’espace disponible et réessaie.", "Local recording failed. Check available storage and try again.")),
          );
          setRecording(true);
        } catch {
          throw new Error("RECORDING_UNAVAILABLE");
        }
      }
      const call = new RealtimeStudio({
        remoteAudio: (remote) => capture.current?.attachRemote(remote),
        transcript: receive,
        utterance: afterUtterance,
        userSpeaking: () => {
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
          }
          if (modeRef.current === "speaking") {
            silence();
            setCurrent("questions");
          }
        },
        connection: status,
        speaking: (speaking) => {
          if (!activeRef.current) return;
          if (!speaking) {
            busyRef.current = false;
            setBusy(false);
            if (watchdog.current) clearTimeout(watchdog.current);
            if (modeRef.current === "speaking") setCurrent("questions");
          }
        },
      });
      engine.current = call;
      await call.connect(s, lang, output);
      if (activeRef.current) setLiveView(true);
    } catch (e) {
      finish();
      mediaError(e);
    }
  }
  async function testAudio() {
    setError("");
    try {
      const context = new AudioContext();
      const target = context as AudioContext & {
        setSinkId?: (id: string) => Promise<void>;
      };
      if (output && target.setSinkId) await target.setSinkId(output);
      else if (output) throw new Error("sink");
      await context.resume();
      const osc = context.createOscillator();
      const gain = context.createGain();
      gain.gain.value = 0.06;
      osc.frequency.value = 440;
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + 0.4);
      osc.onended = () => void context.close();
    } catch {
      setError(
        t(
          "Sortie audio indisponible. Choisis la sortie dans les réglages Son du Mac.",
          "Output unavailable. Select the output in macOS Sound settings.",
        ),
      );
    }
  }
  useEffect(() => {
    const id = setInterval(() => {
      if (activeRef.current)
        setSeconds(Math.floor((Date.now() - started.current) / 1000));
      if (Date.now() >= expires) {
        stopRecording();
        engine.current?.close();
        streamRef.current?.getTracks().forEach((x) => x.stop());
        activeRef.current = false;
        router.refresh();
      }
      if (activeRef.current && Date.now() - started.current >= 15 * 60 * 1000) {
        stopRecording();
        setLiveView(false);
        engine.current?.close();
        streamRef.current?.getTracks().forEach((x) => x.stop());
        activeRef.current = false;
        setActive(false);
        modeRef.current = "ended";
        setMode("ended");
        setStream(null);
        setConnection("offline");
      }
    }, 1000);
    const offline = () => {
      stopRecording();
      engine.current?.silence();
      streamRef.current?.getAudioTracks().forEach((x) => (x.enabled = false));
      modeRef.current = "paused";
      setMode("paused");
      connectionRef.current = "disconnected";
      setConnection("disconnected");
      setError(
        fr
          ? "Réseau interrompu. Termine et redémarre pour reconnecter."
          : "Network lost. End and restart to reconnect.",
      );
    };
    window.addEventListener("offline", offline);
    return () => {
      summaryAbort.current?.abort();
      clearInterval(id);
      window.removeEventListener("offline", offline);
      capture.current?.stop();
      engine.current?.close();
      streamRef.current?.getTracks().forEach((x) => x.stop());
      if (timer.current) clearTimeout(timer.current);
      if (watchdog.current) clearTimeout(watchdog.current);
      if (testTimer.current) clearTimeout(testTimer.current);
      if (voiceFlash.current) clearTimeout(voiceFlash.current);
    };
  }, [expires, router, fr]);
  function updateEntry(id: string, visibility: Entry["visibility"]) {
    entriesRef.current = entriesRef.current.map((e) =>
      e.id === id ? { ...e, visibility } : e,
    );
    setEntries(entriesRef.current);
  }
  function summary() {
    return `${t("BILAN LOCAL — extraits non interprétés, pas une synthèse IA", "LOCAL REVIEW — uninterpreted excerpts, not an AI summary")}\n${Math.floor(seconds / 60)} min ${seconds % 60}s · ${entriesRef.current.filter((e) => e.speaker !== "Dominique").length} ${t("questions/interventions", "questions/interventions")}\n\n${exportText(entriesRef.current)}\n\n${t("Notes éditoriales privées", "Private editorial notes")}: ${note}`;
  }
  return (
    <section className={`studio-dashboard${active && liveView ? " is-live" : ""}`}>
      {active && liveView && (
        <div className="studio-live-panel" role="region" aria-label={t("Commandes vocales en direct", "Live voice commands")}>
          <header className="studio-live-header">
            <div className="studio-live-brand">DOMINIQUE SOUCY <span>/ STUDIO LIVE</span></div>
            <div className="studio-live-on"><span aria-hidden="true" />{t("EN DIRECT", "LIVE")} · {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</div>
          </header>
          <div className="studio-live-heading">
            <p>{t("CONTRÔLE VOCAL", "VOICE CONTROL")}</p>
            <h2>{t("MODE LIVE", "LIVE MODE")}</h2>
            <span>{t("DIS LA COMMANDE À VOIX HAUTE", "SAY THE COMMAND OUT LOUD")}</span>
          </div>
          <div className="studio-live-commands">
            {([
              { cmd: "open" as Command, title: t("OUVRIR LES QUESTIONS", "OPEN QUESTIONS"), cue: t("Maintenant, on passe aux questions", "Let's open the questions"), enabled: mode !== "questions" && mode !== "speaking" && (demo || connection === "connected") },
              { cmd: "next" as Command, title: t("PROCHAINE QUESTION", "NEXT QUESTION"), cue: t("Prochaine question", "Next question"), enabled: mode === "questions" || mode === "speaking" },
              { cmd: "repeat" as Command, title: t("RÉPÉTER", "REPEAT"), cue: t("Répète la question", "Repeat the question"), enabled: (mode === "questions" || mode === "speaking") && index >= 0 },
              { cmd: "reflection" as Command, title: t("RÉFLEXION LIBRE", "FREE REFLECTION"), cue: t("Retour à la réflexion", "Back to reflection"), enabled: true },
              { cmd: "silence" as Command, title: t("SILENCE IMMÉDIAT", "IMMEDIATE SILENCE"), cue: t("Attends, j'ai pas fini", "Let me finish"), enabled: true },
              { cmd: "end" as Command, title: t("TERMINER", "END SESSION"), cue: t("Fin de conférence", "End conference"), enabled: true },
            ]).map(({ cmd, title, cue, enabled }) => (
              <button
                key={cmd}
                type="button"
                className={`studio-live-command studio-live-command--${cmd}${lastVoiceCommand === cmd ? " is-recognized" : ""}${(cmd === "reflection" && mode === "reflection") || (cmd === "open" && mode === "questions") ? " is-current" : ""}`}
                disabled={!enabled}
                onClick={() => command(cmd)}
                aria-label={`${title}. ${t("Commande vocale", "Voice command")}: ${cue}`}
              >
                <strong>{title}</strong>
                <span>« {cue} »</span>
              </button>
            ))}
          </div>
          {error && <p className="studio-live-error" role="alert">{error}</p>}
          <div className="studio-live-status">
            <span>{t("JOURNALISTE", "JOURNALIST")}: <strong>{index >= 0 ? names[index] : "—"}</strong></span>
            <span>{t("MODE", "MODE")}: <strong>{labels[lang][mode]}</strong></span>
            <span>{t("MICRO", "MIC")}: <strong>{mode === "paused" ? t("COUPÉ", "OFF") : t("ACTIF", "ON")}</strong></span>
            <span>{t("AUDIO", "AUDIO")}: <strong>{recording ? t("● ENREGISTREMENT", "● RECORDING") : t("NON ENREGISTRÉ", "NOT RECORDING")}</strong></span>
            <span>{t("IA", "AI")}: <strong>{connection}</strong></span>
          </div>
          <footer className="studio-live-footer">
            <p>{t("Lis la commande affichée sous chaque bouton. Dis-la seule, puis attends sa reconnaissance.", "Say the command shown below each button on its own.")}</p>
            <button type="button" onClick={() => setLiveView(false)}>{t("RETOUR À LA RÉGIE", "BACK TO CONTROL ROOM")}</button>
          </footer>
        </div>
      )}
      <div className="studio-topline">
        <p className="studio-kicker">
          DOMINIQUE SOUCY / {t("RÉGIE PRIVÉE", "PRIVATE CONTROL ROOM")}
        </p>
        <button
          className="studio-link"
          onClick={async () => {
            finish();
            await fetch("/api/studio/logout", { method: "POST" });
            router.refresh();
          }}
        >
          {t("VERROUILLER", "LOCK STUDIO")} ↗
        </button>
      </div>
      <header className="studio-title">
        <div>
          <p className="studio-kicker">
            {t("UN HOMME. CINQ REGARDS.", "ONE MAN. FIVE PERSPECTIVES.")}
          </p>
          <h1>
            {t("CONFÉRENCE DE PRESSE", "PRESS CONFERENCE")}
            <em>LIVE.</em>
          </h1>
        </div>
        <span className="studio-clock">
          {String(Math.floor(seconds / 60)).padStart(2, "0")}
          <span>:</span>
          {String(seconds % 60).padStart(2, "0")}
        </span>
      </header>
      <p className="studio-disclosure">
        {t(
          "Cinq journalistes virtuels générés par IA — aucune personne réelle. Une voix synthétique commune dans cette version.",
          "Five AI-generated virtual journalists — no real people. One shared synthetic voice in this version.",
        )}
      </p>
      <div className="studio-grid">
        <div className="studio-main">
          <div className="studio-stage" data-mode={mode}>
            <div className="studio-mode" role="status">
              <span className="studio-dot" />
              {labels[lang][mode]}
            </div>
            <h2>
              {mode === "speaking"
                ? names[index] || "…"
                : mode === "reflection"
                  ? t("À toi de penser tout haut.", "Think out loud.")
                  : mode === "priority"
                    ? t("Tu gardes la parole.", "The floor is yours.")
                    : mode === "questions"
                      ? t(
                          "La discussion est ouverte.",
                          "The discussion is open.",
                        )
                      : labels[lang][mode]}
            </h2>
            <p>
              {mode === "reflection"
                ? t(
                    "Journalistes silencieux. Aucune question déclenchée par une pause.",
                    "Journalists silent. Pauses never trigger questions.",
                  )
                : t(
                    "Tu choisis quand donner — et reprendre — la parole.",
                    "You decide when to give — and take back — the floor.",
                  )}
            </p>
            <AudioMeter
              stream={stream}
              label={t(
                "Niveau réel du microphone",
                "Actual microphone input level",
              )}
            />
            <div className="studio-stage-footer">
              <span>
                {demo
                  ? t(
                      "DÉMONSTRATION · SANS IA CONNECTÉE",
                      "DEMONSTRATION · NO CONNECTED AI",
                    )
                  : connection === "connected"
                    ? t("AUDIO EN DIRECT · OPENAI", "LIVE AUDIO · OPENAI")
                    : t(
                        "CONNEXION VOCALE EN ATTENTE",
                        "VOICE CONNECTION PENDING",
                      )}
              </span>
              <span>{format} / 15 MIN MAX</span>
            </div>
          </div>
          <div className="studio-controls">
            {active && !liveView && <button type="button" className="studio-open-live" onClick={() => setLiveView(true)}>{t("AFFICHER LE MODE LIVE · COMMANDES VOCALES", "OPEN LIVE MODE · VOICE COMMANDS")}</button>}
            <button
              className="studio-primary"
              onClick={(event) => {
                void startSession(performance.timeOrigin + event.timeStamp);
              }}
              disabled={active || !consent || testing || (recordConsent && demo)}
            >
              {t("DÉMARRER LA SÉANCE", "START SESSION")}
            </button>
            <button
              onClick={() => command("open")}
              disabled={
                !active ||
                (!demo && connection !== "connected") ||
                mode === "questions" ||
                mode === "speaking"
              }
            >
              {t("OUVRIR LES QUESTIONS", "OPEN QUESTIONS")}
            </button>
            <button
              className="studio-silence"
              onClick={() => {
                silence();
                if (active) setCurrent("priority");
              }}
            >
              {t("SILENCE IMMÉDIAT", "IMMEDIATE SILENCE")} ■
            </button>
            <button
              onClick={() => command("next")}
              disabled={
                !active || !(["questions", "speaking"] as Mode[]).includes(mode)
              }
            >
              {t("PROCHAINE QUESTION", "NEXT QUESTION")} →
            </button>
            <button
              onClick={() => command("repeat")}
              disabled={
                !active ||
                !(["questions", "speaking"] as Mode[]).includes(mode) ||
                index < 0
              }
            >
              {t("RÉPÉTER", "REPEAT")}
            </button>
            <button onClick={() => command("reflection")} disabled={!active}>
              {t("RÉFLEXION LIBRE", "FREE REFLECTION")}
            </button>
            <button
              onClick={() =>
                command(mode === "paused" ? "reflection" : "pause")
              }
              disabled={!active}
            >
              {mode === "paused"
                ? t("REPRENDRE EN SILENCE", "RESUME SILENTLY")
                : "PAUSE"}
            </button>
            <button onClick={finish} disabled={!active}>
              {t("TERMINER", "END SESSION")}
            </button>
          </div>
          {error && (
            <div className="studio-start-error" role="alert">
              <strong>{t("LA SÉANCE N’A PAS DÉMARRÉ", "SESSION DID NOT START")}</strong>
              <p>{error}</p>
            </div>
          )}
          <div className="studio-recording-panel">
            <strong>{recording ? t("● ENREGISTREMENT AUDIO EN COURS", "● AUDIO RECORDING IN PROGRESS") : recordedFile ? t("Enregistrement prêt à télécharger", "Recording ready to download") : t("Enregistrement audio local", "Local audio recording")}</strong>
            <p>{t("Ta voix et celle des journalistes IA seront enregistrées ensemble, dans le navigateur. Aucun fichier n’est envoyé au serveur. Télécharge-le avant de fermer cette page.", "Your voice and AI journalists are recorded together in the browser. No file is uploaded. Download it before closing this page.")}</p>
            <button type="button" disabled={!recordedFile || active} onClick={downloadRecording}>
              {t("TÉLÉCHARGER L’AUDIO", "DOWNLOAD AUDIO")} {recordedFile ? `(${(recordedFile.blob.size / 1048576).toFixed(1)} Mo)` : ""}
            </button>
          </div>
          <div className="studio-status">
            <span>
              {t("Connexion IA", "AI connection")} <strong>{connection}</strong>
            </span>
            <span>
              {t("Séance", "Session")}{" "}
              <strong>
                {active ? t("active", "active") : t("inactive", "inactive")}
              </strong>
            </span>
            <span>
              {t("Enregistrement audio", "Audio recording")}{" "}
              <strong>{recording ? t("En cours", "Recording") : recordedFile ? t("À télécharger", "Ready to download") : t("Inactif", "Inactive")}</strong>
            </span>
            <span>
              {t("Micro", "Mic")}{" "}
              <strong>
                {devices.find((d) => d.deviceId === input)?.label ||
                  t("Entrée système", "System input")}
              </strong>
            </span>
            <span>
              {t("Sortie", "Output")}{" "}
              <strong>
                {devices.find((d) => d.deviceId === output)?.label ||
                  t("Sortie système", "System output")}
              </strong>
            </span>
          </div>
        </div>
        <aside className="studio-journalists">
          <p className="studio-kicker">
            {t("LES JOURNALISTES", "THE JOURNALISTS")} / 05
          </p>
          {journalists.map((j, i) => (
            <div
              key={j.name}
              className={`studio-journalist ${index === i && mode === "speaking" ? "is-speaking" : ""}`}
            >
              <span className="studio-journalist-number">0{i + 1}</span>
              <div>
                <h3>{names[i]}</h3>
                <p>{j.role[fr ? 0 : 1]}</p>
              </div>
              <span className="studio-mic-state">
                {index === i && busy ? "◉" : t("MUET", "MUTED")}
              </span>
            </div>
          ))}
          <p className="studio-muted">
            {t(
              "Une seule intervention à la fois. La commande Silence garde la priorité.",
              "One intervention at a time. Silence always has priority.",
            )}
          </p>
        </aside>
      </div>
      <div className="studio-lower">
        <section className="studio-settings">
          <h2>{t("Avant de prendre l’antenne.", "Before going on air.")}</h2>
          <label className="studio-check">
            <input
              type="checkbox"
              checked={consent}
              disabled={active}
              onChange={(e) => setConsent(e.target.checked)}
            />
            {t(
              "J’accepte la transcription temporaire de cette séance et, en mode connecté, l’envoi de mon audio à OpenAI.",
              "I consent to temporary session transcription and, in connected mode, sending my audio to OpenAI.",
            )}
          </label>
          <label className="studio-check">
            <input
              type="checkbox"
              checked={recordConsent}
              disabled={active}
              onChange={(e) => setRecordConsent(e.target.checked)}
            />
            {t("Enregistrer ma voix et les journalistes IA dans un fichier audio local, à télécharger à la fin de la séance.", "Record my voice and the AI journalists into a local audio file to download at the end of the session.")}
          </label>
          <label className="studio-check">
            <input
              type="checkbox"
              checked={demo}
              disabled={active}
              onChange={(e) => setDemo(e.target.checked)}
            />
            {t(
              "Démonstration locale : contexte saisi, questions prédéfinies, aucune IA ni transcription vocale.",
              "Local demo: typed context, preset questions, no AI or voice transcription.",
            )}
          </label>
          {!provider && !demo && (
            <p role="alert">
              {t(
                "Clé API non configurée : la connexion réelle ne pourra pas démarrer.",
                "API key not configured: a real connection cannot start.",
              )}
            </p>
          )}
          <div className="studio-fields">
            <label>
              {t("Microphone", "Microphone")}
              <select
                value={input}
                disabled={active || testing}
                onChange={(e) => setInput(e.target.value)}
              >
                <option value="">{t("Entrée système", "System input")}</option>
                {devices
                  .filter((d) => d.kind === "audioinput")
                  .map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || d.deviceId}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {t("Sortie audio", "Audio output")}
              <select
                value={output}
                disabled={active}
                onChange={(e) => setOutput(e.target.value)}
              >
                <option value="">{t("Sortie système", "System output")}</option>
                {devices
                  .filter((d) => d.kind === "audiooutput")
                  .map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || d.deviceId}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {t("Intensité", "Intensity")}
              <select
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
              >
                {(fr
                  ? [
                      "Conversation",
                      "Journalisme exigeant",
                      "Conférence intense",
                    ]
                  : [
                      "Conversation",
                      "Demanding journalism",
                      "Intense press conference",
                    ]
                ).map((s, i) => (
                  <option key={s} value={i + 1}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Délai après une réponse", "Delay after an answer")}
              <select
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
              >
                {[1500, 2500, 5000, 10000].map((n) => (
                  <option key={n} value={n}>
                    {n / 1000}s
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Format de tournage", "Shooting format")}
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option>16:9</option>
                <option>9:16</option>
                <option>16:9 + 9:16</option>
              </select>
            </label>
          </div>
          <div className="studio-inline">
            <button onClick={testMic} disabled={active || testing}>
              {testing
                ? t("TEST MICRO · 5S", "MIC TEST · 5S")
                : t("TEST MICRO", "TEST MIC")}
            </button>
            <button onClick={testAudio} disabled={active}>
              {t("TEST AUDIO", "TEST AUDIO")}
            </button>
          </div>
          <p className="studio-muted">
            {t(
              "Le test micro ouvre le périphérique pendant 5 secondes, sans transmission. Le test audio joue un son bref. Les périphériques apparaissent après autorisation du micro; certaines sorties se choisissent dans macOS.",
              "Mic test opens the device for 5 seconds without transmission. Audio test plays a short tone. Devices appear after mic permission; some outputs must be selected in macOS.",
            )}
          </p>
          <details>
            <summary>
              {t("PERSONNALISER LES JOURNALISTES", "CUSTOMIZE JOURNALISTS")}
            </summary>
            {journalists.map((j, i) => (
              <fieldset key={j.name}>
                <legend>{j.role[fr ? 0 : 1]}</legend>
                <label>
                  {t("Prénom", "First name")}
                  <input
                    maxLength={30}
                    value={names[i]}
                    onChange={(e) =>
                      setNames((v) =>
                        v.map((s, n) => (n === i ? e.target.value : s)),
                      )
                    }
                  />
                </label>
                <label>
                  {t("Style de questionnement", "Questioning style")}
                  <textarea
                    maxLength={800}
                    value={styles[i]}
                    onChange={(e) =>
                      setStyles((v) =>
                        v.map((s, n) => (n === i ? e.target.value : s)),
                      )
                    }
                  />
                </label>
              </fieldset>
            ))}
          </details>
          <StudioGuide fr={fr} />
          <details className="studio-guide">
            <summary>{t("COMMANDES VOCALES", "VOICE COMMANDS")}</summary>
            <p>
              {fr
                ? "« Maintenant, on passe aux questions. » · « Attends, j’ai pas fini. » · « Laisse-moi terminer. » · « Silence, les journalistes. » · « Reprenons les questions. » · « Prochaine question. » · « Répète la question. » · « Fin de conférence. » · « Retour à la réflexion. »"
                : "“Let’s open the questions.” · “Let me finish.” · “Silence journalists.” · “Resume questions.” · “Next question.” · “Repeat the question.” · “End conference.” · “Back to reflection.”"}
            </p>
            <p>
              {t(
                "Prononcer une commande seule. La reconnaissance attend la transcription : le bouton Silence est plus rapide. En pause, le micro est coupé et les commandes vocales ne fonctionnent pas.",
                "Say a command on its own. Recognition waits for transcription: the Silence button is faster. Paused mode disables the mic and voice commands.",
              )}
            </p>
          </details>
        </section>
        <section className="studio-session-notes">
          <h2>{t("Le fil de la conversation.", "The conversation thread.")}</h2>
          <p className="studio-muted">
            {t(
              "Mémoire de cette page seulement. Aucun enregistrement audio dans le site. Tout est privé jusqu’à ton choix explicite; un marquage publiable ne publie rien.",
              "Page memory only. No audio recording in the website. Everything is private until explicitly marked; marking publishable does not publish anything.",
            )}
          </p>
          <div
            className="studio-transcript"
            aria-label={t("Transcription de séance", "Session transcript")}
          >
            {entries.length ? (
              entries.map((e) => (
                <article key={e.id}>
                  <div>
                    <strong>{e.speaker}</strong>
                    <label>
                      <span className="sr-only">
                        {t("Visibilité", "Visibility")}
                      </span>
                      <select
                        value={e.visibility}
                        onChange={(event) =>
                          updateEntry(
                            e.id,
                            event.target.value as Entry["visibility"],
                          )
                        }
                      >
                        <option value="private">{t("Privé", "Private")}</option>
                        <option value="publishable">
                          {t(
                            "Publiable après révision",
                            "Publishable after review",
                          )}
                        </option>
                      </select>
                    </label>
                  </div>
                  <p>{e.text}</p>
                </article>
              ))
            ) : (
              <p>
                {t(
                  "Les mots apparaîtront ici. Pour l’instant, place à la réflexion.",
                  "Words will appear here. For now, space to reflect.",
                )}
              </p>
            )}
          </div>
          {demo && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                receive("Dominique", draft);
                setDraft("");
                afterUtterance();
              }}
            >
              <label>
                {t(
                  "PAROLE SIMULÉE — démonstration uniquement",
                  "SIMULATED SPEECH — demonstration only",
                )}
                <textarea
                  maxLength={12000}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={!active}
                />
              </label>
              <button disabled={!active || !draft.trim()}>
                {t("AJOUTER AU CONTEXTE", "ADD TO CONTEXT")}
              </button>
            </form>
          )}
          <label>
            {t("Notes éditoriales privées", "Private editorial notes")}
            <textarea
              value={note}
              maxLength={12000}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="studio-inline">
            <button
              disabled={!entries.length}
              onClick={() =>
                saveFile("studio-transcript.txt", exportText(entries))
              }
            >
              {t("EXPORTER LA TRANSCRIPTION", "EXPORT TRANSCRIPT")}
            </button>
            <button
              disabled={!entries.length}
              onClick={() =>
                saveFile("studio-questions.txt", exportText(entries, true))
              }
            >
              {t("EXPORTER LES QUESTIONS", "EXPORT QUESTIONS")}
            </button>
            <button
              disabled={!entries.length}
              onClick={() => saveFile("studio-bilan.txt", summary())}
            >
              {t("EXPORTER LE BILAN LOCAL", "EXPORT LOCAL REVIEW")}
            </button>
            <button
              onClick={() => {
                finish();
                summaryAbort.current?.abort();
                setAiSummary("");
                entriesRef.current = [];
                setEntries([]);
                setNote("");
                setDraft("");
              }}
            >
              {t("EFFACER LA SÉANCE", "CLEAR SESSION")}
            </button>
          </div>
          <details className="studio-guide">
            <summary>
              {t(
                "RÉSUMÉ ÉDITORIAL IA — SUR DEMANDE",
                "AI EDITORIAL SUMMARY — ON REQUEST",
              )}
            </summary>
            <p>
              {t(
                "Après la séance, créer un résumé privé des idées et des questions ouvertes. La transcription sera envoyée à OpenAI; aucun envoi automatique. Ce résumé doit être relu avant tout partage.",
                "After the session, create a private summary of ideas and open questions. The transcript will be sent to OpenAI; nothing is sent automatically. Review this summary before sharing.",
              )}
            </p>
            <label className="studio-check">
              <input
                type="checkbox"
                checked={summaryConsent}
                onChange={(e) => setSummaryConsent(e.target.checked)}
              />
              {t(
                "J’autorise l’envoi de la transcription pour ce résumé.",
                "I consent to sending the transcript for this summary.",
              )}
            </label>
            <button
              disabled={
                active ||
                !provider ||
                !entries.length ||
                !summaryConsent ||
                summarizing
              }
              onClick={() => void prepareSummary()}
            >
              {summarizing
                ? "…"
                : t("PRÉPARER LE RÉSUMÉ IA", "PREPARE AI SUMMARY")}
            </button>
            {!provider && (
              <p>
                {t(
                  "Une clé API serveur est nécessaire. Le bilan local reste disponible sans IA.",
                  "A server API key is required. The local review remains available without AI.",
                )}
              </p>
            )}
            {aiSummary && (
              <>
                <label>
                  {t(
                    "Résumé privé — à relire et corriger",
                    "Private summary — review and edit",
                  )}
                  <textarea
                    value={aiSummary}
                    onChange={(e) => setAiSummary(e.target.value)}
                  />
                </label>
                <button
                  onClick={() => saveFile("studio-resume-prive.txt", aiSummary)}
                >
                  {t("EXPORTER LE RÉSUMÉ PRIVÉ", "EXPORT PRIVATE SUMMARY")}
                </button>
              </>
            )}
          </details>
          <details>
            <summary>
              {t("MÉMOIRE ÉDITORIALE FACULTATIVE", "OPTIONAL EDITORIAL MEMORY")}
            </summary>
            <p>
              {t(
                "Préférences, sujets et arguments : stockés sur ce navigateur uniquement si tu cliques Enregistrer. Pas d’entraînement automatique. En mode connecté, ce texte est envoyé avec les demandes de questions. Un appareil partagé peut exposer ces notes.",
                "Preferences, topics and arguments: stored in this browser only when you click Save. No automatic training. In connected mode, these notes accompany question requests. Shared devices can expose these notes.",
              )}
            </p>
            <label>
              {t("Mes directives", "My preferences")}
              <textarea
                value={memory}
                maxLength={3000}
                onChange={(e) => setMemory(e.target.value)}
              />
            </label>
            <div className="studio-inline">
              <button
                onClick={() => {
                  try {
                    localStorage.setItem("ds-studio-memory", memory);
                    setError(
                      t(
                        "Mémoire enregistrée sur ce navigateur.",
                        "Memory saved in this browser.",
                      ),
                    );
                  } catch {
                    setError(
                      t(
                        "Stockage local indisponible.",
                        "Local storage unavailable.",
                      ),
                    );
                  }
                }}
              >
                {t("ENREGISTRER", "SAVE")}
              </button>
              <button
                onClick={() => {
                  try {
                    setMemory(localStorage.getItem("ds-studio-memory") || "");
                  } catch {
                    setError(
                      t("Stockage indisponible.", "Storage unavailable."),
                    );
                  }
                }}
              >
                {t("CHARGER", "LOAD")}
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("ds-studio-memory");
                  setMemory("");
                }}
              >
                {t("SUPPRIMER LA MÉMOIRE", "DELETE MEMORY")}
              </button>
            </div>
          </details>
        </section>
      </div>
    </section>
  );
}
