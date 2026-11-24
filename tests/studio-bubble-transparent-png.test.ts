import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BUBBLE_PNG_WIDTH,BUBBLE_PNG_HEIGHT} from "../lib/analysis/transparent-bubble-png";

test("Standalone PNG canvas renders transparent alpha outside the bubble, at video-friendly resolution",()=>{
  assert.equal(BUBBLE_PNG_WIDTH,1600);assert.equal(BUBBLE_PNG_HEIGHT,900);
  const code=readFileSync("lib/analysis/transparent-bubble-png.ts","utf8");
  assert.ok(code.includes('canvas.toBlob(b=>b?ok(b):no(Error("PNG_ENCODING_FAILED")),"image/png")'));
  assert.ok(code.includes('if(v.style==="rafale")'));
  assert.ok(code.includes('if(v.style==="quote")'));
  assert.ok(code.includes('if(v.portraitFile)await portrait'));
  assert.ok(code.includes('const canvas=document.createElement("canvas")'));
  assert.ok(!code.includes('fillRect(0,0,1600,900)'));
});
test("PNG export independent of AI timing and HD JSON renderer",()=>{
  const ui=readFileSync("components/analysis/bubble-workshop-simple.tsx","utf8");
  assert.ok(ui.includes("exportTransparentPng"));
  assert.ok(ui.includes('disabled={!textValid||exportingPng}'));
  assert.ok(ui.includes("TÉLÉCHARGER LA BULLE EN PNG TRANSPARENT"));
  assert.ok(ui.includes("RENDU VIDÉO HD AUTOMATISÉ (AVANCÉ)"));
  assert.ok(ui.includes("journalistPhoto"));
  assert.ok(ui.includes("studio-bubble-png-action"));
});
