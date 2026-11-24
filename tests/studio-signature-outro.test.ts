import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {freshProject} from "../lib/analysis/project";
import {buildHdRenderManifest} from "../lib/analysis/hd-render-manifest";

test("Every new HD capsule automatically selects the supplied 2-second signature by format",()=>{
 const p=freshProject();p.timeline.duration=90;
 const capsule={id:"10000000-0000-4000-8000-000000000000",title:"Extrait",start:10,end:30,
   style:"conversation" as const,caption:"Texte",bubble:"Question",background:"original" as const,
   keying:{enabled:false},textPosition:"bottom" as const,status:"draft" as const,
   format:"16:9" as const};
 for(const [format,expected] of [["16:9","signature-horizontal.mp4"],["9:16","signature-vertical.mp4"],["1:1","signature-horizontal.mp4"]] as const){
   const result=buildHdRenderManifest(p,{...capsule,format} as typeof p.capsules[number],{transparentForeground:false,reporterPortrait:false});
   assert.equal(result.outroAsset,expected);
   assert.equal(result.outroDurationSeconds,2);
 }
});
test("HD renderer extends frame count without overlapping original episode audio",()=>{
 const root=readFileSync("render-engine/src/root.tsx","utf8");
 const capsule=readFileSync("render-engine/src/capsule.tsx","utf8");
 const launcher=readFileSync("render-engine/RENDU-HD.command","utf8");
 assert.ok(root.includes("data.outroAsset?Math.round"));
 assert.ok(capsule.includes("<Sequence from={0} durationInFrames={contentFrames}>"));
 assert.ok(capsule.includes("<Sequence from={contentFrames} durationInFrames={outroFrames}>"));
 assert.ok(capsule.includes("volume={1}"));
 assert.ok(launcher.includes('public/$OUTRO'));
});
