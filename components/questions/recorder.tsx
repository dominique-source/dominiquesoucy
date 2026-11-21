"use client";
import { requestCapture } from "@/lib/questions/capture";
import { useEffect, useRef, useState } from "react";
export function QuestionRecorder({
  kind,
  fr,
  maxSeconds,
  maxBytes,
  file,
  onFile,
}: {
  kind: "audio" | "video";
  fr: boolean;
  maxSeconds: number;
  maxBytes: number;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  const [requesting, setRequesting] = useState(false);
  const captureAbort = useRef<AbortController | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const tracks = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const alive = useRef(true);
  const previewURL = useRef("");
  function chooseFile(value: File | null) {
    if (previewURL.current) URL.revokeObjectURL(previewURL.current);
    previewURL.current = value ? URL.createObjectURL(value) : "";
    setPreview(previewURL.current);
    onFile(value);
  }
  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      captureAbort.current?.abort();
      if (timer.current) clearInterval(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      if (previewURL.current) URL.revokeObjectURL(previewURL.current);
      tracks.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
    tracks.current?.getTracks().forEach((t) => t.stop());
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    setStream(null);
  }
  async function start() {
    setError("");
    setRequesting(true);
    chooseFile(null);
    setPreview("");
    setSeconds(0);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error("UNSUPPORTED");
      captureAbort.current = new AbortController();
      const s = await requestCapture(
        navigator.mediaDevices,
        {
          audio: { echoCancellation: true },
          video:
            kind === "video"
              ? {
                  width: { ideal: 640 },
                  height: { ideal: 360 },
                  frameRate: { ideal: 20 },
                }
              : false,
        },
        captureAbort.current.signal,
      );
      setRequesting(false);
      if (!alive.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      tracks.current = s;
      setStream(s);
      const candidates =
        kind === "video"
          ? ["video/webm;codecs=vp8,opus", "video/mp4"]
          : ["audio/webm;codecs=opus", "audio/mp4"];
      const mime = candidates.find((m) => MediaRecorder.isTypeSupported(m));
      const r = new MediaRecorder(s, {
        ...(mime ? { mimeType: mime } : {}),
        videoBitsPerSecond: 450000,
        audioBitsPerSecond: 64000,
      });
      recorder.current = r;
      const chunks: Blob[] = [];
      let size = 0;
      const now = performance.now();
      r.ondataavailable = (e) => {
        if (e.data.size) {
          chunks.push(e.data);
          size += e.data.size;
          if (size > maxBytes && r.state === "recording") stop();
        }
      };
      r.onerror = () => {
        if (alive.current) {
          setError(
            fr
              ? "Enregistrement interrompu. Vérifie ton périphérique."
              : "Recording interrupted. Check your device.",
          );
          stop();
        }
      };
      r.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        if (!alive.current) return;
        setRecording(false);
        setStream(null);
        if (timer.current) clearInterval(timer.current);
        if (size > maxBytes) {
          setError(
            fr
              ? "Fichier trop volumineux. Enregistre une question plus courte."
              : "File too large. Record a shorter question.",
          );
          return;
        }
        const type = r.mimeType || mime || `${kind}/webm`;
        chooseFile(
          new File(
            chunks,
            `question.${type.includes("mp4") ? "mp4" : "webm"}`,
            { type },
          ),
        );
      };
      s.getTracks().forEach(
        (t) =>
          (t.onended = () => {
            if (r.state === "recording") {
              setError(
                fr
                  ? "Le périphérique a été déconnecté. Vérifie l’aperçu avant publication."
                  : "Device disconnected. Check the preview before publishing.",
              );
              stop();
            }
          }),
      );
      r.start(250);
      setRecording(true);
      timer.current = setInterval(() => {
        const elapsed = Math.floor((performance.now() - now) / 1000);
        setSeconds(elapsed);
        if (elapsed >= maxSeconds) stop();
      }, 250);
    } catch (e) {
      if (!alive.current) return;
      setRequesting(false);
      tracks.current?.getTracks().forEach((t) => t.stop());
      setError(
        e instanceof Error && e.message === "CAPTURE_PERMISSION_TIMEOUT"
          ? fr
            ? "Autorisation non confirmée. Vérifie les réglages du navigateur ou choisis un fichier."
            : "Permission was not confirmed. Check browser settings or choose a file."
          : e instanceof Error && e.name === "NotAllowedError"
            ? fr
              ? "Permission refusée. Tu peux autoriser le périphérique dans ton navigateur ou choisir un fichier."
              : "Permission denied. Allow the device in your browser or choose a file."
            : fr
              ? "Micro ou caméra indisponible. Choisis un fichier compatible."
              : "Microphone or camera unavailable. Choose a compatible file.",
      );
    }
  }
  return (
    <div className="q-recorder">
      <p>
        {fr
          ? "Capture uniquement après ton action. Rien n’est envoyé avant Publier."
          : "Capture starts only when you choose. Nothing is uploaded before Publish."}{" "}
        {maxSeconds}s · {Math.floor(maxBytes / 1000000)} Mo max.
      </p>
      {stream && kind === "video" && (
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          aria-label={fr ? "Aperçu caméra en direct" : "Live camera preview"}
        />
      )}
      <div className="q-inline">
        <button type="button" onClick={() => void start()} disabled={recording}>
          {requesting
            ? fr
              ? "Autorisation…"
              : "Requesting permission…"
            : file
              ? fr
                ? "Recommencer"
                : "Record again"
              : fr
                ? "Enregistrer"
                : "Record"}
        </button>
        <button type="button" onClick={stop} disabled={!recording}>
          {fr ? "Arrêter" : "Stop"} ■
        </button>
        <output aria-live="polite">
          {seconds} / {maxSeconds}s
        </output>
      </div>
      {file &&
        preview &&
        (kind === "audio" ? (
          <audio
            controls
            src={preview}
            aria-label={
              fr ? "Écouter mon enregistrement" : "Preview my recording"
            }
          />
        ) : (
          <video
            controls
            playsInline
            src={preview}
            aria-label={
              fr ? "Prévisualiser mon enregistrement" : "Preview my recording"
            }
          />
        ))}
      <label>
        {fr
          ? "Ou choisir un fichier compatible"
          : "Or choose a compatible file"}
        <input
          type="file"
          disabled={recording}
          accept={
            kind === "video"
              ? "video/mp4,video/webm"
              : "audio/mpeg,audio/wav,audio/webm,audio/mp4,audio/ogg"
          }
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && f.size <= maxBytes) {
              setError("");
              chooseFile(f);
            } else if (f)
              setError(fr ? "Fichier trop volumineux." : "File too large.");
          }}
        />
      </label>
      <p role="alert" className="q-error">
        {error}
      </p>
    </div>
  );
}
