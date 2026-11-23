import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {freshProject} from "../lib/analysis/project";
import {defaultChroma} from "../lib/analysis/chroma-key";
import {clockFromSeconds,buildPremiereCutRows,buildPremiereCutCsv,buildPremiereEditBrief} from "../lib/analysis/premiere-handoff";

test("Premiere reference clocks are elapsed milliseconds, not guessed 29.97fps frame timecode",()=>{
  assert.equal(clockFromSeconds(73.123),"00:01:13.123");
  assert.equal(clockFromSeconds(600),"00:10:00.000");
  assert.throws(()=>clockFromSeconds(-0.3),/INVALID_TIMESTAMP/);
});
test("Premiere cut list clearly marks missing timestamps and escapes spreadsheet formulas",()=>{
  const p=freshProject();
  p.timeline.duration=600;
  p.capsules=[
    {id:"11111111-2222-4333-8444-555555555555",title:"=2+2",
     start:4.1,end:24.7,format:"16:9",style:"conversation",caption:"A",bubble:"B",
     background:"dark",keying:{...defaultChroma},textPosition:"bottom",status:"draft"},
    {id:"21111111-2222-4333-8444-555555555555",title:"Unmatched",
     start:0,end:0,format:"9:16",style:"quote",caption:"",bubble:"",
     background:"dark",keying:{...defaultChroma},textPosition:"bottom",status:"draft",timingSource:"unmatched"},
  ];
  const rows=buildPremiereCutRows(p);
  assert.equal(rows[0].startClock,"00:00:04.100");
  assert.equal(rows[0].endClock,"00:00:24.700");
  assert.equal(rows[0].timingStatus,"VERIFIED_RANGE");
  assert.equal(rows[1].timingStatus,"REVIEW");
  const csv=buildPremiereCutCsv(p);
  assert.match(csv,/^\uFEFF/);
  assert.ok(csv.includes("'=2+2"));
  assert.ok(csv.includes("REVIEW"));
  const brief=buildPremiereEditBrief(p);
  assert.match(brief,/PAS un fichier de séquence Premiere importable/);
});
test("Primary Studio uses four large buttons and does not launch browser rendering on entry",()=>{
  const studio=readFileSync("components/analysis/production-studio.tsx","utf8");
  assert.ok(studio.includes("studio-simple-steps"));
  assert.ok(studio.includes('showTechnicalMontage&&activeSection==="editing"'));
  assert.ok(studio.includes("studio-simple-production"));
  assert.ok(studio.includes("renderer"));
});
