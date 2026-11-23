import test from "node:test";
import assert from "node:assert/strict";
import {findQuotedRange,toProjectRange} from "../lib/analysis/timed-excerpts";

const transcript="Le sport est une forme d'art et il transforme la société aujourd'hui.";
const words=transcript.split(" ").map((word,i)=>({
  word,start:i*.5,end:(i+1)*.5,
}));

test("uses authentic word boundaries for a grounded passage",()=>{
  const range=findQuotedRange("une forme d’art et il transforme",words);
  assert.deepEqual(range,{start:1.5,end:4.5});
});
test("does not manufacture timestamps for missing words",()=>{
  assert.equal(findQuotedRange("une citation totalement absente",words),null);
});
test("rejects ambiguous repeated passages",()=>{
  const duplicate=[...words,...words.map(w=>({...w,start:w.start+20,end:w.end+20}))];
  assert.equal(findQuotedRange("Le sport est une forme",duplicate),null);
});
test("converts original audio times into common project time",()=>{
  assert.deepEqual(toProjectRange({start:3,end:7},2,20),{start:.8,end:5.2});
  assert.equal(toProjectRange({start:3,end:7},2,0),null);
});
