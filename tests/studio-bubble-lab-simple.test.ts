import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("One-file Premiere import is front and center; advanced multicam stays outside capsule lab",()=>{
 const studio=readFileSync("components/analysis/production-studio.tsx","utf8");
 assert.ok(studio.includes("studio-premiere-master"));
 assert.ok(studio.includes("choosePremiereMaster"));
 assert.ok(studio.includes("studio-master-dropzone"));
 assert.ok(studio.includes('showTechnicalMontage&&activeSection==="advanced"'));
 assert.ok(studio.includes("BubbleWorkshopSimple"));
 assert.ok(!studio.includes("<CapsuleWorkshop"));
});
test("One Analyze action transcribes and creates proposed capsules without exposing time fields",()=>{
 const studio=readFileSync("components/analysis/production-studio.tsx","utf8");
 const workshop=readFileSync("components/analysis/bubble-workshop-simple.tsx","utf8");
 assert.ok(studio.includes("analyzeTranscriptText(transcript"));
 assert.ok(studio.includes("createDraftsFromAnalysis(prepared)"));
 assert.ok(studio.includes("TRANSCRIRE, ANALYSER ET CRÉER MES CAPSULES"));
 assert.ok(studio.includes('activeSection==="import"&&(files.audio||hasTimedTranscript)&&analysisAction'));
 assert.ok(workshop.includes("studio-bubble-gallery"));
 assert.ok(workshop.includes('keying:{...defaultChroma,enabled:false}'));
 assert.ok(workshop.includes("<details"));
 assert.ok(workshop.includes("timeValid"));
 assert.ok(workshop.includes("textValid"));
 assert.ok(workshop.includes('questionAttribution'));
 assert.ok(workshop.includes("render instructions")||workshop.includes("rendering instructions"));
});
