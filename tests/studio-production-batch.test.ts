import test from "node:test";
import assert from "node:assert/strict";
import {freshProject} from "../lib/analysis/project";
import {defaultChroma} from "../lib/analysis/chroma-key";
import {createProductionPlan,renderFormat} from "../lib/analysis/production-plan";
import {outputPath,validOutputPath,outputRecordSchema} from "../lib/analysis/outputs";

test("fifteen clips and a full episode create exactly 32 distinct videos",()=>{
  const p=freshProject();
  p.timeline.duration=600;
  p.capsules=Array.from({length:15},(_,i)=>({
    id:crypto.randomUUID(),title:`Clip ${i+1}`,start:i*10,end:i*10+8,
    format:"16:9" as const,style:"conversation" as const,
    caption:"",bubble:"",background:"dark" as const,
    keying:{...defaultChroma},textPosition:"bottom" as const,status:"draft" as const,
  }));
  const jobs=createProductionPlan({
    capsules:p.capsules,selectedIds:p.capsules.map(c=>c.id),
    duration:p.timeline.duration,includeEpisode:true,formats:["horizontal","vertical"],
  });
  assert.equal(jobs.length,32);
  assert.equal(new Set(jobs.map(j=>j.id)).size,32);
  assert.equal(jobs.filter(j=>j.kind==="capsule").length,30);
  assert.equal(jobs.filter(j=>j.kind==="episode").length,2);
  assert.equal(renderFormat("horizontal"),"16:9");
  assert.equal(renderFormat("vertical"),"9:16");
});
test("skip invalid and unselected capsule ranges instead of fabricating edits",()=>{
  const p=freshProject();
  p.timeline.duration=300;
  const missing=crypto.randomUUID(),valid=crypto.randomUUID();
  p.capsules=[
    {id:missing,title:"Missing",start:0,end:0,format:"16:9",style:"classic",
      caption:"",bubble:"",background:"original",keying:{...defaultChroma},textPosition:"bottom",status:"draft"},
    {id:valid,title:"Valid",start:8,end:25,format:"16:9",style:"classic",
      caption:"",bubble:"",background:"original",keying:{...defaultChroma},textPosition:"bottom",status:"draft"},
  ];
  const jobs=createProductionPlan({capsules:p.capsules,selectedIds:[missing,valid],
    duration:300,includeEpisode:false,formats:["horizontal","horizontal"]});
  assert.equal(jobs.length,1);
  assert.equal(jobs[0].capsuleId,valid);
});
test("strict output path is project-scoped, unique and format constrained",()=>{
  const projectId=crypto.randomUUID(),id=crypto.randomUUID();
  const pathname=outputPath(projectId,id,"horizontal");
  assert.equal(validOutputPath(projectId,id,"horizontal",pathname),true);
  assert.equal(validOutputPath(crypto.randomUUID(),id,"horizontal",pathname),false);
  assert.equal(validOutputPath(projectId,id,"vertical",pathname),false);
  assert.equal(validOutputPath(projectId,id,"horizontal",pathname+"/../other.mp4"),false);
  assert.equal(outputRecordSchema.safeParse({
    id,projectId,capsuleId:null,kind:"episode",format:"horizontal",
    title:"Full episode",pathname,bytes:10000,createdAt:Date.now(),
  }).success,true);
});
