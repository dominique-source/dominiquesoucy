import test from "node:test";
import assert from "node:assert/strict";
import { matchEnvelopes, interpolateEnvelope, scanRegionStart, SYNC_RATE } from "../lib/analysis/auto-sync";

const pseudoRandom=(seed:number)=>{
  let x=seed>>>0;
  return ()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296};
};
test("matches the same source sound delayed in a camera by +4.5s",()=>{
  const rand=pseudoRandom(42),original=Array.from({length:900},()=>Math.pow(rand(),3));
  const delayed=[...Array(90).fill(0),...original.slice(0,810)];
  const result=matchEnvelopes(original,delayed);
  assert.ok(Math.abs(result.lagSeconds-4.5)<.08,JSON.stringify(result));
  assert.equal(result.confidence,"strong");
});
test("matches early camera sound with a negative project offset",()=>{
  const rand=pseudoRandom(17),original=Array.from({length:900},()=>Math.pow(rand(),3));
  const earlier=[...original.slice(50),...Array(50).fill(0)];
  const result=matchEnvelopes(original,earlier);
  assert.ok(Math.abs(result.lagSeconds+2.5)<.08,JSON.stringify(result));
  assert.equal(result.confidence,"strong");
});
test("rejects silence and unrelated sounds as unreliable",()=>{
  const rand=pseudoRandom(3),rand2=pseudoRandom(1023);
  const original=Array.from({length:900},()=>rand());
  const unrelated=Array.from({length:900},()=>rand2());
  assert.equal(matchEnvelopes(original,Array(900).fill(0)).confidence,"unreliable");
  assert.equal(matchEnvelopes(original,unrelated).confidence,"unreliable");
  assert.equal(matchEnvelopes(original.slice(0,40),unrelated.slice(0,40)).confidence,"unreliable");
});
test("sample interpolation stays aligned to a common audio timeline",()=>{
  const samples=[{at:0,level:0},{at:1,level:1},{at:2,level:0}];
  const envelope=interpolateEnvelope(samples,2,SYNC_RATE);
  assert.equal(envelope.length,2*SYNC_RATE);
  assert.ok(Math.abs(envelope[10]-.5)<1e-8);
});

test("clap search targets beginning, middle and end without exceeding recording",()=>{
  assert.equal(scanRegionStart(600,"start"),0);
  assert.equal(scanRegionStart(600,"middle"),278);
  assert.equal(scanRegionStart(600,"end"),555);
  assert.equal(scanRegionStart(25,"end"),0);
  assert.equal(scanRegionStart(Number.NaN,"end"),0);
});
test("late clap offset stays absolute when scan windows start at different times",()=>{
  const rand=pseudoRandom(741);
  const base=Array.from({length:880},()=>Math.pow(rand(),3));
  const delayed=[...Array(30).fill(0),...base.slice(0,850)];
  const match=matchEnvelopes(base,delayed);
  const absolute=match.lagSeconds + (556-553);
  assert.ok(Math.abs(absolute-4.5)<.08,JSON.stringify({match,absolute}));
  assert.equal(match.confidence,"strong");
});
