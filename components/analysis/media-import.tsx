"use client";
import { upload } from "@vercel/blob/client";
import { useEffect, useState, type ChangeEvent } from "react";
import { isMediaFile } from "@/lib/analysis/media";

type SourceKey = "audio" | "main" | "vertical" | "secondary";
type SourceItem = {key: SourceKey; title: string; en: string; hint: string; icon: string; accept: string};
const sources: SourceItem[] = [
  { key: "audio", title: "AUDIO PRINCIPAL", en: "MAIN AUDIO", hint: "Micro / OBS · MP3, M4A, WAV", icon: "◉", accept: "audio/*,.mp3,.m4a,.wav,.flac,.ogg,.webm,.mp4" },
  { key: "main", title: "CAMÉRA PRINCIPALE", en: "MAIN CAMERA", hint: "Canon · horizontal 16:9", icon: "▣", accept: "video/*,.mp4,.mov,.webm" },
  { key: "vertical", title: "CAMÉRA VERTICALE", en: "VERTICAL CAMERA", hint: "iPhone · vertical 9:16", icon: "▯", accept: "video/*,.mp4,.mov,.webm" },
  { key: "secondary", title: "CAMÉRA SECONDAIRE", en: "SECONDARY CAMERA", hint: "Samsung · horizontal 16:9", icon: "▤", accept: "video/*,.mp4,.mov,.webm" },
];
type Files = Partial<Record<SourceKey, File>>;
type Transcription = {
  transcript: string;
  segments: {start:number;end:number;speaker:string;text:string}[];
  truncated: boolean;
};

