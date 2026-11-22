import test from "node:test";
import assert from "node:assert/strict";
import { capsuleModels, formats } from "../lib/analysis/catalog";
import { analysisInput, analysisResult } from "../lib/analysis/schema";
import { verifiedMoments } from "../lib/analysis/verify";

test("all twelve models have unique IDs, and three supported output formats", () => {
  assert.deepEqual(capsuleModels.map((m) => m.id), Array.from({ length: 12 }, (_, i) => i + 1));
  assert.equal(new Set(capsuleModels.map((m) => m.title)).size, 12);
  assert.deepEqual([...formats], ["16:9", "9:16", "1:1"]);
});

test("transcripts require explicit consent, language and limits", () => {
  const base = { transcript: "x".repeat(100), lang: "fr", consent: true };
  assert.equal(analysisInput.safeParse(base).success, true);
  assert.equal(analysisInput.safeParse({ ...base, consent: false }).success, false);
  assert.equal(analysisInput.safeParse({ ...base, transcript: "x".repeat(99) }).success, false);
  assert.equal(analysisInput.safeParse({ ...base, transcript: "x".repeat(26001) }).success, false);
  assert.equal(analysisInput.safeParse({ ...base, lang: "de" }).success, false);
  assert.equal(analysisInput.safeParse({ ...base, secret: "extra" }).success, false);
});

test("analysis result requires modeled moments with valid IDs and fields", () => {
  const valid = { synopsis: "Résumé", themes: ["Sport"], editorial_cautions: [], moments: [
    { title: "Moment", excerpt: "Un passage original vraiment important", rationale: "Pertinent", model_id: 4 },
  ] };
  assert.equal(analysisResult.safeParse(valid).success, true);
  assert.equal(analysisResult.safeParse({ ...valid, moments: [{ ...valid.moments[0], model_id: 13 }] }).success, false);
  assert.equal(analysisResult.safeParse({ ...valid, moments: [{ ...valid.moments[0], fake: true }] }).success, false);
});

test("never show a fabricated, altered or too-short quote as a verified excerpt", () => {
  const transcript = "Dominique : On doit commencer par l’éducation, la santé et les infrastructures.";
  const valid = { title: "Base", excerpt: "On doit commencer par l’éducation, la santé et les infrastructures.", rationale: "L'essentiel", model_id: 4 };
  const fabricated = { ...valid, excerpt: "Une citation totalement inventée de Dominique" };
  const short = { ...valid, excerpt: "On doit" };
  assert.deepEqual(verifiedMoments(transcript, [valid, fabricated, short]), [valid]);
});

test("reconstructed press questions remain clearly labeled as hypothetical and persist", async()=>{
  const {freshProject,projectSchema}=await import("../lib/analysis/project");
  const p=freshProject();
  p.reconstructedQuestions=[{
    id:crypto.randomUUID(),question:"Pourquoi remets-tu le sport en question?",
    journalist:0,answerExcerpt:"On doit commencer par l'éducation et la santé.",
    label:"QUESTION_RECONSTRUITE_NON_ORIGINALE",
  }];
  assert.equal(projectSchema.safeParse(p).success,true);
  assert.equal(projectSchema.safeParse({...p,reconstructedQuestions:[
    {...p.reconstructedQuestions[0],label:"VRAIE_QUESTION"}
  ]}).success,false);
});
