import test from "node:test";
import assert from "node:assert/strict";
import { localExcerptAnalysis } from "../lib/analysis/local-excerpt-analysis";
import { createDraftsFromAnalysis } from "../lib/analysis/capsule-drafts";
import { freshProject, projectSchema } from "../lib/analysis/project";
import { sourcePassages, groundedMoments } from "../lib/analysis/passages";

test("candidate passages use verbatim original transcript, without rewriting quotations", () => {
  const transcript = [
    "Pour moi, le sport est une forme d'art qui sert à connecter les gens.",
    "Je suis allé en Ouganda et cette expérience a profondément changé ma façon de voir le sport.",
    "Il est essentiel de développer l'autonomie chez les jeunes sportifs, pas seulement la performance."
  ].join(" ");
  const passages = sourcePassages(transcript);
  assert.ok(passages.length >= 1);
  for (const p of passages) {
    assert.ok(transcript.includes(p.text));
    assert.ok(p.text.length >= 24);
  }
  const first = passages[0];
  const moments = groundedMoments(passages, [
    { passage_id: first.id, title: "Sport et société", rationale: "Thème central", model_id: 11 },
    { passage_id: first.id, title: "Double", rationale: "Should be removed", model_id: 4 },
    { passage_id: 99999, title: "Inventé", rationale: "Should be removed", model_id: 4 }
  ]);
  assert.equal(moments.length, 1);
  assert.equal(moments[0].excerpt, first.text);
});

test("long unpunctuated monologue yields word-aligned source excerpts", () => {
  const transcript = Array.from({length: 150},(_,i)=>`Le sport aide les gens à mieux vivre ensemble numéro ${i}`).join(" ");
  const passages = sourcePassages(transcript);
  assert.ok(passages.length > 2);
  for (const p of passages) assert.ok(transcript.includes(p.text));
});


test("a long timestamped transcript can produce and save 20 distinct drafts without AI", () => {
  const project = freshProject();
  const words = Array.from({ length: 1872 }, (_, index) => ({
    word: index % 12 === 11 ? `passage${index}.` : `mot${index}`,
    start: index * 0.3,
    end: index * 0.3 + 0.25,
  }));
  project.transcript = words.map(({ word }) => word).join("  ");
  project.timedWords = words;
  project.timeline.duration = 600;
  project.analysis = localExcerptAnalysis(project, true);
  const drafts = createDraftsFromAnalysis(project);
  assert.equal(drafts.length, 20);
  assert.ok(drafts.every(clip => clip.timingSource === "automatic" && clip.end > clip.start));
  assert.equal(new Set(drafts.map(clip => clip.start)).size, 20);
  assert.ok(project.analysis.moments.every(({ excerpt }) => project.transcript.includes(excerpt)));
  project.capsules = drafts;
  assert.equal(projectSchema.parse(project).capsules.length, 20);
  project.analysis.moments = project.analysis.moments.map((moment, index) => ({
    ...moment, title: `Nouveau titre ${index}`,
  }));
  assert.deepEqual(createDraftsFromAnalysis(project), []);
});
