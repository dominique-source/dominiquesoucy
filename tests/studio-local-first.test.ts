import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chunkRanges,AUDIO_CHUNK_SECONDS,AUDIO_SAMPLE_RATE,MAX_TRANSCRIPT_CHUNK_BYTES} from "../lib/analysis/local-audio-chunks";
import {freshProject,projectSchema} from "../lib/analysis/project";

test("audio chunks fit under Vercel's request limit and cover 15 minutes",()=>{
  const intervals=chunkRanges(901);
  assert.equal(intervals.length,11);
  assert.equal(intervals[0].start,0);
  assert.equal(intervals[0].end,AUDIO_CHUNK_SECONDS);
  assert.equal(intervals.at(-1)?.end,901);
  assert.ok(AUDIO_CHUNK_SECONDS*AUDIO_SAMPLE_RATE*2+44<MAX_TRANSCRIPT_CHUNK_BYTES);
  assert.ok(MAX_TRANSCRIPT_CHUNK_BYTES<4_500_000);
});
test("a two-hour audio is chunked without gaps or overlaps",()=>{
  const intervals=chunkRanges(7200);
  assert.equal(intervals.length,80);
  intervals.forEach((v,i)=>{
    if(i>0)assert.equal(intervals[i-1].end,v.start);
  });
  assert.throws(()=>chunkRanges(7200.1),/AUDIO_DURATION_UNSUPPORTED/);
});
test("project stores local media labels without Vercel Blob path",()=>{
  const p=freshProject();
  p.localMedia={audio:{filename:"my-drive-original.m4a",bytes:68_000_000},
    main:{filename:"canon.mov",bytes:3_690_000_000}};
  const saved=projectSchema.parse(p);
  assert.equal(saved.localMedia.main?.filename,"canon.mov");
  assert.deepEqual(saved.media,{});
});
test("live audio and batch rendering never call the former Blob upload endpoints",()=>{
  const production=readFileSync("components/analysis/production-studio.tsx","utf8");
  const batch=readFileSync("components/analysis/production-batch.tsx","utf8");
  assert.doesNotMatch(production,/\/api\/analysis\/(?:project-media-upload|media-upload)/);
  assert.doesNotMatch(production,/\@vercel\/blob\/client/);
  assert.doesNotMatch(batch,/\/api\/analysis\/outputs-upload/);
  assert.doesNotMatch(batch,/\@vercel\/blob\/client/);
});
