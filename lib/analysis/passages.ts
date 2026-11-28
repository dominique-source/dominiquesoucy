/**
 * Deterministic source passages for AI editorial ranking.
 * Never ask a model to recreate a quotation from memory: each ID maps to
 * an exact, unmodified span of the user's transcript.
 */
export const MAX_ANALYSIS_MOMENTS = 20;
export type SourcePassage = { id: number; text: string };

export function sourcePassages(transcript: string): SourcePassage[] {
  const candidates: string[] = [];
  for (const paragraph of transcript.split(/\n+/)) {
    let start = -1;
    let end = 0;
    let sentenceEnd = 0;
    for (const word of paragraph.matchAll(/\S+/g)) {
      if (start >= 0 && word.index + word[0].length - start > 330) {
        const boundary = sentenceEnd - start >= 100 ? sentenceEnd : end;
        candidates.push(paragraph.slice(start, boundary));
        const remaining = paragraph.slice(boundary, end).search(/\S/);
        start = remaining >= 0 ? boundary + remaining : -1;
        sentenceEnd = 0;
      }
      if (start < 0) start = word.index;
      end = word.index + word[0].length;
      if (/[.!?。！？]$/.test(word[0])) sentenceEnd = end;
    }
    if (start >= 0) candidates.push(paragraph.slice(start, end));
  }
  return candidates.filter(text => text.length >= 24)
    .slice(0, 160).map((text, i) => ({ id: i + 1, text }));
}

export function groundedMoments(
  passages: SourcePassage[],
  moments: Array<{passage_id: number; title: string; rationale: string; model_id: number}>,
) {
  const byId = new Map(passages.map(p => [p.id, p.text]));
  const seen = new Set<number>();
  return moments.flatMap(m => {
    const excerpt = byId.get(m.passage_id);
    if (!excerpt || seen.has(m.passage_id)) return [];
    seen.add(m.passage_id);
    return [{ title: m.title, excerpt, rationale: m.rationale, model_id: m.model_id }];
  }).slice(0, MAX_ANALYSIS_MOMENTS);
}
