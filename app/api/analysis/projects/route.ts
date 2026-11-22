import { NextResponse } from "next/server";
import { session, sameOrigin } from "@/lib/studio/auth";
import { redis, get, set, limit } from "@/lib/studio/store";
import { PROJECT_TTL, projectSchema, validProjectMedia } from "@/lib/analysis/project";

export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"};
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers});
const indexKey="analysis:project-index";
const key=(id:string)=>`analysis:project:${id}`;
const ID=/^[a-f0-9-]{36}$/i;

export async function GET(request:Request){
  const user=await session().catch(()=>null);
  if(!user)return json({error:"UNAUTHORIZED"},401);
  try{
    const id=new URL(request.url).searchParams.get("id");
    if(id){
      if(!ID.test(id))return json({error:"BAD_PROJECT_ID"},400);
      const raw=await get(key(id));
      if(!raw)return json({error:"PROJECT_NOT_FOUND"},404);
      const parsed=projectSchema.safeParse(JSON.parse(raw));
      return parsed.success?json({project:parsed.data}):json({error:"PROJECT_CORRUPT"},500);
    }
    const ids=(await redis(["LRANGE",`studio:${indexKey}`,0,99])) as string[];
    const rows=await Promise.all(ids.map(async id=>{
      const raw=await get(key(id));
      if(!raw)return null;
      const p=projectSchema.safeParse(JSON.parse(raw));
      if(!p.success)return null;
      return {id:p.data.id,name:p.data.name,updatedAt:p.data.updatedAt||0,
        mediaCount:Object.keys(p.data.media).length,hasTranscript:!!p.data.transcript,hasAnalysis:!!p.data.analysis};
    }));
    return json({projects:rows.filter(Boolean)});
  }catch{return json({error:"PROJECT_STORE_UNAVAILABLE"},503)}
}
export async function POST(request:Request){
  if(!sameOrigin(request))return json({error:"ORIGIN_DENIED"},403);
  const user=await session().catch(()=>null);
  if(!user)return json({error:"UNAUTHORIZED"},401);
  if(Number(request.headers.get("content-length")||0)>250000)return json({error:"TOO_LARGE"},413);
  if(!(await limit(`project-save:${user.key}`,1200,3600).catch(()=>false)))
    return json({error:"SAVE_RATE_LIMITED"},429);
  let data:unknown;
  try {data=await request.json()}catch{return json({error:"BAD_REQUEST"},400)}
  const parsed=projectSchema.safeParse(data);
  if(!parsed.success||!validProjectMedia(parsed.data))return json({error:"BAD_PROJECT"},400);
  const project={...parsed.data,updatedAt:Date.now()};
  try{
    // Every project is private to the single authenticated Studio workspace.
    // Redis persists metadata/transcripts; raw media lives exclusively in private Blob.
    await set(key(project.id),JSON.stringify(project),PROJECT_TTL);
    await redis(["LREM",`studio:${indexKey}`,0,project.id]);
    await redis(["LPUSH",`studio:${indexKey}`,project.id]);
    await redis(["LTRIM",`studio:${indexKey}`,0,99]);
    await redis(["EXPIRE",`studio:${indexKey}`,PROJECT_TTL]);
    return json({ok:true,projectId:project.id,updatedAt:project.updatedAt});
  }catch{return json({error:"PROJECT_SAVE_FAILED"},503)}
}
