import type { AnalysisResult } from "./schema";

/** Never present a model-generated quote unless it is an exact substring of the source. */
export function verifiedMoments(transcript: string, moments: AnalysisResult["moments"]) {
  return moments.filter((moment) =>
    moment.excerpt.length >= 12 && transcript.includes(moment.excerpt)
  );
}
