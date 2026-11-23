import { z } from "zod";
import { analysisResult } from "./schema";
import { cameraKeys, type SourceKey } from "./multicam";
import { studioBackdropIds } from "./studio-backdrops";

export const PROJECT_TTL = 365 * 24 * 3600;
export const MAX_PROJECT_MEDIA_BYTES = 5_000_000_000;
export const sourceIds = ["audio", "enhanced", ...cameraKeys] as const;
export const sourceIdSchema = z.enum(sourceIds);
export const mediaInfo = z.object({
  pathname: z.string().min(30).max(260),
  filename: z.string().min(1).max(180),
  bytes: z.number().int().min(1).max(MAX_PROJECT_MEDIA_BYTES),
  contentType: z.string().max(100),
}).strict();
export const offsetsSchema = z.object({
  audio:z.number().finite().min(-7200).max(7200),
  enhanced:z.number().finite().min(-7200).max(7200).default(0),
  main:z.number().finite().min(-7200).max(7200),
  vertical:z.number().finite().min(-7200).max(7200),
  secondary:z.number().finite().min(-7200).max(7200),
}).strict();
export const timelineSchema = z.object({
  duration:z.number().finite().min(10).max(7200),
  clipStart:z.number().finite().min(0).max(7200),
  clipEnd:z.number().finite().min(0).max(7200),
  audioSource:sourceIdSchema,
  finalAudioSource:sourceIdSchema.default("audio"),
  alignmentApproved:z.boolean().default(false),
  visualClaps:z.object({main:z.number().min(0).max(7200).nullable().default(null),vertical:z.number().min(0).max(7200).nullable().default(null),secondary:z.number().min(0).max(7200).nullable().default(null)}).strict().default({main:null,vertical:null,secondary:null}),
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
  background:z.enum(["original","dark","lime","gradient","signature"]),
  keying:z.object({enabled:z.boolean(),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),tolerance:z.number().finite().min(0.03).max(0.45),softness:z.number().finite().min(0.01).max(0.35),spill:z.number().finite().min(0).max(1)}).strict().default({enabled:false,color:"#30b7b0",tolerance:0.16,softness:0.12,spill:0.45}),
  textPosition:z.enum(["top","center","bottom"]).default("bottom"),
  status:z.enum(["draft","rendered","failed"]).default("draft"),
  timingSource:z.enum(["automatic","manual","unmatched"]).optional(),
  cameraCuts:timelineSchema.shape.cuts.optional(),
  cameraEditSource:z.enum(["automatic","manual"]).optional(),
}).strict();
export const timedWordSchema=z.object({
 word:z.string().min(1).max(100),
 start:z.number().finite().min(0).max(7200),
 end:z.number().finite().min(0).max(7200),
}).strict();
export const reconstructedQuestionSchema=z.object({
  id:z.string().uuid(),
  question:z.string().min(1).max(300),
  journalist:z.number().int().min(0).max(2),
  answerExcerpt:z.string().min(1).max(330),
  label:z.literal("QUESTION_RECONSTRUITE_NON_ORIGINALE"),
}).strict();
export const projectSchema = z.object({
  studioBackdrop:z.object({mode:z.enum(["manual","random","topic"]),selectedId:z.enum(studioBackdropIds)}).strict().default({mode:"random",selectedId:"basketball"}),
  reconstructedQuestions:z.array(reconstructedQuestionSchema).max(12).default([]),
  timedWords:z.array(timedWordSchema).max(6000).default([]),
  season:z.number().int().min(1).max(999).default(1),
  episode:z.number().int().min(1).max(999).default(1),
  recordingDate:z.string().max(10).default(""),
  stage:z.enum(["recording","transcription","analysis","editing","ready"]).default("recording"),
  events:z.array(episodeEventSchema).max(100).default([]),
  capsules:z.array(capsuleSchema).max(40).default([]),
  selectedCapsuleId:z.string().max(64).default(""),
  id:z.string().uuid(),
  name:z.string().trim().min(1).max(100),
  transcript:z.string().max(26000),
  analysis:analysisResult.nullable(),
  selectedMoment:z.number().int().min(0).max(14),
  format:z.enum(["16:9","9:16","1:1"]),
  media:z.object({
    audio:mediaInfo.optional(),enhanced:mediaInfo.optional(),main:mediaInfo.optional(),vertical:mediaInfo.optional(),secondary:mediaInfo.optional(),
  }).strict(), // Legacy Vercel Blob paths only; never used for new media.
  localMedia:z.object({
    audio:z.object({filename:z.string().max(180),bytes:z.number().int().nonnegative()}).strict().optional(),
    enhanced:z.object({filename:z.string().max(180),bytes:z.number().int().nonnegative()}).strict().optional(),
    main:z.object({filename:z.string().max(180),bytes:z.number().int().nonnegative()}).strict().optional(),
    vertical:z.object({filename:z.string().max(180),bytes:z.number().int().nonnegative()}).strict().optional(),
    secondary:z.object({filename:z.string().max(180),bytes:z.number().int().nonnegative()}).strict().optional(),
  }).strict().default({}),
  timeline:timelineSchema,
  updatedAt:z.number().int().nonnegative().optional(),
}).strict();
export type StudioProject=z.infer<typeof projectSchema>;
export type SourceMedia=z.infer<typeof mediaInfo>;
export function validProjectMediaPath(projectId:string,source:SourceKey,path:string) {
  return path.startsWith(`studio-projects/${projectId}/${source}/`) &&
    /^studio-projects\/[a-f0-9-]{36}\/(audio|enhanced|main|vertical|secondary)\/[a-f0-9-]{36}\.(mov|mp4|m4v|mp3|m4a|mpeg|wav|webm|ogg|flac)$/i.test(path);
}
export function validProjectMedia(project:StudioProject) {
  for (const key of sourceIds) {
    const item=project.media[key];
    if (item && !validProjectMediaPath(project.id,key,item.pathname)) return false;
  }
  return true;
}
export function freshProject():StudioProject {
  return {id:crypto.randomUUID(),name:"DOM SOUCY MEDIA — ÉPISODE 001",season:1,episode:1,recordingDate:"",stage:"recording",studioBackdrop:{mode:"random",selectedId:"basketball"},events:[],capsules:[],selectedCapsuleId:"",reconstructedQuestions:[],timedWords:[],transcript:"",
    analysis:null,selectedMoment:0,format:"9:16",media:{},localMedia:{},
    timeline:{duration:300,clipStart:0,clipEnd:60,audioSource:"audio",finalAudioSource:"audio",alignmentApproved:false,visualClaps:{main:null,vertical:null,secondary:null},offsets:{audio:0,enhanced:0,main:0,vertical:0,secondary:0},
      claps:{audio:0,enhanced:0,main:0,vertical:0,secondary:0},cuts:[]}};
}

export function episodeCode(season:number,episode:number){
  return `S${String(season).padStart(3,"0")} · E${String(episode).padStart(3,"0")}`;
}
export function eventFor(type:z.infer<typeof episodeEventSchema>["type"],message:string,status:z.infer<typeof episodeEventSchema>["status"]="info"){
  return {id:crypto.randomUUID(),date:Date.now(),type,message:message.slice(0,240),status};
}
