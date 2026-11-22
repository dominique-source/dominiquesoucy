"use client";
import { interpolateEnvelope, matchEnvelopes, type Match, SYNC_RATE } from "./auto-sync";
import type { SourceKey } from "./multicam";

export type CameraSyncResult={source:SourceKey;match:Match;error?:string};
const SCAN_SECONDS=44;
const SPEED=2;
const SAMPLE_EVERY_MS=45;

/** Capture a short audio activity fingerprint via browser decoders.
 *  Works on remote private media only when CORS and the media codec allow it.
 *  Files are read through media elements, without loading multi-GB files into JS memory.
 */
async function captureFingerprint(url:string,signal:AbortSignal):Promise<number[]>{
  const element=document.createElement("video");
  const isRemote=/^https?:/i.test(url);
  if(isRemote)element.crossOrigin="anonymous";
  element.src=url;
  element.preload="auto";
  element.playsInline=true;
  element.style.cssText="position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:0";
  document.body.appendChild(element);
  let context:AudioContext|null=null;
  let interval:ReturnType<typeof setInterval>|undefined;
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{
    const loaded=new Promise<void>((resolve,reject)=>{
      if(element.readyState>=1){resolve();return}
      element.addEventListener("loadedmetadata",()=>resolve(),{once:true});
      element.addEventListener("error",()=>reject(new Error("MEDIA_FORMAT_UNSUPPORTED")),{once:true});
    });
    element.load();
    await Promise.race([
      loaded,
      new Promise<never>((_,reject)=>{
        timeout=setTimeout(()=>reject(new Error("MEDIA_LOAD_TIMEOUT")),15000);
        signal.addEventListener("abort",()=>reject(new Error("CANCELLED")),{once:true});
      }),
    ]);
    if(timeout){clearTimeout(timeout);timeout=undefined}
    if(signal.aborted)throw new Error("CANCELLED");
    if(!Number.isFinite(element.duration)||element.duration<12)throw new Error("AUDIO_TOO_SHORT");
    context=new AudioContext();
    const source=context.createMediaElementSource(element);
    const analyser=context.createAnalyser();
    analyser.fftSize=2048;
    const silence=context.createGain();
    silence.gain.value=0;
    source.connect(analyser);analyser.connect(silence);silence.connect(context.destination);
    const floats=new Float32Array(analyser.fftSize);
    const samples:Array<{at:number;level:number}>=[];
    element.currentTime=0;
    element.playbackRate=SPEED;
    await context.resume();
    try{await element.play()}catch{throw new Error("MEDIA_PLAYBACK_UNSUPPORTED")}
    await new Promise<void>((resolve,reject)=>{
      const started=performance.now();
      interval=setInterval(()=>{
        if(signal.aborted){reject(new Error("CANCELLED"));return}
        if(element.error){reject(new Error("MEDIA_DECODE_FAILED"));return}
        analyser.getFloatTimeDomainData(floats);
        let energy=0;
        for(let i=0;i<floats.length;i++)energy+=floats[i]*floats[i];
        const level=Math.sqrt(energy/floats.length);
        samples.push({at:element.currentTime,level:Math.log1p(level*60)});
        if(element.currentTime>=Math.min(SCAN_SECONDS,element.duration-.1)||element.ended){
          resolve();return;
        }
        if(performance.now()-started>35000)reject(new Error("MEDIA_SCAN_TIMEOUT"));
      },SAMPLE_EVERY_MS);
    });
    const envelope=interpolateEnvelope(samples,Math.min(SCAN_SECONDS,element.duration-.1),SYNC_RATE);
    const mean=envelope.reduce((sum,x)=>sum+x,0)/Math.max(1,envelope.length);
    const variance=envelope.reduce((sum,x)=>sum+(x-mean)**2,0)/Math.max(1,envelope.length);
    if(envelope.length<SYNC_RATE*8||variance<.0004)throw new Error("NO_USABLE_AUDIO");
    return envelope;
  }finally{
    if(timeout)clearTimeout(timeout);
    if(interval)clearInterval(interval);
    element.pause();element.removeAttribute("src");element.load();element.remove();
    if(context)await context.close().catch(()=>{});
  }
}

export async function alignCameraAudio({
  urls,master,sources,onProgress,signal,
}:{
  urls:Partial<Record<SourceKey,string>>;
  master:SourceKey;
  sources:SourceKey[];
  onProgress:(text:string)=>void;
  signal:AbortSignal;
}):Promise<CameraSyncResult[]>{
  const referenceUrl=urls[master];
  if(!referenceUrl)throw new Error("MISSING_REFERENCE_AUDIO");
  onProgress("REFERENCE");
  const reference=await captureFingerprint(referenceUrl,signal);
  const results:CameraSyncResult[]=[];
  for(const key of sources){
    if(key===master)continue;
    const url=urls[key];
    if(!url)continue;
    onProgress(key);
    try{
      const fingerprint=await captureFingerprint(url,signal);
      const match=matchEnvelopes(reference,fingerprint);
      results.push({source:key,match});
    }catch(e){
      if(signal.aborted)throw new Error("CANCELLED");
      const error=e instanceof Error?e.message:"UNKNOWN_ERROR";
      results.push({source:key,match:{lagSeconds:0,correlation:0,confidence:"unreliable",separation:0},error});
    }
  }
  return results;
}
