import { activeCamera, sourceTime, type CameraKey, type Cut, type SourceKey } from "@/lib/analysis/multicam";

type RenderOptions={
  nodes:Partial<Record<SourceKey,HTMLMediaElement|null>>;
  offsets:Record<SourceKey,number>;
  audioSource:SourceKey;
  cuts:Cut[];
  fallback:CameraKey;
  duration:number;
  start:number;
  end:number;
  format:"16:9"|"9:16"|"1:1";
  onProgress:(percentage:number)=>void;
};

/** A real-time, browser-local canvas render. Requires locally selected files.
 *  Browser must support MediaRecorder MP4/H264. No media uploaded for rendering.
 */
export async function renderLocalMp4(opts:RenderOptions):Promise<Blob>{
  const formats=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4"];
  const mime=formats.find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime)throw new Error("MP4_NOT_SUPPORTED");
  const master=opts.nodes[opts.audioSource];
  if(!master)throw new Error("AUDIO_NOT_READY");
  const available=(Object.entries(opts.nodes) as [SourceKey,HTMLMediaElement|null][]).filter(([,v])=>v);
  if(!available.length)throw new Error("NO_VIDEO");
  const width=opts.format==="9:16"?720:opts.format==="1:1"?960:1280;
  const height=opts.format==="9:16"?1280:opts.format==="1:1"?960:720;
  const canvas=document.createElement("canvas");
  canvas.width=width;canvas.height=height;
  const painter=canvas.getContext("2d",{alpha:false});
  if(!painter)throw new Error("NO_CANVAS");
  const ctx=new AudioContext();
  const source=ctx.createMediaElementSource(master);
  const audioOut=ctx.createMediaStreamDestination();
  source.connect(audioOut);
  // Keep monitoring while rendering, without duplicating tracks into output.
  source.connect(ctx.destination);
  const stream=new MediaStream([...canvas.captureStream(30).getVideoTracks(),...audioOut.stream.getAudioTracks()]);
  const chunks:Blob[]=[];
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3_000_000,audioBitsPerSecond:128_000});
  let frame=0;
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
      el.muted=key!==opts.audioSource;
      if(!Number.isFinite(el.duration)||el.readyState<1)throw new Error("MEDIA_NOT_READY");
      el.currentTime=Math.min(Math.max(0,el.duration-.1),sourceTime(opts.start,opts.offsets[key]));
    }
    await ctx.resume();
    recorder.start(1000);
    await Promise.all(available.map(async([,el])=>{if(el)await el.play()}));
    await new Promise<void>((resolve,reject)=>{
      const draw=()=>{
        const t=Math.max(0,master.currentTime-opts.offsets[opts.audioSource]);
        const camera=activeCamera(opts.cuts,t,opts.fallback);
        const video=opts.nodes[camera] as HTMLVideoElement|undefined;
        painter.fillStyle="#080808";painter.fillRect(0,0,width,height);
        if(video&&video.readyState>=2&&video.videoWidth&&video.videoHeight){
          try{
            const scale=Math.max(width/video.videoWidth,height/video.videoHeight);
            const w=video.videoWidth*scale,h=video.videoHeight*scale;
            painter.drawImage(video,(width-w)/2,(height-h)/2,w,h);
          }catch{reject(new Error("VIDEO_CANVAS_BLOCKED"));return}
        }
        opts.onProgress(Math.min(100,Math.round((t-opts.start)/(opts.end-opts.start)*100)));
        if(t>=opts.end-.05||master.ended){resolve();return}
        frame=requestAnimationFrame(draw);
      };
      frame=requestAnimationFrame(draw);
    });
    if(recorder.state!=="inactive")recorder.stop();
    const blob=await result;
    if(blob.size<1024)throw new Error("EMPTY_VIDEO");
    return blob;
  }finally{
    if(frame)cancelAnimationFrame(frame);
    if(recorder.state!=="inactive")recorder.stop();
    available.forEach(([,el])=>el?.pause());
    stream.getTracks().forEach(track=>track.stop());
    await ctx.close().catch(()=>{});
  }
}
