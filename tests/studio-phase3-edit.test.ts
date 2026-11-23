import test from "node:test";
import assert from "node:assert/strict";
import { freshProject, projectSchema } from "../lib/analysis/project";
import { activeCamera, proposeMulticamCuts } from "../lib/analysis/multicam";
import { defaultChroma } from "../lib/analysis/chroma-key";

test("each capsule can store its own independently editable camera decisions",()=>{
  const p=freshProject();
  p.timeline.duration=600;
  const a=proposeMulticamCuts({start:15,end:48,available:["main","vertical","secondary"]});
  const b=proposeMulticamCuts({start:90,end:130,available:["main","secondary"]});
  p.capsules=[
    {id:crypto.randomUUID(),title:"One",start:15,end:48,format:"16:9",style:"conversation",
     caption:"",bubble:"",background:"dark",textPosition:"bottom",status:"draft",keying:{...defaultChroma},
     cameraCuts:a,cameraEditSource:"automatic"},
    {id:crypto.randomUUID(),title:"Two",start:90,end:130,format:"9:16",style:"quote",
     caption:"",bubble:"",background:"original",textPosition:"bottom",status:"draft",keying:{...defaultChroma},
     cameraCuts:b,cameraEditSource:"automatic"},
  ];
  const parsed=projectSchema.parse(p);
  assert.equal(parsed.capsules[0].cameraCuts?.length,a.length);
  assert.equal(parsed.capsules[1].cameraCuts?.length,b.length);
  assert.equal(activeCamera(a,15,"secondary"),"main");
  assert.equal(activeCamera(b,90,"vertical"),"main");
  assert.ok(a.every(c=>c.at>=15&&c.at<48));
  assert.ok(b.every(c=>c.at>=90&&c.at<130));
});
test("single camera recording prepares a usable stable edit",()=>{
  const edits=proposeMulticamCuts({start:3,end:33,available:["vertical"]});
  assert.equal(edits.length,1);
  assert.equal(edits[0].camera,"vertical");
  assert.equal(edits[0].at,3);
});
test("invalid capsule ranges never create fabricated camera decisions",()=>{
  assert.deepEqual(proposeMulticamCuts({start:20,end:20,available:["main","secondary"]}),[]);
});
