import test from "node:test";
import assert from "node:assert/strict";
import {freshProject} from "../lib/analysis/project";
import {buildHdRenderManifest,hdManifestFilename} from "../lib/analysis/hd-render-manifest";

function fixture(){
  const project=freshProject();
  project.timeline.duration=600;
  const capsule={
    id:"11111111-2222-4333-8444-555555555555",
    title:"Réponse à la question",start:40,end:72,
    format:"9:16" as const,style:"conversation" as const,
    caption:"Une vraie phrase de la conférence",bubble:"Pourquoi en parler?",
    journalistName:"",journalistOutlet:"",
    questionAttribution:"reconstructed" as const,
    background:"dark" as const,
    keying:{enabled:false,color:"#30b7b0",tolerance:.16,softness:.12,spill:.45},
    textPosition:"bottom" as const,status:"draft" as const,
  };
  return {project,capsule};
}

test("Manifest for first capsule uses a synced master without double audio or Blob",()=>{
  const {project,capsule}=fixture();
  const m=buildHdRenderManifest(project,capsule,{transparentForeground:false,reporterPortrait:false});
  assert.equal(m.schemaVersion,1);
  assert.equal(m.start,40);assert.equal(m.end,72);
  assert.equal(m.format,"9:16");
  assert.equal(m.style,"journalist");
  assert.equal(m.masterAsset,"master.mp4");
  assert.equal(m.audioAsset,"");assert.equal(m.foregroundAsset,"");
  assert.equal(m.questionAttribution,"reconstructed");
  assert.equal(m.journalistName,"");
  assert.match(hdManifestFilename(capsule),/9x16\.json$/);
});
test("Alpha mode requests separate foreground, synchronized audio and background",()=>{
  const {project,capsule}=fixture();
  const m=buildHdRenderManifest(project,capsule,{transparentForeground:true,reporterPortrait:true});
  assert.equal(m.foregroundAsset,"foreground.mov");
  assert.equal(m.audioAsset,"audio.wav");
  assert.equal(m.backgroundAsset,"background.png");
  assert.equal(m.portraitAsset,"reporter.png");
});
test("Reject empty timecodes, invalid bounds and clips longer than ten minutes",()=>{
  const {project,capsule}=fixture();
  assert.throws(()=>buildHdRenderManifest(project,{...capsule,end:40},{transparentForeground:false,reporterPortrait:false}),/INVALID_CAPSULE_TIMECODES/);
  assert.throws(()=>buildHdRenderManifest(project,{...capsule,end:601},{transparentForeground:false,reporterPortrait:false}),/INVALID_CAPSULE_TIMECODES/);
  assert.throws(()=>buildHdRenderManifest({...project,timeline:{...project.timeline,duration:2000}},{...capsule,end:900},{transparentForeground:false,reporterPortrait:false}),/INVALID_CAPSULE_TIMECODES/);
});
