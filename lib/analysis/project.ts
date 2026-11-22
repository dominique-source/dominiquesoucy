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
export const projectSchema = z.object({
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
  return {id:crypto.randomUUID(),name:"DOM SOUCY MEDIA — ÉPISODE 001",transcript:"",
    analysis:null,selectedMoment:0,format:"9:16",media:{},
    timeline:{duration:300,clipStart:0,clipEnd:60,audioSource:"audio",offsets:{audio:0,main:0,vertical:0,secondary:0},
      claps:{audio:0,main:0,vertical:0,secondary:0},cuts:[]}};
}
