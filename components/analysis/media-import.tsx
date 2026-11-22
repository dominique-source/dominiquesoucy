"use client";
import { upload } from "@vercel/blob/client";
import { useEffect, useState, type ChangeEvent } from "react";
import { isMediaFile, MAX_MEDIA_BYTES } from "@/lib/analysis/media";

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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [phase, setPhase] = useState<"idle"|"upload"|"transcribe">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [segments, setSegments] = useState<Transcription["segments"]>([]);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function select(e: ChangeEvent<HTMLInputElement>) {
    const incoming = e.target.files?.[0] || null;
    setError(""); setSegments([]); setDone(false);
    if (!incoming) { setFile(null); return; }
    if (!isMediaFile(incoming.name, incoming.type, incoming.size)) {
      setError(fr ?
        "Fichier non accepté. Utilise MP3, MP4, M4A, WAV, OGG, FLAC ou WebM, avec un fichier compressé de 24 Mo maximum." :
        "Unsupported file. Use MP3, MP4, M4A, WAV, OGG, FLAC or WebM, compressed under 24 MB.");
      setFile(null); return;
    }
    setFile(incoming);
  }
  async function transcribe() {
    if (!file || !consent || phase !== "idle") return;
    setError("");setDone(false);setSegments([]);setPhase("upload");setProgress(0);
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
        const message = data.error === "BLOB_NOT_CONFIGURED" ? (fr ? "Stockage privé non configuré sur Vercel." : "Private Blob storage is not configured.") :
          data.error === "AI_NOT_CONFIGURED" ? (fr ? "Clé IA non configurée." : "AI key not configured.") :
          fr ? "Transcription impossible. Vérifie le format et réessaie." : "Transcription failed. Check file format and retry.";
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
  const isVideo = file?.type.startsWith("video/") || /\.(mp4|mpeg)$/i.test(file?.name || "");
  return <div className="analysis-panel analysis-media">
    <div className="analysis-panel-head"><h2>01 / {fr ? "IMPORTER UN AUDIO OU UNE VIDÉO" : "IMPORT AUDIO OR VIDEO"}</h2><span>MP3 / MP4 / M4A / WEBM</span></div>
    <p>{fr ?
      "Choisis ton enregistrement. Le fichier est envoyé dans un stockage privé, transcrit par IA, puis supprimé du stockage temporaire après traitement." :
      "Select your recording. The file is uploaded to private temporary storage, transcribed by AI, then removed after processing."}</p>
    <label className="analysis-media-drop">
      <span aria-hidden="true">⬆</span>
      <strong>{fr ? "CHOISIR UN ENREGISTREMENT" : "SELECT RECORDING"}</strong>
      <small>{fr ? "Enregistrement compressé : 24 Mo maximum" : "Compressed media: 24 MB maximum"} · {(MAX_MEDIA_BYTES / 1000000).toFixed(0)} MB</small>
      <input aria-label={fr ? "Sélectionner un audio ou une vidéo" : "Select audio or video"} type="file"
        accept=".mp3,.mp4,.m4a,.mpeg,.mpga,.wav,.webm,.ogg,.flac,audio/*,video/mp4,video/webm" onChange={select} disabled={phase!=="idle"}/>
    </label>
    {file && <>
      <div className="analysis-media-filename"><strong>{file.name}</strong><span>{(file.size/1000000).toFixed(1)} MB</span></div>
      {preview && (isVideo ?
        <video className="analysis-media-player" controls preload="metadata" src={preview} aria-label={fr ? "Aperçu vidéo local" : "Local video preview"}/> :
        <audio className="analysis-media-audio" controls preload="metadata" src={preview} aria-label={fr ? "Aperçu audio local" : "Local audio preview"}/>)}
      <button type="button" className="analysis-primary" onClick={transcribe} disabled={!consent || phase!=="idle"}>
        {phase==="upload" ? (fr ? `ENVOI PRIVÉ… ${progress}%` : `PRIVATE UPLOAD… ${progress}%`) :
        phase==="transcribe" ? (fr ? "TRANSCRIPTION IA EN COURS…" : "AI TRANSCRIPTION RUNNING…") :
        (fr ? "✦ TRANSCRIRE CET ENREGISTREMENT" : "✦ TRANSCRIBE RECORDING")}
      </button>
      {!consent && <p className="analysis-note">{fr ? "Coche l’autorisation IA sous la transcription avant de poursuivre." : "Check AI authorization below before proceeding."}</p>}
    </>}
    {done && <p className="analysis-media-ok" role="status">{fr ? "Transcription terminée. Vérifie le texte ci-dessous, puis lance l’analyse des moments forts." : "Transcription complete. Review the text below, then analyze highlights."}</p>}
    {!!segments.length && <details className="analysis-media-segments"><summary>{fr ? `Voir les ${segments.length} segments horodatés (intervenants anonymes)` : `Show ${segments.length} timestamped segments (anonymous speakers)`}</summary>
      {segments.map((s,i)=><p key={i}><b>{Math.floor(s.start/60)}:{String(Math.floor(s.start%60)).padStart(2,"0")} · {s.speaker}</b> {s.text}</p>)}
    </details>}
    {error && <p role="alert" className="analysis-error">{error}</p>}
    <p className="analysis-note">{fr ?
      "Limite initiale : 24 Mo et environ 5–15 minutes selon la compression. Les gros fichiers vidéo nécessiteront une extraction audio ou un traitement par segments dans une prochaine version." :
      "Initial limit: 24 MB, typically 5–15 minutes if compressed. Larger videos will need audio extraction or chunk processing in a future version."}</p>
  </div>;
}
