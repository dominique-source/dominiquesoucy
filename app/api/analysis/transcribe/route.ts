import { NextResponse } from "next/server";
import { session,sameOrigin } from "@/lib/studio/auth";
import { limit } from "@/lib/studio/store";
import { MAX_TRANSCRIPT_CHUNK_BYTES } from "@/lib/analysis/local-audio-chunks";

export const runtime="nodejs";
export const maxDuration=120;
const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex"};
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers});

/**
 * Transcribe short audio chunks sent directly to the function in memory.
 * IMPORTANT: Vercel Functions cannot receive full 25 MB recordings directly.
 * Client sends <= 90 s mono 16 kHz WAV, <= 3.6 MB per request.
 * No Vercel Blob, media metadata DB or recording persistence involved.
 */
export async function POST(request:Request){
  if(!sameOrigin(request))return json({error:"ORIGIN_DENIED"},403);
  let user:Awaited<ReturnType<typeof session>>;
  try{user=await session()}
  catch{return json({error:"AUTH_STORE_UNAVAILABLE"},503)}
  if(!user)return json({error:"UNAUTHORIZED"},401);
  if(!process.env.OPENAI_API_KEY)return json({error:"AI_NOT_CONFIGURED"},503);
  const length=Number(request.headers.get("content-length")||0);
  if(length>4_100_000)return json({error:"AUDIO_CHUNK_TOO_LARGE"},413);
  if(!(await limit(`transcribe-chunks:${user.key}`,120,3600).catch(()=>false)))
    return json({error:"RATE_LIMITED"},429);
  try{
    const data=await request.formData();
    const file=data.get("audio");
    const lang=data.get("lang");
    if(data.get("consent")!=="true"||(lang!=="fr"&&lang!=="en")||
      !(file instanceof File)||file.size<44||file.size>MAX_TRANSCRIPT_CHUNK_BYTES||
      file.type!=="audio/wav")return json({error:"INVALID_AUDIO_CHUNK"},400);
    const form=new FormData();
    form.set("file",file,"studio-chunk.wav");
    form.set("model","whisper-1");
    form.set("response_format","verbose_json");
    form.append("timestamp_granularities[]","word");
    form.set("language",lang);
    const response=await fetch("https://api.openai.com/v1/audio/transcriptions",{
      method:"POST",
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},
      body:form,
      signal:AbortSignal.timeout(105000),
    });
    if(!response.ok){
      console.error("studio_transcription_provider_failure",{status:response.status});
      return json({error:response.status===429?"AI_RATE_LIMITED":
        response.status===401||response.status===403?"AI_AUTH_FAILED":
        response.status===400||response.status===415||response.status===422?
        "AUDIO_REJECTED":"TRANSCRIPTION_PROVIDER_FAILED"},response.status===429?429:502);
    }
    const result=await response.json() as {text?:unknown;words?:unknown};
    if(typeof result.text!=="string"||!result.text.trim())
      return json({error:"TRANSCRIPTION_EMPTY"},502);
    const words=Array.isArray(result.words)?result.words.flatMap((entry:unknown)=>{
      if(!entry||typeof entry!=="object")return [];
      const w=entry as Record<string,unknown>;
      return typeof w.word==="string"&&w.word.trim().length>0&&w.word.length<=100&&
        typeof w.start==="number"&&typeof w.end==="number"&&
        Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.start>=0&&w.end>w.start&&w.end<=120
        ?[{word:w.word,start:w.start,end:w.end}]:[];
    }).slice(0,1800):[];
    return json({transcript:result.text.slice(0,26000),timedWords:words});
  }catch(e){
    const name=e instanceof Error?e.name:"Unknown";
    console.error("studio_transcription_request_failed",{name});
    return json({error:name==="TimeoutError"||name==="AbortError"?
      "TRANSCRIPTION_TIMEOUT":"TRANSCRIPTION_UNAVAILABLE"},503);
  }
}
