import type { Question } from "@/lib/questions/schema";
export function QuestionMedia({
  question,
  privateView = false,
}: {
  question: Question;
  privateView?: boolean;
}) {
  if (!question.media_id) return null;
  const src = `/api/questions/media?id=${question.media_id}${privateView ? "&private=1" : ""}`;
  return question.format === "video" ? (
    <video
      style={
        question.media_width && question.media_height
          ? {
              aspectRatio: `${question.media_width} / ${question.media_height}`,
            }
          : undefined
      }
      controls
      playsInline
      preload="metadata"
      src={src}
      aria-label={question.title}
    >
      {question.transcript && <p>{question.transcript}</p>}
    </video>
  ) : (
    <audio controls preload="metadata" src={src} aria-label={question.title} />
  );
}
export function errorMessage(code: string, fr: boolean) {
  const messages: Record<string, [string, string]> = {
    DATABASE_NOT_CONFIGURED: [
      "La base communautaire attend sa configuration. Aucune fausse question n’est affichée.",
      "The community database needs configuration. No sample questions are presented as real.",
    ],
    PRIVACY_NOT_CONFIGURED: [
      "La configuration de confidentialité est requise.",
      "Privacy configuration is required.",
    ],
    RATE_LIMITED: [
      "Trop de tentatives. Patiente avant de réessayer.",
      "Too many attempts. Please wait before trying again.",
    ],
    INVALID_FORM: [
      "Le formulaire a expiré ou a été envoyé trop vite. Rouvre-le et réessaie.",
      "This form expired or was sent too quickly. Reopen it and retry.",
    ],
    PERSONAL_DATA_OR_LINK: [
      "Retire les liens et coordonnées personnelles de ton texte.",
      "Remove links and personal contact details from your text.",
    ],
    UNSAFE_TEXT: [
      "Ce texte ne peut pas être publié. Reformule ta contribution avec respect.",
      "This text cannot be published. Please rephrase respectfully.",
    ],
    MEDIA_SIZE: [
      "Fichier trop volumineux : 3 Mo maximum.",
      "File too large: maximum 3 MB.",
    ],
    MEDIA_DURATION: [
      "La durée dépasse la limite autorisée.",
      "This recording exceeds the duration limit.",
    ],
    INVALID_MEDIA: [
      "Fichier audio/vidéo incompatible ou invalide.",
      "Unsupported or invalid audio/video file.",
    ],
    MEDIA_SCAN_NOT_CONFIGURED: [
      "La publication média attend la connexion du service de sécurité automatique.",
      "Media publication requires the automated safety service.",
    ],
    MEDIA_SCAN_UNAVAILABLE: [
      "Le contrôle automatique est indisponible. Réessaie plus tard.",
      "Automated safety check unavailable. Please retry later.",
    ],
    MEDIA_STORAGE_NOT_CONFIGURED: [
      "Le stockage média n’est pas encore connecté.",
      "Media storage is not connected yet.",
    ],
    UNSAFE_MEDIA: [
      "Le contrôle de sécurité a refusé ce fichier.",
      "This file was rejected by the safety check.",
    ],
    UNAUTHORIZED: [
      "Ta session privée a expiré. Reconnecte-toi.",
      "Your private session expired. Sign in again.",
    ],
    DUPLICATE_QUESTION: [
      "Tu as déjà envoyé cette question récemment.",
      "You already submitted this question recently.",
    ],
    POSTING_PAUSED: [
      "Les publications sont temporairement suspendues.",
      "Posting is temporarily paused.",
    ],
    FEED_HIDDEN: [
      "Le fil est temporairement indisponible.",
      "The feed is temporarily unavailable.",
    ],
    CONFLICT_REFRESH: [
      "La sélection a changé dans un autre onglet. Recharge avant d’enregistrer.",
      "The selection changed in another tab. Reload before saving.",
    ],
    NOT_FOUND: [
      "Cette contribution n’est plus disponible.",
      "This contribution is no longer available.",
    ],
  };
  return (messages[code] || [
    "Opération indisponible. Vérifie ta connexion et réessaie.",
    "Operation unavailable. Check your connection and retry.",
  ])[fr ? 0 : 1];
}
export async function questionRequest(action: string, body?: unknown) {
  const r = await fetch(
    `/api/questions/${action}`,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "UNAVAILABLE");
  return data;
}
