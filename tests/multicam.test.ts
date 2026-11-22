import test from "node:test";
import assert from "node:assert/strict";
import { activeCamera, cameraKeys, edl, offsetFromClap, safeCutTime, sourceTime, timeCode, type Cut } from "../lib/analysis/multicam";

test("clap calibration maps video clock to common audio timeline",()=>{
  const referenceClap=4.5;
  const canonClap=9.2;
  const offset=offsetFromClap(referenceClap,canonClap);
  assert.ok(Math.abs(offset-4.7)<0.0001);
  assert.ok(Math.abs(sourceTime(30,offset)-34.7)<0.0001);
  assert.equal(sourceTime(0,-8),0);
});
test("timeline cuts choose the last assigned camera without inventing video",()=>{
  const cuts:Cut[]=[
    {id:"a",at:0,camera:"main"},{id:"b",at:12,camera:"vertical"},
    {id:"c",at:30,camera:"secondary"}
  ];
  assert.equal(activeCamera(cuts,0,"main"),"main");
  assert.equal(activeCamera(cuts,13,"main"),"vertical");
  assert.equal(activeCamera(cuts,31,"main"),"secondary");
  assert.equal(activeCamera([],13,"main"),"main");
  assert.deepEqual(cameraKeys,["main","vertical","secondary"]);
});
test("project cut points and timecodes are bounded and human-readable",()=>{
  assert.equal(safeCutTime(-6,300),0);
  assert.equal(safeCutTime(305,300),300);
  assert.equal(safeCutTime(6.356,300),6.4);
  assert.equal(timeCode(71.8),"01:11");
});
test("export is an honest edit decision list, not an MP4",()=>{
  const result=edl({
    projectName:"Épisode 001",duration:300,
    offsets:{audio:0,enhanced:0,main:4.7,vertical:-1.1,secondary:8.4},
    cuts:[{id:"a",at:45,camera:"vertical"},{id:"b",at:5,camera:"main"}],
    sourceNames:{main:"Canon.MOV",vertical:"iPhone.MOV",secondary:"Samsung.mp4",audio:"Samsung.m4a"},
    audioSource:"audio"
  });
  assert.equal(result.status,"PREVIEW_ONLY_NOT_RENDERED");
  assert.deepEqual(result.cuts.map(x=>x.atSeconds),[5,45]);
  assert.equal(result.sources.main,"Canon.MOV");
});
