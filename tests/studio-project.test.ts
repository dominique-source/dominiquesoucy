import test from "node:test";
import assert from "node:assert/strict";
import { freshProject, MAX_PROJECT_MEDIA_BYTES, projectSchema, validProjectMedia, validProjectMediaPath } from "../lib/analysis/project";

test("new production project has ordered production state and editable timeline",()=>{
  const p=freshProject();
  assert.equal(projectSchema.safeParse(p).success,true);
  assert.equal(p.timeline.duration,300);
  assert.equal(p.timeline.cuts.length,0);
  assert.equal(p.transcript,"");
});
test("project validates only private project-scoped source paths",()=>{
  const p=freshProject(),id=p.id;
  const pathname=`studio-projects/${id}/main/fdd92eab-1cf3-48d5-bc55-d8f59b6cda78.mov`;
  assert.equal(validProjectMediaPath(id,"main",pathname),true);
  assert.equal(validProjectMediaPath(id,"vertical",pathname),false);
  assert.equal(validProjectMediaPath(id,"main",`studio-projects/${id}/main/../test.mov`),false);
  p.media.main={pathname,filename:"Canon.MOV",bytes:3_687_000_000,contentType:"video/quicktime"};
  assert.equal(projectSchema.safeParse(p).success,true);
  assert.equal(validProjectMedia(p),true);
  p.media.main.pathname="studio-projects/other-project/main/file.mov";
  assert.equal(validProjectMedia(p),false);
});
test("source upload limits permit camera footage but reject unbounded files",()=>{
  const p=freshProject();
  p.media.main={pathname:`studio-projects/${p.id}/main/fdd92eab-1cf3-48d5-bc55-d8f59b6cda78.mp4`,
    filename:"recording.mp4",bytes:MAX_PROJECT_MEDIA_BYTES+1,contentType:"video/mp4"};
  assert.equal(projectSchema.safeParse(p).success,false);
});
test("save payload rejects unrecognized fields and invalid edit points",()=>{
  const p=freshProject();
  assert.equal(projectSchema.safeParse({...p,rogue:"value"}).success,false);
  assert.equal(projectSchema.safeParse({...p,timeline:{...p.timeline,duration:-1}}).success,false);
});
