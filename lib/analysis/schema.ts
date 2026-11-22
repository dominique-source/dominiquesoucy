import { z } from "zod";

export const analysisInput = z.object({
  transcript: z.string().trim().min(100).max(26000),
  lang: z.enum(["fr", "en"]),
  consent: z.literal(true),
}).strict();

export const analysisResult = z.object({
  synopsis: z.string(),
  themes: z.array(z.string()).max(8),
  editorial_cautions: z.array(z.string()).max(8),
  moments: z.array(z.object({
    title: z.string(),
    excerpt: z.string(),
    rationale: z.string(),
    model_id: z.number().int().min(1).max(12),
  }).strict()).max(8),
}).strict();
export type AnalysisResult = z.infer<typeof analysisResult>;
