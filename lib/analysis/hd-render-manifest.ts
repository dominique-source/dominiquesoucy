import type { StudioProject } from "./project";

export type HdManifestOptions={transparentForeground:boolean;reporterPortrait:boolean};
export type HdRenderManifest={
  schemaVersion:1;
  projectId:string;capsuleId:string;title:string;
  start:number;end:number;format:"16:9"|"9:16"|"1:1";
  style:"journalist"|"rafale"|"quote"|"editorial"|"classic"|"none";
  caption:string;bubble:string;
  journalistName:string;journalistOutlet:string;
  questionAttribution:"verified"|"reconstructed";
  masterAsset:string;foregroundAsset:string;audioAsset:string;
  backgroundAsset:string;portraitAsset:string;episodeLabel:string;
  outroAsset:string;outroDurationSeconds:number;
};

/** Pure manifest preparation: no source video bytes leave the browser. */
export function buildHdRenderManifest(
  project:StudioProject,
  capsule:StudioProject["capsules"][number],
  options:HdManifestOptions,
):HdRenderManifest{
  const start=capsule.start,end=capsule.end;
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||
    end<=start||end-start>600||end>project.timeline.duration+.01)
    throw Error("INVALID_CAPSULE_TIMECODES");
  const style=capsule.style==="conversation"?"journalist":capsule.style;
  const allowed=["journalist","rafale","quote","editorial","classic","none"];
  if(!allowed.includes(style))throw Error("INVALID_CAPSULE_STYLE");
  return {
    schemaVersion:1,
    projectId:project.id,capsuleId:capsule.id,title:capsule.title,
    start:Math.round(start*1000)/1000,end:Math.round(end*1000)/1000,
    format:capsule.format,style:style as HdRenderManifest["style"],
    caption:capsule.caption,bubble:capsule.bubble,
    journalistName:capsule.journalistName||"",
    journalistOutlet:capsule.journalistOutlet||"",
    questionAttribution:capsule.questionAttribution||"reconstructed",
    masterAsset:"master.mp4",
    foregroundAsset:options.transparentForeground?"foreground.mov":"",
    audioAsset:options.transparentForeground?"audio.wav":"",
    backgroundAsset:options.transparentForeground?"background.png":"",
    portraitAsset:options.reporterPortrait?"reporter.png":"",
    episodeLabel:`ÉP. ${String(project.episode).padStart(2,"0")}`,
    // Exact originals: 2 seconds, horizontal (16:9 and centered 1:1) or vertical (9:16).
    outroAsset:capsule.format==="9:16"?"signature-vertical.mp4":"signature-horizontal.mp4",
    outroDurationSeconds:2,
  };
}

export function hdManifestFilename(capsule:StudioProject["capsules"][number]){
  const label=capsule.title.normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,55)||"capsule";
  return `dom-soucy-${label}-${capsule.format.replace(":","x")}.json`;
}
