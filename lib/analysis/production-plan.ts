import type { StudioProject } from "./project";
import type { OutputFormat,OutputKind } from "./outputs";

export type RenderJob = {
  id:string;
  kind:OutputKind;
  capsuleId:string|null;
  title:string;
  format:OutputFormat;
  start:number;
  end:number;
};
type Capsule=StudioProject["capsules"][number];
const supported=(c:Capsule,duration:number)=>Number.isFinite(c.start)&&
  Number.isFinite(c.end)&&c.start>=0&&c.end>c.start&&c.end<=duration;
export function createProductionPlan(args:{
  capsules:readonly Capsule[];
  selectedIds:readonly string[];
  duration:number;
  includeEpisode:boolean;
  formats:readonly OutputFormat[];
}):RenderJob[]{
  const {capsules,selectedIds,duration,includeEpisode,formats}=args;
  const choice=new Set(selectedIds);
  const validFormats=[...new Set(formats)].filter(v=>["horizontal","vertical","square"].includes(v));
  const jobs:RenderJob[]=[];
  for(const capsule of capsules){
    if(!choice.has(capsule.id)||!supported(capsule,duration))continue;
    for(const format of validFormats)jobs.push({
      id:crypto.randomUUID(),kind:"capsule",capsuleId:capsule.id,
      title:capsule.title||"Capsule",format,start:capsule.start,end:capsule.end,
    });
  }
  if(includeEpisode&&Number.isFinite(duration)&&duration>0&&duration<=7200){
    for(const format of validFormats)jobs.push({
      id:crypto.randomUUID(),kind:"episode",capsuleId:null,
      title:"Émission complète",format,start:0,end:duration,
    });
  }
  return jobs.slice(0,100);
}
export const renderFormat=(v:OutputFormat):"16:9"|"9:16"|"1:1"=>
  v==="horizontal"?"16:9":v==="vertical"?"9:16":"1:1";
