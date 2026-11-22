/**
 * Deterministic source passages for AI editorial ranking.
 * Never ask a model to recreate a quotation from memory: each ID maps to
 * an exact, unmodified span of the user's transcript.
 */
export type SourcePassage = { id: number; text: string };

export function sourcePassages(transcript: string): SourcePassage[] {
  // Boundaries are derived only from source text, never from a generated quote.
  // Prefer sentences, with a word-aligned fallback for unpunctuated transcripts.
  const paragraphs = transcript.split(/\n+/).map(v => v.trim()).filter(Boolean);
  const candidates: string[] = [];
  for (const paragraph of paragraphs) {
    const sentences = paragraph.match(/[^.!?。！？]+(?:[.!?。！？]+|$)/g) || [paragraph];
    let pending = "";
    for (const sentence of sentences) {
      const piece = sentence.trim();
      if (!piece) continue;
      if (pending.length > 0 && pending.length + piece.length + 1 > 330) {
        candidates.push(pending);
        pending = "";
      }
      if (piece.length > 330) {
        if (pending) { candidates.push(pending); pending = ""; }
        // Very long source sentences: split on words while preserving source text.
        const chunks = piece.match(/\S+(?:\s+|$)/g) || [piece];
        let part = "";
        for (const word of chunks) {
          if (part.length + word.length > 330 && part) {
            candidates.push(part.trim());
            part = "";
          }
          part += word;
        }
        if (part.trim()) pending = part.trim();
      } else {
        pending += (pending ? " " : "") + piece;
      }
    }
    if (pending) candidates.push(pending);
  }

  // Short isolated phrases should be joined to their following phrase when possible.
  const combined: string[] = [];
  for (const part of candidates) {
    const lastIndex = combined.length - 1;
    if (part.length < 55 && lastIndex >= 0 && combined[lastIndex].length + part.length < 330) {
      combined[lastIndex] += " " + part;
    } else combined.push(part);
  }
  // Each output must be an exact substring. Never reconstruct across original
  // whitespace or paragraph boundaries, even if that means dropping candidates.
  return combined.filter(text => text.length >= 24 && transcript.includes(text))
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
  }).slice(0, 8);
}
