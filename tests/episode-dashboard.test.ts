import test from "node:test";
import assert from "node:assert/strict";
import { freshProject, episodeCode, eventFor, projectSchema, capsuleSchema } from "../lib/analysis/project";

test("season and episode identifiers render with fixed-width numbers",()=>{
 assert.equal(episodeCode(1,1),"S001 · E001");
 assert.equal(episodeCode(2,17),"S002 · E017");
});
test("new projects have a saved episode identity and incident history",()=>{
 const p=freshProject();
 assert.equal(p.season,1);assert.equal(p.episode,1);
 assert.deepEqual(p.events,[]);assert.deepEqual(p.capsules,[]);
 assert.equal(projectSchema.safeParse(p).success,true);
});
test("existing projects without episode details load with safe default metadata",()=>{
 const p=freshProject();
 const {season,episode,recordingDate,stage,events,capsules,selectedCapsuleId,...legacy}=p;
 const r=projectSchema.safeParse(legacy);
 assert.equal(r.success,true);
 if(r.success){
  assert.equal(r.data.season,1);assert.equal(r.data.episode,1);
  assert.equal(r.data.capsules.length,0);
 }
});
test("capsule drafts and export incidents are validated",()=>{
 const c={id:crypto.randomUUID(),title:"Citation",start:0,end:40,format:"9:16",
  style:"conversation",caption:"Le sport est un art",bubble:"Et pourquoi ?",background:"dark",textPosition:"bottom",status:"draft"};
 assert.equal(capsuleSchema.safeParse(c).success,true);
 assert.equal(capsuleSchema.safeParse({...c,background:"unknown"}).success,false);
 const event=eventFor("export","Erreur MP4 locale","failure");
 assert.equal(event.status,"failure");assert.equal(event.type,"export");
});
