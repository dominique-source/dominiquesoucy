import { z } from "zod";

export const outputFormatSchema=z.enum(["horizontal","vertical","square"]);
export const outputKindSchema=z.enum(["capsule","episode"]);
export const outputRecordSchema=z.object({
  id:z.string().uuid(),
  projectId:z.string().uuid(),
  capsuleId:z.string().uuid().nullable(),
  kind:outputKindSchema,
  format:outputFormatSchema,
  title:z.string().min(1).max(100),
  pathname:z.string().max(300),
  bytes:z.number().int().positive().max(5_000_000_000),
  createdAt:z.number().int().positive(),
}).strict();
export type OutputRecord=z.infer<typeof outputRecordSchema>;
export type OutputFormat=z.infer<typeof outputFormatSchema>;
export type OutputKind=z.infer<typeof outputKindSchema>;
export function outputPath(projectId:string,id:string,format:OutputFormat){
  return `studio-exports/${projectId}/${id}/${format}.mp4`;
}
export function validOutputPath(projectId:string,id:string,format:OutputFormat,path:string){
  return path===outputPath(projectId,id,format)&&
    /^studio-exports\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/(horizontal|vertical|square)\.mp4$/i.test(path);
}
export const outputUploadInput=z.object({
  projectId:z.string().uuid(),id:z.string().uuid(),
  format:outputFormatSchema,
  kind:outputKindSchema,
  capsuleId:z.string().uuid().nullable(),
  title:z.string().trim().min(1).max(100),
  pathname:z.string().max(300),
}).strict();
export const outputMaxBytes=5_000_000_000;
