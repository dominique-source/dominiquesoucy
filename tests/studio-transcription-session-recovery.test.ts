import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("Transcription client checks private session before decoding or uploading audio",()=>{
  const code=readFileSync("components/analysis/production-studio.tsx","utf8");
  const check=code.indexOf('fetch("/api/studio/session"');
  const decode=code.indexOf("const decoded=await decodeLocalAudio(audio)");
  const upload=code.indexOf('fetch("/api/analysis/transcribe"');
  assert.ok(check>0 && check<decode && decode<upload);
  assert.ok(code.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(code.includes('transcriptionFailure.code==="UNAUTHORIZED"'));
  assert.ok(code.includes("Ne recharge pas la page"));
});
test("Private transcription still requires authenticated session and never bypasses authorization",()=>{
  const code=readFileSync("app/api/analysis/transcribe/route.ts","utf8");
  assert.ok(code.includes('if(!user)return json({error:"UNAUTHORIZED"},401)'));
  assert.ok(code.includes('AUTH_STORE_UNAVAILABLE'));
  assert.ok(code.includes('if(!process.env.OPENAI_API_KEY)'));
  assert.ok(code.includes("sameOrigin(request)"));
});
