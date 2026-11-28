import { z } from "zod";
import { groundedMoments, type SourcePassage } from "./passages";
import { analysisResult } from "./schema";

const selection = analysisResult.shape.moments.element.omit({ excerpt: true }).extend({
  passage_id: z.number().int().positive(),
}).strip();

const response = z.object({
  synopsis: z.string(),
  themes: z.array(z.unknown()),
  editorial_cautions: z.array(z.unknown()),
  moments: z.array(z.unknown()),
});

function textList(items: unknown[]) {
  return items.filter((item): item is string => typeof item === "string").slice(0, 8);
}

export function parseEditorialResponse(value: unknown, passages: SourcePassage[]) {
  const parsed = response.safeParse(value);
  if (!parsed.success) return null;

  const { synopsis, themes, editorial_cautions, moments } = parsed.data;
  const validSelections = moments.flatMap(item => {
    const candidate = selection.safeParse(item);
    return candidate.success ? [candidate.data] : [];
  });
  return {
    synopsis,
    themes: textList(themes),
    editorial_cautions: textList(editorial_cautions),
    moments: groundedMoments(passages, validSelections),
    original_count: moments.length,
  };
}