export function MediaImport({ lang, consent, onTranscript }: {
  lang: "fr" | "en";
  consent: boolean;
  onTranscript: (text: string) => void;
}) {
  const fr = lang === "fr";
  const [files, setFiles] = useState<Files>({});
  const [preview, setPreview] = useState("");
  const [phase, setPhase] = useState<"idle"|"upload"|"transcribe">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [segments, setSegments] = useState<Transcription["segments"]>([]);
  const [done, setDone] = useState(false);
  const [projectName, setProjectName] = useState("DOM SOUCY MEDIA — ÉPISODE 001");

  // Only a local media preview. Camera files are not uploaded or synchronized.
  const reference = files.audio || files.main || files.vertical || files.secondary;
  useEffect(() => {
    if (!reference) { setPreview(""); return; }
    const url = URL.createObjectURL(reference);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [reference]);

  function select(key: SourceKey, e: ChangeEvent<HTMLInputElement>) {
    const incoming = e.target.files?.[0];
    if (!incoming) return;
    const isAudio = key === "audio";
    const allowedExtension = isAudio ? /\.(mp3|mp4|m4a|mpeg|mpga|wav|webm|ogg|flac)$/i : /\.(mp4|mov|webm|m4v|mpeg)$/i;
    if (!allowedExtension.test(incoming.name)) {
      setError(fr ? "Format non pris en charge pour cette source." : "Unsupported format for this source.");
      return;
    }
    setError("");
    setDone(false);
    setSegments([]);
    setFiles(prev => ({...prev, [key]: incoming}));
  }
  function clear(key: SourceKey) {
    if (phase !== "idle") return;
    setFiles(prev => { const next = {...prev}; delete next[key]; return next; });
    setDone(false); setError(""); setSegments([]);
  }
  async function transcribe() {
    // For now, one compressed audio/video reference only. Other files never leave this browser.
    const file = reference;
    if (!file || !consent || phase !== "idle") return;
    if (!isMediaFile(file.name, file.type, file.size)) {
      setError(fr
        ? "La source choisie dépasse la limite de transcription de 24 Mo ou utilise un format incompatible. Exporte l’audio en MP3 ou M4A de moins de 24 Mo."
        : "Selected reference exceeds the 24 MB transcription limit or has an unsupported format. Export an MP3 or M4A under 24 MB.");
      return;
    }
    setError(""); setDone(false); setSegments([]); setPhase("upload"); setProgress(0);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g,"_").slice(-100);
      const blob = await upload(`private-studio/${crypto.randomUUID()}/${safeName}`, file, {
        access: "private",
        handleUploadUrl: "/api/analysis/media-upload",
        multipart: true,
        onUploadProgress: ({percentage}) => setProgress(Math.round(percentage)),
      });
      setPhase("transcribe");
      const r = await fetch("/api/analysis/transcribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({pathname: blob.pathname, lang, consent: true}),
      });
      const data = await r.json() as Transcription & {error?:string};
      if (!r.ok || !data.transcript) {
        const messages: Record<string, [string, string]> = {
          BLOB_NOT_CONFIGURED: ["Stockage privé non configuré sur Vercel.", "Private Blob storage is not configured."],
          AI_NOT_CONFIGURED: ["Clé IA non configurée.", "AI key is not configured."],
          MEDIA_NOT_OWNED: ["La session du fichier a expiré. Relance la transcription avec le fichier déjà sélectionné.", "The file session expired. Retry with the locally selected file."],
          MEDIA_NOT_FOUND: ["Le média temporaire est introuvable. Relance l’envoi.", "Temporary media is missing. Upload again."],
          MEDIA_READ_FAILED: ["Impossible de lire l’audio dans le stockage privé. Réessaie.", "Could not read private audio storage. Try again."],
          AUDIO_REJECTED: ["Le fournisseur IA a refusé le format audio. Convertis-le en MP3 ou M4A et réessaie.", "The AI provider rejected this audio format. Convert to MP3 or M4A and retry."],
          AI_RATE_LIMITED: ["Le fournisseur IA limite temporairement les demandes. Réessaie plus tard.", "The AI provider rate limit was reached. Try again later."],
          AI_AUTH_FAILED: ["L’accès au fournisseur IA doit être corrigé dans la configuration du site.", "The AI provider credentials need to be fixed in site configuration."],
          TRANSCRIPTION_PROVIDER_FAILED: ["Le fournisseur IA n’a pas pu transcrire cet audio. Essaie un MP3 plus léger.", "The AI provider could not transcribe this audio. Try a smaller MP3."],
          TRANSCRIPTION_TIMEOUT: ["La transcription a pris trop de temps. Essaie un fichier MP3 plus léger.", "Transcription timed out. Try a smaller MP3."],
          TRANSCRIPTION_EMPTY: ["Aucune parole détectée dans la transcription. Vérifie la piste audio.", "No speech was found. Check the audio track."],
          TRANSCRIPTION_UNAVAILABLE: ["Le service de transcription a rencontré un problème technique. Réessaie.", "The transcription service encountered a technical issue. Try again."],
          RATE_LIMITED: ["Trop d’essais rapprochés. Réessaie un peu plus tard.", "Too many attempts. Try later."],
          UNAUTHORIZED: ["Ta session a expiré. Reconnecte-toi au Studio.", "Your session expired. Sign in to the Studio again."],
        };
        const message = (messages[data.error || ""] || [
          "Erreur pendant la transcription. Ton fichier local est conservé; tu peux réessayer.",
          "Transcription failed. Your local file is still selected; you can retry.",
        ])[fr ? 0 : 1];
        throw new Error(message);
      }
      setSegments(data.segments || []);
      onTranscript(data.transcript);
      setDone(true);
      if (data.truncated) setError(fr ? "Transcription longue : texte limité à 26 000 caractères pour l’analyse." : "Long transcript: limited to 26,000 characters for analysis.");
    } catch (e) {
      setError(e instanceof Error ? e.message : (fr ? "Importation interrompue." : "Import interrupted."));
    } finally {
      setPhase("idle");
    }
  }

  const count = sources.filter(s => files[s.key]).length;
  const referenceIsVideo = reference?.type.startsWith("video/") || /\.(mp4|mpeg)$/i.test(reference?.name || "");
  return <div className="analysis-panel analysis-media">
    <div className="analysis-panel-head"><h2>01 / {fr ? "SOURCES DE TA CONFÉRENCE" : "YOUR CONFERENCE SOURCES"}</h2><span>{count} / 4 {fr ? "FICHIERS CHOISIS" : "FILES SELECTED"}</span></div>
    <label className="analysis-project-name">
      {fr ? "NOM DU PROJET" : "PROJECT NAME"}
      <input value={projectName} onChange={e => setProjectName(e.target.value)} maxLength={100} aria-label={fr ? "Nom du projet" : "Project name"} />
    </label>
    <p>{fr
      ? "Sélectionne tes quatre fichiers séparément. Ils restent pour l’instant sur ton appareil : cette version ne les envoie pas ensemble et ne les synchronise pas encore."
      : "Select up to four separate files. For now they stay on your device: this version does not upload or synchronize them together."}</p>
    <div className="analysis-four-grid">
      {sources.map((source, i) => {
        const file = files[source.key];
        return <div className={`analysis-source-card${file ? " is-selected" : ""}`} key={source.key}>
          <div className="analysis-source-card-head"><span>0{i + 1}</span><b aria-hidden="true">{source.icon}</b></div>
          <strong>{fr ? source.title : source.en}</strong>
          <small>{source.hint}</small>
          <label className="analysis-source-pick">
            {file ? (fr ? "REMPLACER" : "REPLACE") : (fr ? "+ CHOISIR UN FICHIER" : "+ SELECT FILE")}
            <input type="file" disabled={phase !== "idle"} accept={source.accept} onChange={e=>select(source.key,e)}
              aria-label={`${fr ? "Choisir" : "Select"} ${fr ? source.title : source.en}`} />
          </label>
          {file && <div className="analysis-source-loaded">
            <span title={file.name}>{file.name}</span>
            <small>{(file.size / 1_000_000).toFixed(1)} MB · {fr ? "SUR CET APPAREIL" : "LOCAL FILE"}</small>
            <button type="button" disabled={phase !== "idle"} onClick={()=>clear(source.key)}>{fr ? "RETIRER" : "REMOVE"}</button>
          </div>}
        </div>;
      })}
    </div>
    <div className="analysis-source-status">
      <strong>{fr ? "ÉTAPE 1 · FICHIERS SÉLECTIONNÉS" : "STEP 1 · FILES SELECTED"}</strong>
      <p>{fr
        ? "Les quatre cases servent à organiser ton tournage. Ce n’est pas encore un import multicaméra vers le serveur. Garde tes originaux : tes choix disparaissent si tu fermes cette page."
        : "The four slots organize your shoot. They are not yet a server-side multicamera import. Keep originals; selections disappear if you close this page."}</p>
    </div>
    {reference && <div className="analysis-media-reference">
      <h3>{fr ? "ÉTAPE 2 · TRANSCRIRE UNE PISTE DE RÉFÉRENCE" : "STEP 2 · TRANSCRIBE ONE REFERENCE TRACK"}</h3>
      <p>{fr
        ? `Source retenue : ${reference.name}. Priorité à l’audio principal, sinon la première caméra disponible. Seule cette source sera envoyée pour transcription après ton consentement.`
        : `Reference: ${reference.name}. Main audio first, otherwise first available camera. Only this source is submitted for transcription after consent.`}</p>
      {preview && (referenceIsVideo
        ? <video className="analysis-media-player" controls preload="metadata" src={preview} aria-label={fr ? "Aperçu local" : "Local preview"}/>
        : <audio className="analysis-media-audio" controls preload="metadata" src={preview} aria-label={fr ? "Aperçu local" : "Local preview"}/>)}
      <button type="button" className="analysis-primary" onClick={transcribe} disabled={!consent || phase !== "idle"}>
        {phase==="upload" ? (fr ? `ENVOI PRIVÉ… ${progress}%` : `PRIVATE UPLOAD… ${progress}%`) :
          phase==="transcribe" ? (fr ? "TRANSCRIPTION IA EN COURS…" : "AI TRANSCRIPTION RUNNING…") :
          (fr ? "✦ TRANSCRIRE LA PISTE DE RÉFÉRENCE" : "✦ TRANSCRIBE REFERENCE TRACK")}
      </button>
      {!consent && <p className="analysis-note">{fr ? "Coche l’autorisation IA sous la transcription pour continuer." : "Check AI authorization below to continue."}</p>}
    </div>}
    {done && <p className="analysis-media-ok" role="status">{fr ? "Transcription terminée. Descends vérifier le texte puis clique sur « Analyser la séance »." : "Transcription complete. Review the text below and select Analyze Session."}</p>}
    {!!segments.length && <details className="analysis-media-segments"><summary>{fr ? `Voir ${segments.length} segments horodatés` : `Show ${segments.length} timestamped segments`}</summary>
      {segments.map((s,i)=><p key={i}><b>{Math.floor(s.start/60)}:{String(Math.floor(s.start%60)).padStart(2,"0")} · {s.speaker}</b> {s.text}</p>)}
    </details>}
    {error && <p role="alert" className="analysis-error">{error}</p>}
    <p className="analysis-note">{fr
      ? "Pour la transcription : 24 Mo maximum, MP3/M4A recommandé. Les vidéos volumineuses peuvent être choisies dans leur case, mais ne sont ni envoyées ni synchronisées pour le moment."
      : "For transcription: 24 MB maximum; MP3/M4A recommended. Large videos can be selected in their slots, but are not uploaded or synchronized yet."}</p>
  </div>;
}
