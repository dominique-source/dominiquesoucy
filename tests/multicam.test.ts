import test from "node:test";
import assert from "node:assert/strict";
import { activeCamera, cameraKeys, edl, proposeMulticamCuts, cameraShot, offsetFromClap, safeCutTime, sourceTime, timeCode, type Cut } from "../lib/analysis/multicam";

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

test("automatic starter edit uses all three cameras and preserves main shot",()=>{
 const cuts=proposeMulticamCuts({start:15,end:75,available:["main","vertical","secondary"]});
 assert.ok(cuts.length>=5);
 assert.equal(cuts[0].at,15);
 assert.equal(cuts[0].camera,"main");
 assert.ok(cuts.some(c=>c.camera==="vertical"));
 assert.ok(cuts.some(c=>c.camera==="secondary"));
 assert.ok(cuts.every(c=>c.at>=15&&c.at<75));
 assert.equal(activeCamera(cuts,16,"secondary"),"main");
});
test("starter edit supports one camera and short clips",()=>{
 const single=proposeMulticamCuts({start:10,end:35,available:["vertical"]});
 assert.equal(single.length,1);
 assert.equal(single[0].camera,"vertical");
 const short=proposeMulticamCuts({start:0,end:8,available:["main","vertical"]});
 assert.equal(short.length,1);
 assert.equal(proposeMulticamCuts({start:20,end:20,available:["main"]}).length,0);
});

test("hook uses subtle zoom and smooth release in first seconds",()=>{
 const cuts=proposeMulticamCuts({start:40,end:85,available:["main","vertical","secondary"]});
 assert.equal(cuts[0].camera,"main");
 assert.ok(cuts[0].zoomEnd!>cuts[0].zoomStart!);
 assert.ok(cuts[1].at<=42);
 assert.ok(cuts[1].zoomStart!>cuts[1].zoomEnd!);
 const early=cameraShot(cuts,40.25,"main",85);
 const later=cameraShot(cuts,41.5,"main",85);
 assert.equal(early.camera,"main");
 assert.ok(later.zoom>early.zoom);
 const release=cameraShot(cuts,42.3,"main",85);
 assert.ok(release.zoom<1.12);
});
test("all camera zooms stay restrained and persistent in edit decision list",()=>{
 const cuts=proposeMulticamCuts({start:0,end:55,available:["main","vertical","secondary"]});
 assert.ok(cuts.some(c=>c.camera==="vertical"));
 assert.ok(cuts.some(c=>c.camera==="secondary"));
 assert.ok(cuts.every(c=>c.zoomStart!>=1&&c.zoomStart!<=1.25&&c.zoomEnd!>=1&&c.zoomEnd!<=1.25));
 const result=edl({projectName:"Clip",duration:55,
  offsets:{audio:0,enhanced:0,main:0,vertical:0,secondary:0},
  cuts,sourceNames:{main:"Canon.mov",vertical:"iPhone.mov",secondary:"Samsung.mp4"},audioSource:"audio"});
 assert.equal(result.cuts.length,cuts.length);
 assert.ok(result.cuts.some(c=>c.zoomEnd!==c.zoomStart));
});
