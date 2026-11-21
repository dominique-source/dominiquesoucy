import { z } from "zod";
export const topics = [
  { id: "sport", fr: "Sport", en: "Sport" },
  { id: "societe", fr: "Société", en: "Society" },
  { id: "humain", fr: "Humain", en: "Human" },
  { id: "communaute", fr: "Communauté", en: "Community" },
  { id: "leadership", fr: "Leadership", en: "Leadership" },
  { id: "jeunesse", fr: "Jeunesse", en: "Youth" },
  { id: "purinstinct", fr: "PürInstinct", en: "PürInstinct" },
];
export const MAX_BYTES = Math.min(
  3_000_000,
  Math.max(100000, Number(process.env.QUESTIONS_MAX_BYTES) || 3_000_000),
);
export const limits = {
  audio: Math.min(120, Number(process.env.QUESTIONS_AUDIO_SECONDS) || 60),
  video: Math.min(60, Number(process.env.QUESTIONS_VIDEO_SECONDS) || 30),
  maxBytes: MAX_BYTES,
};
export const questionInput = z.object({
  question: z.string().trim().min(10).max(280),
  context: z.string().trim().max(3000).default(""),
  author: z.string().trim().max(40).default(""),
  topic: z.string().regex(/^[a-z0-9-]{1,40}$/),
  format: z.enum(["text", "audio", "video"]),
  transcript: z.string().trim().max(6000).default(""),
  publishConsent: z.literal(true),
  reuseConsent: z.boolean(),
  nonce: z.string().max(200),
  website: z.literal(""),
  submissionId: z.uuid(),
});
export const replyInput = z.object({
  id: z.uuid(),
  text: z.string().trim().min(2).max(2000),
  author: z.string().trim().max(40).default(""),
  publishConsent: z.literal(true),
  nonce: z.string(),
  website: z.literal(""),
});
export function checkText(...values: string[]) {
  const text = values.join(" ");
  if (
    /https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/i.test(
      text,
    )
  )
    throw new Error("PERSONAL_DATA_OR_LINK");
  if (
    /\b(?:je vais te tuer|i will kill you|child sexual abuse material|pornographie infantile)\b/i.test(
      text,
    )
  )
    throw new Error("UNSAFE_TEXT");
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))
    throw new Error("UNSAFE_TEXT");
}
export type Question = {
  id: string;
  title: string;
  context: string;
  author: string;
  topic: string;
  format: "text" | "audio" | "video";
  transcript: string;
  created_at: number;
  reactions: number;
  replies: number;
  reacted: boolean;
  own: boolean;
  media_id: string | null;
  duration: number | null;
  mime: string | null;
  media_width: number | null;
  media_height: number | null;
};
export type Category = { id: string; fr: string; en: string; count: number };
export type Reply = {
  id: string;
  author: string;
  text: string;
  created_at: number;
};
export type Curated = Question & {
  notes: string;
  stage: "todo" | "selected" | "used" | "archived";
  hidden: number;
  reuse_consent: number;
  report_count: number;
  reports: { reason: string; detail: string }[];
};
export type Show = { title: string; revision: number; items: string[] };
