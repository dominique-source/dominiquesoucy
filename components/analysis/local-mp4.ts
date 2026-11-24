import { drawStudioFrame, preloadStudioBackground, type CanvasVisual } from "./canvas-overlays";
import { activeCamera, sourceTime, type CameraKey, type Cut, type SourceKey } from "@/lib/analysis/multicam";

type RenderOptions={
  nodes:Partial<Record<SourceKey,HTMLMediaElement|null>>;
  offsets:Record<SourceKey,number>;
  audioSource:SourceKey;
  finalAudioSource?:SourceKey;
  cuts:Cut[];
  fallback:CameraKey;
  duration:number;
  start:number;
  end:number;
  format:"16:9"|"9:16"|"1:1";
  visual?:CanvasVisual;
  onProgress:(percentage:number)=>void;
};

// Browsers permit only one MediaElementAudioSourceNode per media element.
// Reuse the same audio bus across successive renders; clone its tracks.
type AudioBus={ctx:AudioContext;output:MediaStreamAudioDestinationNode};
const audioBuses=new WeakMap<HTMLMediaElement,AudioBus>();
function audioBus(element:HTMLMediaElement):AudioBus {
  const existing=audioBuses.get(element);
  if(existing&&existing.ctx.state!=="closed")return existing;
  const ctx=new AudioContext();
  const source=ctx.createMediaElementSource(element);
  const output=ctx.createMediaStreamDestination();
  source.connect(output);
  source.connect(ctx.destination);
  const bus={ctx,output};
  audioBuses.set(element,bus);
  return bus;
}

/** A real-time, browser-local canvas render. Requires locally selected files.
 *  Browser must support MediaRecorder MP4/H264. No media uploaded for rendering.
 */
