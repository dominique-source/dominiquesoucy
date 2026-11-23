/**
 * Turn locally selected recordings into short, in-memory PCM WAV requests.
 * No recording is uploaded to a permanent object store. Each request stays
 * below the Vercel Function request-body limit (~4.5 MB).
 */
export const AUDIO_CHUNK_SECONDS=90;
export const AUDIO_SAMPLE_RATE=16_000;
export const MAX_LOCAL_AUDIO_DURATION=7200;
export const MAX_TRANSCRIPT_CHUNK_BYTES=3_600_000;

export function makeMonoWavChunk(buffer:AudioBuffer,startSeconds:number,endSeconds:number):File {
  if(!Number.isFinite(startSeconds)||!Number.isFinite(endSeconds)||
    endSeconds<=startSeconds||startSeconds<0||endSeconds>buffer.duration+.01)
    throw Error("INVALID_AUDIO_RANGE");
  const samples=Math.ceil((endSeconds-startSeconds)*AUDIO_SAMPLE_RATE);
  if(samples<=0||samples*2+44>MAX_TRANSCRIPT_CHUNK_BYTES)throw Error("AUDIO_CHUNK_TOO_LARGE");
  const bytes=new ArrayBuffer(samples*2+44);
  const view=new DataView(bytes);
  const ascii=(pos:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(pos+i,value.charCodeAt(i))};
  ascii(0,"RIFF");view.setUint32(4,36+samples*2,true);
  ascii(8,"WAVE");ascii(12,"fmt ");view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,AUDIO_SAMPLE_RATE,true);view.setUint32(28,AUDIO_SAMPLE_RATE*2,true);
  view.setUint16(32,2,true);view.setUint16(34,16,true);
  ascii(36,"data");view.setUint32(40,samples*2,true);
  const data=Array.from({length:buffer.numberOfChannels},
    (_,c)=>buffer.getChannelData(c));
  for(let i=0;i<samples;i++){
    const inputPosition=(startSeconds+i/AUDIO_SAMPLE_RATE)*buffer.sampleRate;
    const j=Math.min(buffer.length-1,Math.floor(inputPosition));
    const next=Math.min(buffer.length-1,j+1);
    const fraction=inputPosition-j;
    let value=0;
    for(const channel of data)value+=channel[j]*(1-fraction)+channel[next]*fraction;
    value=Math.max(-1,Math.min(1,value/data.length));
    view.setInt16(44+i*2,value<0?Math.round(value*32768):Math.round(value*32767),true);
  }
  return new File([bytes],"studio-chunk.wav",{type:"audio/wav"});
}

export async function decodeLocalAudio(file:File):Promise<AudioBuffer>{
  if(file.size<=0||file.size>600_000_000)throw Error("LOCAL_AUDIO_TOO_LARGE");
  const ctx=new AudioContext();
  try{
    const decoded=await ctx.decodeAudioData(await file.arrayBuffer());
    if(decoded.duration>MAX_LOCAL_AUDIO_DURATION||decoded.duration<=0)throw Error("AUDIO_DURATION_UNSUPPORTED");
    return decoded;
  }finally{await ctx.close().catch(()=>{})}
}

export function chunkRanges(duration:number){
  if(!Number.isFinite(duration)||duration<=0||duration>MAX_LOCAL_AUDIO_DURATION)
    throw Error("AUDIO_DURATION_UNSUPPORTED");
  const ranges:Array<{start:number;end:number}>=[];
  for(let start=0;start<duration;start+=AUDIO_CHUNK_SECONDS)
    ranges.push({start,end:Math.min(duration,start+AUDIO_CHUNK_SECONDS)});
  return ranges;
}
