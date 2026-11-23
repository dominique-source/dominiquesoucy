import { head,issueSignedToken,presignUrl } from "@vercel/blob";
import { NextResponse } from "next/server";
import { session,sameOrigin } from "@/lib/studio/auth";
import { get,redis,limit } from "@/lib/studio/store";
import { PROJECT_TTL,projectSchema } from "@/lib/analysis/project";
import {outputRecordSchema,outputUploadInput,validOutputPath,type OutputRecord} from "@/lib/analysis/outputs";

export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex,nofollow"};
const json=(v:unknown,s=200)=>NextResponse.json(v,{status:s,headers});
const projectKey=(id:string)=>`analysis:project:${id}`;
const archiveKey=(id:string)=>`studio:analysis:outputs:${id}`;
const ID=/^[a-f0-9-]{36}$/i;
async function findProject(id:string){
  const raw=await get(projectKey(id));
  if(!raw)return null;
  const p=projectSchema.safeParse(JSON.parse(raw));
  return p.success?p.data:null;
}
export async function GET(request:Request){
  if(!await session().catch(()=>null))return json({error:"UNAUTHORIZED"},401);
  const params=new URL(request.url).searchParams;
  const id=params.get("id")||"";
  if(!ID.test(id))return json({error:"BAD_REQUEST"},400);
  try{
    if(!await findProject(id))return json({error:"PROJECT_NOT_FOUND"},404);
    const raw=await redis(["LRANGE",archiveKey(id),0,199]) as string[];
    const records=raw.flatMap(r=>{
      try{const parsed=outputRecordSchema.safeParse(JSON.parse(r));return parsed.success?[parsed.data]:[]}
      catch{return []}
    });
    const target=params.get("output");
    if(!target)return json({outputs:records});
    const output=records.find(o=>o.id===target);
    if(!output)return json({error:"OUTPUT_NOT_FOUND"},404);
    const token=await issueSignedToken({operations:["get"]});
    const signed=await presignUrl(token,{
      pathname:output.pathname,operation:"get",validUntil:Date.now()+15*60*1000,access:"private",
    });
    return json({url:signed.presignedUrl,expires:Date.now()+15*60*1000,title:output.title});
  }catch{return json({error:"OUTPUT_ARCHIVE_UNAVAILABLE"},503)}
}
export async function POST(request:Request){
  if(!sameOrigin(request))return json({error:"ORIGIN_DENIED"},403);
  const user=await session().catch(()=>null);
  if(!user)return json({error:"UNAUTHORIZED"},401);
  if(Number(request.headers.get("content-length")||0)>5000)return json({error:"TOO_LARGE"},413);
  if(!(await limit(`archive-output:${user.key}`,200,3600).catch(()=>false)))
    return json({error:"RATE_LIMITED"},429);
  let payload:unknown;
  try{payload=await request.json()}catch{return json({error:"BAD_REQUEST"},400)}
  const parsed=outputUploadInput.safeParse(payload);
  if(!parsed.success)return json({error:"BAD_REQUEST"},400);
  const v=parsed.data;
  if(!validOutputPath(v.projectId,v.id,v.format,v.pathname))
    return json({error:"INVALID_OUTPUT_PATH"},400);
  try{
    const p=await findProject(v.projectId);
    if(!p)return json({error:"PROJECT_NOT_FOUND"},404);
    if(v.kind==="capsule"&&(!v.capsuleId||!p.capsules.some(c=>c.id===v.capsuleId)))
      return json({error:"CAPSULE_NOT_FOUND"},400);
    if(v.kind==="episode"&&v.capsuleId)return json({error:"INVALID_EPISODE"},400);
    // Verify the privately uploaded bytes before declaring any output completed.
    const stored=await head(v.pathname,{access:"private"});
    if(!stored||stored.size<=1024||stored.size>5_000_000_000)
      return json({error:"OUTPUT_INVALID"},422);
    const entry:OutputRecord={
      ...v,bytes:stored.size,createdAt:Date.now(),
    };
    const script=[
      "local entries=redis.call('LRANGE',KEYS[1],0,199)",
      "for _,e in ipairs(entries) do local ok,v=pcall(cjson.decode,e); if ok and v.id==ARGV[1] then return 0 end end",
      "redis.call('LPUSH',KEYS[1],ARGV[2])",
      "redis.call('LTRIM',KEYS[1],0,199)",
      "redis.call('EXPIRE',KEYS[1],ARGV[3])",
      "return 1",
    ].join("\n");
    const inserted=Number(await redis(["EVAL",script,1,archiveKey(v.projectId),
      v.id,JSON.stringify(entry),PROJECT_TTL]));
    if(!Number.isFinite(inserted))throw Error("ARCHIVE_FAILED");
    return json({ok:true,output:entry,alreadyArchived:inserted===0});
  }catch{return json({error:"ARCHIVE_FAILED"},503)}
}