export async function renderLocalMp4(opts:RenderOptions):Promise<Blob>{
  const expected=opts.end-opts.start;
  if(!Number.isFinite(expected)||expected<=0||opts.start<0||opts.end>opts.duration+.1)throw new Error("INVALID_EXPORT_RANGE");
  if(document.hidden)throw new Error("KEEP_EXPORT_TAB_VISIBLE");
  const formats=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4"];
  const mime=formats.find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime)throw new Error("MP4_NOT_SUPPORTED");
  if(opts.visual?.background==="signature"&&opts.visual.backgroundUrl){
    await preloadStudioBackground(opts.visual.backgroundUrl);
  }
  const master=opts.nodes[opts.audioSource];
  const finalTrack=opts.nodes[opts.finalAudioSource||opts.audioSource];
  if(!master||!finalTrack)throw new Error("AUDIO_NOT_READY");
  const available=(Object.entries(opts.nodes) as [SourceKey,HTMLMediaElement|null][]).filter(([,v])=>v);
  if(!available.length)throw new Error("NO_VIDEO");
  const width=opts.format==="9:16"?720:opts.format==="1:1"?960:1280;
  const height=opts.format==="9:16"?1280:opts.format==="1:1"?960:720;
  const canvas=document.createElement("canvas");
  canvas.width=width;canvas.height=height;
  const painter=canvas.getContext("2d",{alpha:false});
  if(!painter)throw new Error("NO_CANVAS");
  const bus=audioBus(finalTrack);
  // Keep original destination tracks alive for subsequent jobs.
  const stream=new MediaStream([
    ...canvas.captureStream(30).getVideoTracks(),
    ...bus.output.stream.getAudioTracks().map(track=>track.clone()),
  ]);
  const chunks:Blob[]=[];
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3_000_000,audioBitsPerSecond:128_000});
  let frame=0;
  let watchdog=0;
  let lastDraw=0;
  let started=0;
  let lastVideoTime=-1;
  let lastVideoAdvance=0;
  let lastCamera:CameraKey|undefined;
  let settled=false;
  const result=new Promise<Blob>((resolve,reject)=>{
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    recorder.onerror=()=>reject(new Error("ENCODER_FAILED"));
    recorder.onstop=()=>{
      if(settled)return;
      settled=true;
      resolve(new Blob(chunks,{type:"video/mp4"}));
    };
  });
  try{
    for(const [key,el] of available){
      if(!el)continue;
      el.pause();
      el.muted=key!==(opts.finalAudioSource||opts.audioSource);
      if(!Number.isFinite(el.duration)||el.readyState<1)throw new Error("MEDIA_NOT_READY");
      el.currentTime=Math.min(Math.max(0,el.duration-.1),sourceTime(opts.start,opts.offsets[key]));
    }
    await Promise.all(available.map(async([,el])=>{if(!el||!el.seeking)return;await new Promise<void>((resolve,reject)=>{const timeout=window.setTimeout(()=>reject(Error("SEEK_TIMEOUT")),10000);el.addEventListener("seeked",()=>{clearTimeout(timeout);resolve()},{once:true});})}));
    await bus.ctx.resume();
    recorder.start(1000);
    started=performance.now();lastDraw=started;lastVideoAdvance=started;
    await Promise.all(available.map(async([,el])=>{if(el)await el.play()}));
    await new Promise<void>((resolve,reject)=>{
      watchdog=window.setInterval(()=>{if(document.hidden||performance.now()-lastDraw>2500||performance.now()-started>(expected+3)*1000)reject(new Error("EXPORT_STALLED_KEEP_TAB_VISIBLE"));},250);
      const draw=()=>{
        const now=performance.now();lastDraw=now;
        if(document.hidden){reject(new Error("KEEP_EXPORT_TAB_VISIBLE"));return;}
        const t=Math.max(0,master.currentTime-opts.offsets[opts.audioSource]);
        const camera=activeCamera(opts.cuts,t,opts.fallback);
        const video=opts.nodes[camera] as HTMLVideoElement|undefined;
        if(!video||video.readyState<2||video.ended){reject(new Error("VIDEO_SOURCE_UNAVAILABLE"));return;}
        if(camera!==lastCamera||Math.abs(video.currentTime-lastVideoTime)>.001){lastCamera=camera;lastVideoTime=video.currentTime;lastVideoAdvance=now;}
        if(now-lastVideoAdvance>1500){reject(new Error("VIDEO_SOURCE_STALLED"));return;}
        try{
          drawStudioFrame(painter,video,width,height,t,opts.start,opts.visual);
        }catch{reject(new Error("VIDEO_CANVAS_BLOCKED"));return}
        opts.onProgress(Math.min(100,Math.round((t-opts.start)/(opts.end-opts.start)*100)));
        if(t>=opts.end-.05){resolve();return}
        if(master.ended){reject(new Error("AUDIO_ENDED_EARLY"));return}
        frame=requestAnimationFrame(draw);
      };
      frame=requestAnimationFrame(draw);
    });
    if(recorder.state!=="inactive")recorder.stop();
    const blob=await result;
    if(blob.size<1024)throw new Error("EMPTY_VIDEO");
    await validateMp4(blob,expected);
    return blob;
  }finally{
    if(watchdog)clearInterval(watchdog);
    if(frame)cancelAnimationFrame(frame);
    if(recorder.state!=="inactive")recorder.stop();
    available.forEach(([,el])=>el?.pause());
    stream.getTracks().forEach(track=>track.stop());
    // Bus stays alive for subsequent outputs in this editor session.
  }
}

