import { del as deleteBlob } from "@vercel/blob";
import { NextResponse } from "next/server";
import { session,sameOrigin } from "@/lib/studio/auth";
import { get,limit } from "@/lib/studio/store";
import { projectSchema,sourceIds,validProjectMediaPath } from "@/lib/analysis/project";

export const runtime="nodejs";
export const maxDuration=60;
const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex"};
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers});
/**
 * One-off, explicitly invoked cleanup for project-bound legacy video/audio.
 * Paths are NEVER accepted from the caller. Does not touch the project record,
 * Drive, Redis metadata or other Blob stores.
 */
export async function POST(request:Request){
  if(!sameOrigin(request))return json({error:"ORIGIN_DENIED"},403);
  const user=await session().catch(()=>null);
  if(!user)return json({error:"UNAUTHORIZED"},401);
  if(!(await limit(`legacy-cleanup:${user.key}`,10,3600).catch(()=>false)))
    return json({error:"RATE_LIMITED"},429);
  if(Number(request.headers.get("content-length")||0)>1000)return json({error:"BAD_REQUEST"},413);
  let body:unknown;
  try{body=await request.json()}catch{return json({error:"BAD_REQUEST"},400)}
  if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"BAD_REQUEST"},400);
  const value=body as Record<string,unknown>;
  if(typeof value.projectId!=="string"||! /^[0-9a-f-]{36}$/i.test(value.projectId)||
    value.confirm!=="DELETE_PROJECT_VERCEL_MEDIA")
    return json({error:"CONFIRMATION_REQUIRED"},400);
  try{
    const raw=await get(`analysis:project:${value.projectId}`);
    if(!raw)return json({error:"PROJECT_NOT_FOUND"},404);
    const parsed=projectSchema.safeParse(JSON.parse(raw));
    if(!parsed.success)return json({error:"PROJECT_INVALID"},400);
    const media=parsed.data.media;
    const targets=sourceIds.flatMap(source=>{
      const item=media[source];
      return item&&validProjectMediaPath(parsed.data.id,source,item.pathname)
        ?[{source,pathname:item.pathname}]:[];
    });
    const deleted:string[]=[],failed:string[]=[];
    for(const target of targets){
      try{
        await deleteBlob(target.pathname);
        deleted.push(target.source);
      }catch{
        failed.push(target.source);
      }
    }
    return json({deleted,failed,total:targets.length,complete:failed.length===0});
  }catch{return json({error:"LEGACY_CLEANUP_UNAVAILABLE"},503)}
}
