import test from "node:test";
import assert from "node:assert/strict";
import { studioBackgrounds,randomBackdrop,resolveBackdrop,detectSportsBackdrop } from "../lib/analysis/studio-backdrops";
import { freshProject,projectSchema } from "../lib/analysis/project";

test("all six requested sport themes exist without multisport",()=>{
 assert.deepEqual(studioBackgrounds.map(x=>x.id),
   ["basketball","athletisme","hockey","soccer","tennis","football"]);
});
test("random selection is stable for the same episode",()=>{
 assert.equal(randomBackdrop("episode-001").id,randomBackdrop("episode-001").id);
});
test("manual choice always overrides subject",()=>{
 const p={mode:"manual" as const,selectedId:"hockey" as const};
 assert.equal(resolveBackdrop(p,"episode-001","NBA basketball").id,"hockey");
});
test("topic choice honors recognizable sport and falls back to stable random",()=>{
 assert.equal(detectSportsBackdrop("Une conférence sur le hockey québécois"),"hockey");
 assert.equal(detectSportsBackdrop("Basket NBA et PürInstinct"),"basketball");
 assert.equal(detectSportsBackdrop("La NFL et la CFL"),"football");
 assert.equal(detectSportsBackdrop("Le tennis à Roland Garros"),"tennis");
 const p={mode:"topic" as const,selectedId:"hockey" as const};
 assert.equal(resolveBackdrop(p,"episode-001","le rôle de la société").id,randomBackdrop("episode-001").id);
});
test("existing projects read safe default and persist selection",()=>{
 const project=freshProject();
 const old={...project};
 delete (old as Partial<typeof old>).studioBackdrop;
 const parsed=projectSchema.parse(old);
 assert.equal(parsed.studioBackdrop.mode,"random");
 const chosen=projectSchema.parse({...project,studioBackdrop:{mode:"manual",selectedId:"soccer"}});
 assert.equal(chosen.studioBackdrop.selectedId,"soccer");
});
