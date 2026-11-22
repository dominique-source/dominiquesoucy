/** Local-only multicamera edit decision list (EDL). No remote file storage. */
export type SourceKey = "audio" | "enhanced" | "main" | "vertical" | "secondary";
export type SourceFiles = Partial<Record<SourceKey, File>>;
export type CameraKey = Exclude<SourceKey, "audio" | "enhanced">;
export const cameraKeys: CameraKey[] = ["main", "vertical", "secondary"];
export const labels: Record<SourceKey, string> = {
  audio: "Audio original", enhanced: "Audio optimisé / voix", main: "Canon / principale",
  vertical: "iPhone / verticale", secondary: "Samsung / secondaire",
};
export type Cut = { id: string; at: number; camera: CameraKey; zoomStart?: number; zoomEnd?: number };
export function sourceTime(projectTime: number, offset: number) {
  return Math.max(0, projectTime + offset);
}
export function offsetFromClap(referenceTime: number, sourceClap: number) {
  return sourceClap - referenceTime;
}
export function timeCode(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`;
}
export function activeCamera(cuts: Cut[], time: number, fallback: CameraKey): CameraKey {
  return cuts.filter(c => c.at <= time).sort((a,b) => b.at - a.at)[0]?.camera || fallback;
}
export function cameraShot(cuts: readonly Cut[],time:number,fallback:CameraKey,clipEnd:number){
 const sorted=cuts.filter(c=>c.at<=time).sort((a,b)=>b.at-a.at);
 const current=sorted[0];
 const next=cuts.filter(c=>c.at>time).sort((a,b)=>a.at-b.at)[0];
 const from=current?.at??0;
 const to=next?.at??clipEnd;
 const start=Math.min(1.25,Math.max(1,current?.zoomStart??1));
 const end=Math.min(1.25,Math.max(1,current?.zoomEnd??start));
 // Smooth but restrained digital push/pull, never exceeding 125%.
 const duration=Math.max(.15,to-from);
 const progress=Math.max(0,Math.min(1,(time-from)/duration));
 const eased=progress*progress*(3-2*progress);
 return {camera:current?.camera??fallback,zoom:start+(end-start)*eased};
}
export function safeCutTime(value: number, duration: number) {
  return Math.round(Math.min(Math.max(value,0),Math.max(0,duration))*10)/10;
}
export function edl({
  projectName, duration, offsets, cuts, sourceNames, audioSource
}: {
  projectName: string; duration: number;
  offsets: Record<SourceKey,number>;
  cuts: Cut[]; sourceNames: Partial<Record<SourceKey,string>>;
  audioSource: SourceKey;
}) {
  return {
    format: "DOM_SOUCY_LOCAL_MULTICAM_EDL_V1",
    status: "PREVIEW_ONLY_NOT_RENDERED",
    projectName: projectName.slice(0,100),
    durationSeconds: duration,
    offsetsSeconds: offsets,
    audioSource,
    sources: sourceNames,
    cuts: [...cuts].sort((a,b)=>a.at-b.at).map(c=>({atSeconds:c.at,camera:c.camera,zoomStart:c.zoomStart??1,zoomEnd:c.zoomEnd??c.zoomStart??1})),
    notes: "Offsets are manually aligned by clap; files stay on the operator's computer. This JSON does not contain media and is not a video.",
  };
}

/**
 * Editorial starter edit, NOT scene understanding or AI.
 * A single primary shot remains the anchor, with short alternate cutaways.
 * The plan is deterministic and can be revised before rendering.
 */
export function proposeMulticamCuts({
  start,end,available,primary="main"
}:{
  start:number;end:number;available:readonly CameraKey[];primary?:CameraKey;
}):Cut[]{
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return [];
  const cameras=cameraKeys.filter(k=>available.includes(k));
  if(!cameras.length)return [];
  const base=cameras.includes(primary)?primary:cameras[0];
  const others=cameras.filter(k=>k!==base);
  const duration=end-start;
  const shot=(at:number,camera:CameraKey,zoomStart=1,zoomEnd=zoomStart):Cut=>({
    id:crypto.randomUUID(),at:safeCutTime(at,end),camera,zoomStart,zoomEnd,
  });
  const cuts:Cut[]=[];
  // Hook: subtle push during first 1.5s, release to the natural framing.
  // Purposefully limited to ~12%, and avoid camera whiplash in very short clips.
  if(duration>=5){
    cuts.push(shot(start,base,1.02,1.12));
    cuts.push(shot(start+Math.min(1.8,duration*.18),base,1.12,1));
  }else cuts.push(shot(start,base));
  if(!others.length||duration<11)return cuts;
  const spacing=Math.max(6.8,Math.min(9.5,duration*.17));
  let time=start+Math.min(6.4,Math.max(4.2,duration*.18));
  let index=0;
  while(time<end-3.2&&cuts.length<32){
    const alt=others[index%others.length];
    const altDuration=Math.min(3.3,Math.max(2.2,duration*.08));
    if(time+altDuration>=end-1.9)break;
    // Alternate camera zoom can softly push or release; not every segment.
    const z=index%3===0?[1,1.09] as const:index%3===1?[1.10,1] as const:[1,1] as const;
    cuts.push(shot(time,alt,z[0],z[1]));
    // Primary remains dominant and occasionally gets a discreet push-in.
    const canonZoom=index%3===1?1.08:1;
    cuts.push(shot(time+altDuration,base,canonZoom,canonZoom));
    time+=spacing+altDuration;
    index++;
  }
  // Guarantee both alternate cameras appear when clip is long enough.
  return cuts.sort((a,b)=>a.at-b.at);
}
