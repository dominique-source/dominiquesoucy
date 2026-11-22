import test from "node:test";
import assert from "node:assert/strict";
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
