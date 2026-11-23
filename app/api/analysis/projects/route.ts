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
      return {id:p.data.id,name:p.data.name,season:p.data.season,episode:p.data.episode,stage:p.data.stage,recordingDate:p.data.recordingDate,capsuleCount:p.data.capsules.length,failedCount:p.data.events.filter(e=>e.status==="failure").length,updatedAt:p.data.updatedAt||0,
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
  const project=parsed.data;
  try{
    // Optimistic concurrency: an older tab or pending request may not overwrite
    // a newer project, its media references, or its saved synchronization.
    // Redis EVAL makes the check and write atomic across Vercel instances.
    const expected=project.updatedAt??0;
    let updatedAt:number;
    if(process.env.NODE_ENV!=="production"&&!process.env.VERCEL&&
      !(process.env.STUDIO_REDIS_URL||process.env.KV_REST_API_URL)){
      const existing=await get(key(project.id));
      const current=existing?projectSchema.safeParse(JSON.parse(existing)):null;
      const previous=current?.success?(current.data.updatedAt??0):0;
      if(previous!==expected)return json({error:"PROJECT_VERSION_CONFLICT"},409);
      updatedAt=Math.max(Date.now(),previous+1);
      await set(key(project.id),JSON.stringify({...project,updatedAt}),PROJECT_TTL);
    }else{
      const script=[
        "local current=redis.call('GET',KEYS[1])",
        "local previous=0",
        "if current then local ok, obj=pcall(cjson.decode,current); if not ok then return -2 end; previous=tonumber(obj.updatedAt) or 0 end",
        "if previous~=tonumber(ARGV[1]) then return -1 end",
        "local now=math.max(tonumber(ARGV[3]),previous+1)",
        "local payload=cjson.decode(ARGV[2]); payload.updatedAt=now",
        "redis.call('SET',KEYS[1],cjson.encode(payload),'EX',ARGV[4])",
        "return now"
      ].join("\n");
      const result=Number(await redis(["EVAL",script,1,`studio:${key(project.id)}`,
        expected,JSON.stringify(project),Date.now(),PROJECT_TTL]));
      if(result===-1)return json({error:"PROJECT_VERSION_CONFLICT"},409);
      if(result===-2)return json({error:"PROJECT_CORRUPT"},500);
      if(!Number.isFinite(result)||result<=0)throw Error("PROJECT_SAVE_FAILED");
      updatedAt=result;
    }
    await redis(["LREM",`studio:${indexKey}`,0,project.id]);
    await redis(["LPUSH",`studio:${indexKey}`,project.id]);
    await redis(["LTRIM",`studio:${indexKey}`,0,99]);
    await redis(["EXPIRE",`studio:${indexKey}`,PROJECT_TTL]);
    return json({ok:true,projectId:project.id,updatedAt});
  }catch{return json({error:"PROJECT_SAVE_FAILED"},503)}
}
