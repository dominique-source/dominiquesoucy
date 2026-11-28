import { MAX_ANALYSIS_MOMENTS, sourcePassages } from "./passages";
import type { StudioProject } from "./project";
import type { AnalysisResult } from "./schema";
import { findQuotedRange, toProjectRange } from "./timed-excerpts";

export function localExcerptAnalysis(project: StudioProject, fr: boolean): AnalysisResult {
  const matched = sourcePassages(project.transcript).flatMap(({ text }) => {
    const range = findQuotedRange(text, project.timedWords);
    return range && toProjectRange(range, project.timeline.offsets.audio, project.timeline.duration)
      ? [{ text, start: range.start }]
      : [];
  });
  const count = Math.min(MAX_ANALYSIS_MOMENTS, matched.length);
  const rationale = fr ? "Passage repéré dans la transcription. À valider au montage."
    : "Passage found in the transcript. Review it in the editor.";
  const moments = Array.from({ length: count }, (_, index) => {
    const { text, start } = matched[count === 1 ? 0 : Math.round(index * (matched.length - 1) / (count - 1))];
    const seconds = Math.floor(start);
    const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    return { title: `${fr ? "Extrait" : "Clip"} ${time} · ${text.slice(0, 70)}`,
      excerpt: text, rationale, model_id: 4 };
  });
  return {
    synopsis: fr ? `${moments.length} passages repérés sans IA. Vérifie leur intérêt et leurs coupes.`
      : `${moments.length} passages found without AI. Review their content and cuts.`,
    themes: [],
    editorial_cautions: [rationale],
    moments,
  };
}
