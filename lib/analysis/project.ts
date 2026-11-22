import { z } from "zod";
import { analysisResult } from "./schema";
import { cameraKeys, type SourceKey } from "./multicam";

export const PROJECT_TTL = 365 * 24 * 3600;
export const MAX_PROJECT_MEDIA_BYTES = 5_000_000_000;
export const sourceIds = ["audio", ...cameraKeys] as const;
export const sourceIdSchema = z.enum(sourceIds);
export const mediaInfo = z.object({
  pathname: z.string().min(30).max(260),
  filename: z.string().min(1).max(180),
  bytes: z.number().int().min(1).max(MAX_PROJECT_MEDIA_BYTES),
  contentType: z.string().max(100),
}).strict();
export const offsetsSchema = z.object({
  audio:z.number().finite().min(-7200).max(7200),
  main:z.number().finite().min(-7200).max(7200),
  vertical:z.number().finite().min(-7200).max(7200),
  secondary:z.number().finite().min(-7200).max(7200),
}).strict();
export const timelineSchema = z.object({
  duration:z.number().finite().min(10).max(7200),
  clipStart:z.number().finite().min(0).max(7200),
  clipEnd:z.number().finite().min(0).max(7200),
  audioSource:sourceIdSchema,
  offsets:offsetsSchema,
  claps:offsetsSchema,
  cuts:z.array(z.object({
    id:z.string().min(1).max(64),
    at:z.number().finite().min(0).max(7200),
    camera:z.enum(cameraKeys),
  }).strict()).max(500),
}).strict();
export const episodeEventSchema=z.object({
  id:z.string().uuid(),
  date:z.number().int().nonnegative(),
  type:z.enum(["recording","upload","transcription","analysis","sync","export","error"]),
  message:z.string().max(240),
  status:z.enum(["success","failure","info"]),
}).strict();
export const capsuleSchema=z.object({
  id:z.string().uuid(),
  title:z.string().max(100),
  start:z.number().finite().min(0).max(7200),
  end:z.number().finite().min(0).max(7200),
  format:z.enum(["16:9","9:16","1:1"]),
  style:z.enum(["classic","quote","conversation","editorial"]),
  caption:z.string().max(500),
  bubble:z.string().max(500),
  background:z.enum(["original","dark","lime","gradient"]),
  textPosition:z.enum(["top","center","bottom"]).default("bottom"),
  status:z.enum(["draft","rendered","failed"]).default("draft"),
}).strict();
export const projectSchema = z.object({
  season:z.number().int().min(1).max(999).default(1),
  episode:z.number().int().min(1).max(999).default(1),
  recordingDate:z.string().max(10).default(""),
  stage:z.enum(["recording","transcription","analysis","editing","ready"]).default("recording"),
  events:z.array(episodeEventSchema).max(100).default([]),
  capsules:z.array(capsuleSchema).max(40).default([]),
  id:z.string().uuid(),
  name:z.string().trim().min(1).max(100),
  transcript:z.string().max(26000),
  analysis:analysisResult.nullable(),
  selectedMoment:z.number().int().min(0).max(7),
  format:z.enum(["16:9","9:16","1:1"]),
  media:z.object({
    audio:mediaInfo.optional(),main:mediaInfo.optional(),vertical:mediaInfo.optional(),secondary:mediaInfo.optional(),
  }).strict(),
  timeline:timelineSchema,
  updatedAt:z.number().int().nonnegative().optional(),
}).strict();
export type StudioProject=z.infer<typeof projectSchema>;
export type SourceMedia=z.infer<typeof mediaInfo>;
export function validProjectMediaPath(projectId:string,source:SourceKey,path:string) {
  return path.startsWith(`studio-projects/${projectId}/${source}/`) &&
    /^studio-projects\/[a-f0-9-]{36}\/(audio|main|vertical|secondary)\/[a-f0-9-]{36}\.(mov|mp4|m4v|mp3|m4a|mpeg|wav|webm|ogg|flac)$/i.test(path);
}
export function validProjectMedia(project:StudioProject) {
  for (const key of sourceIds) {
    const item=project.media[key];
    if (item && !validProjectMediaPath(project.id,key,item.pathname)) return false;
  }
  return true;
}
export function freshProject():StudioProject {
  return {id:crypto.randomUUID(),name:"DOM SOUCY MEDIA — ÉPISODE 001",season:1,episode:1,recordingDate:"",stage:"recording",events:[],capsules:[],transcript:"",
    analysis:null,selectedMoment:0,format:"9:16",media:{},
    timeline:{duration:300,clipStart:0,clipEnd:60,audioSource:"audio",offsets:{audio:0,main:0,vertical:0,secondary:0},
      claps:{audio:0,main:0,vertical:0,secondary:0},cuts:[]}};
}

export function episodeCode(season:number,episode:number){
  return `S${String(season).padStart(3,"0")} · E${String(episode).padStart(3,"0")}`;
}
export function eventFor(type:z.infer<typeof episodeEventSchema>["type"],message:string,status:z.infer<typeof episodeEventSchema>["status"]="info"){
  return {id:crypto.randomUUID(),date:Date.now(),type,message:message.slice(0,240),status};
}
