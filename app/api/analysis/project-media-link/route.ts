import { issueSignedToken, presignUrl } from "@vercel/blob";
import { NextResponse } from "next/server";
import { session } from "@/lib/studio/auth";
import { get } from "@/lib/studio/store";
import { projectSchema, sourceIdSchema, validProjectMediaPath } from "@/lib/analysis/project";

export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex"};
const json=(v:unknown,s=200)=>NextResponse.json(v,{status:s,headers});

export async function GET(request:Request){
  if(!await session().catch(()=>null))return json({error:"UNAUTHORIZED"},401);
  const params=new URL(request.url).searchParams;
  const id=params.get("id")||"";
  const source=sourceIdSchema.safeParse(params.get("source"));
  if(!/^[a-f0-9-]{36}$/i.test(id)||!source.success)return json({error:"BAD_REQUEST"},400);
  try{
    const raw=await get(`analysis:project:${id}`);
    if(!raw)return json({error:"PROJECT_NOT_FOUND"},404);
    const project=projectSchema.safeParse(JSON.parse(raw));
    if(!project.success)return json({error:"PROJECT_CORRUPT"},500);
    const item=project.data.media[source.data];
    if(!item||!validProjectMediaPath(id,source.data,item.pathname))
      return json({error:"MEDIA_NOT_FOUND"},404);
    const expires=Date.now()+15*60*1000;
    const token=await issueSignedToken({ operations:["get"] });
    const signed=await presignUrl(token,{
      pathname:item.pathname,operation:"get",validUntil:expires,access:"private",
    });
    return json({url:signed.presignedUrl,expires,filename:item.filename});
  }catch{
    return json({error:"MEDIA_ACCESS_FAILED"},503);
  }
}
