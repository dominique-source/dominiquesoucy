import test from "node:test";
import assert from "node:assert/strict";
import { isMediaFile, MAX_MEDIA_BYTES, parseSegments, validMediaPath } from "../lib/analysis/media";

test("media formats are explicitly allowlisted, with OpenAI upload limit", () => {
  assert.equal(isMediaFile("episode.mp4", "video/mp4", 1200000), true);
  assert.equal(isMediaFile("episode.mp3", "audio/mpeg", 1200000), true);
  assert.equal(isMediaFile("episode.exe", "video/mp4", 1200000), false);
  assert.equal(isMediaFile("episode.mp4", "image/png", 1200000), false);
  assert.equal(isMediaFile("episode.mp4", "video/mp4", MAX_MEDIA_BYTES + 1), false);
  assert.equal(isMediaFile("episode.mp4", "video/mp4", 0), false);
});
test("private upload path must have a random UUID directory and an approved extension", () => {
  const uuid = "fdd92eab-1cf3-48d5-bc55-d8f59b6cda78";
  assert.equal(validMediaPath(`private-studio/${uuid}/episode.mp4`), true);
  assert.equal(validMediaPath(`private-studio/${uuid}/../episode.mp4`), false);
  assert.equal(validMediaPath(`private-studio/${uuid}/episode.exe`), false);
  assert.equal(validMediaPath("private-studio/episode.mp4"), false);
});
test("diarization segments are bounded and ignore malformed inputs", () => {
  assert.deepEqual(parseSegments([{start:1,end:2,speaker_id:"speaker_0",text:"Bonjour"}]),
    [{start:1,end:2,speaker:"speaker_0",text:"Bonjour"}]);
  assert.deepEqual(parseSegments([{start:3,end:1,text:"bad"},null]), []);
});