/** Validate the actual MP4 track durations, not only the media element duration. */
async function validateMp4(blob:Blob,expected:number){
  const bytes=new DataView(await blob.arrayBuffer());
  type Box={type:string;start:number;end:number};
  function boxes(start:number,end:number):Box[]{
    const out:Box[]=[];
    for(let p=start;p+8<=end;){
      let size=bytes.getUint32(p),header=8;
      const type=String.fromCharCode(...new Uint8Array(bytes.buffer,p+4,4));
      if(size===1){if(p+16>end)break;size=Number(bytes.getBigUint64(p+8));header=16;}
      if(size===0)size=end-p;
      if(size<header||p+size>end)break;
      out.push({type,start:p+header,end:p+size});p+=size;
    }return out;
  }
  const moov=boxes(0,bytes.byteLength).find(b=>b.type==="moov");
  if(!moov)throw new Error("MP4_METADATA_MISSING");
  const durations:Record<string,number>={};
  const tracks:Record<number,string>={};
  for(const trak of boxes(moov.start,moov.end).filter(b=>b.type==="trak")){
    const children=boxes(trak.start,trak.end);
    const mdia=children.find(b=>b.type==="mdia"),tkhd=children.find(b=>b.type==="tkhd");
    if(!mdia||!tkhd)continue;
    const m=boxes(mdia.start,mdia.end),hdlr=m.find(b=>b.type==="hdlr"),mdhd=m.find(b=>b.type==="mdhd");
    if(!hdlr||!mdhd)continue;
    const kind=String.fromCharCode(...new Uint8Array(bytes.buffer,hdlr.start+8,4));
    const v=bytes.getUint8(mdhd.start),offset=mdhd.start+(v===1?20:12);
    const scale=bytes.getUint32(offset),duration=v===1?Number(bytes.getBigUint64(offset+4)):bytes.getUint32(offset+4);
    const id=bytes.getUint32(tkhd.start+(bytes.getUint8(tkhd.start)===1?20:12));
    tracks[id]=kind;
    if(scale&&duration&&duration!==4294967295)durations[kind]=duration/scale;
  }
  // Fragmented browser MP4 may have zero mdhd durations. Read fragment decode times and sample durations.
  const scales:Record<number,number>={},defaults:Record<number,number>={},ends:Record<number,number>={};
  for(const trak of boxes(moov.start,moov.end).filter(b=>b.type==="trak")){
    const c=boxes(trak.start,trak.end),tk=c.find(b=>b.type==="tkhd"),md=c.find(b=>b.type==="mdia");if(!tk||!md)continue;
    const h=boxes(md.start,md.end).find(b=>b.type==="mdhd");if(h)scales[bytes.getUint32(tk.start+(bytes.getUint8(tk.start)===1?20:12))]=bytes.getUint32(h.start+(bytes.getUint8(h.start)===1?20:12));
  }
  const mvex=boxes(moov.start,moov.end).find(b=>b.type==="mvex");
  if(mvex)for(const b of boxes(mvex.start,mvex.end).filter(b=>b.type==="trex"))defaults[bytes.getUint32(b.start+4)]=bytes.getUint32(b.start+12);
  for(const moof of boxes(0,bytes.byteLength).filter(b=>b.type==="moof"))for(const traf of boxes(moof.start,moof.end).filter(b=>b.type==="traf")){
    const c=boxes(traf.start,traf.end),h=c.find(b=>b.type==="tfhd"),d=c.find(b=>b.type==="tfdt");if(!h)continue;
    const flags=bytes.getUint32(h.start)&0xffffff,id=bytes.getUint32(h.start+4);let p=h.start+8;
    if(flags&1)p+=8;if(flags&2)p+=4;
    const def=flags&8?bytes.getUint32(p):defaults[id]||0;
    let t=d?(bytes.getUint8(d.start)===1?Number(bytes.getBigUint64(d.start+4)):bytes.getUint32(d.start+4)):(ends[id]||0);
    for(const r of c.filter(b=>b.type==="trun")){
      const f=bytes.getUint32(r.start)&0xffffff,n=bytes.getUint32(r.start+4);let q=r.start+8;
      if(f&1)q+=4;if(f&4)q+=4;
      for(let i=0;i<n;i++){if(f&256){t+=bytes.getUint32(q);q+=4;}else t+=def;if(f&512)q+=4;if(f&1024)q+=4;if(f&2048)q+=4;}
    }ends[id]=Math.max(ends[id]||0,t);
  }
  for(const [id,end] of Object.entries(ends)){const k=tracks[Number(id)],scale=scales[Number(id)];if(k&&scale)durations[k]=Math.max(durations[k]||0,end/scale);}
  const tolerance=Math.max(.75,expected*.01);
  if(!durations.vide||!durations.soun||Math.abs(durations.vide-expected)>tolerance||Math.abs(durations.soun-expected)>tolerance||Math.abs(durations.vide-durations.soun)>tolerance)throw new Error("MP4_DURATION_MISMATCH");
}
