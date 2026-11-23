import { handleUpload,type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { session,sameOrigin } from "@/lib/studio/auth";
import { get,limit } from "@/lib/studio/store";
import { projectSchema } from "@/lib/analysis/project";
import { validOutputPath,outputMaxBytes } from "@/lib/analysis/outputs";

export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex"};
const json=(v:unknown,s=200)=>NextResponse.json(v,{status:s,headers});
export async function POST(request:Request){
  if(Number(request.headers.get("content-length")||0)>20000)return json({error:"TOO_LARGE"},413);
  let body:HandleUploadBody;
  try{body=await request.json()}catch{return json({error:"BAD_REQUEST"},400)}
  if(!body||!("type" in body))return json({error:"BAD_REQUEST"},400);
  if(body.type==="blob.generate-client-token"){
    if(!sameOrigin(request))return json({error:"ORIGIN_DENIED"},403);
    if(!await session().catch(()=>null))return json({error:"UNAUTHORIZED"},401);
  }else if(body.type!=="blob.upload-completed")return json({error:"BAD_REQUEST"},400);
  if(!process.env.BLOB_READ_WRITE_TOKEN&&!process.env.BLOB_STORE_ID)
    return json({error:"BLOB_NOT_CONFIGURED"},503);
  try{
    const result=await handleUpload({
      body,request,
      onBeforeGenerateToken:async(pathname)=>{
        const user=await session().catch(()=>null);
        if(!user||!sameOrigin(request))throw Error("UNAUTHORIZED");
        const found=/^studio-exports\/([a-f0-9-]{36})\/([a-f0-9-]{36})\/(horizontal|vertical|square)\.mp4$/i.exec(pathname);
        if(!found||!validOutputPath(found[1],found[2],found[3] as "horizontal"|"vertical"|"square",pathname))
          throw Error("INVALID_OUTPUT_PATH");
        const raw=await get(`analysis:project:${found[1]}`);
        if(!raw||!projectSchema.safeParse(JSON.parse(raw)).success)throw Error("PROJECT_NOT_FOUND");
        if(!(await limit(`output-upload:${user.key}`,200,3600)))throw Error("UPLOAD_LIMIT");
        return {
          allowedContentTypes:["video/mp4","application/octet-stream"],
          maximumSizeInBytes:outputMaxBytes,
          addRandomSuffix:false,
          validUntil:Date.now()+15*60*1000,
        };
      },
      onUploadCompleted:async()=>{},
    });
    return json(result);
  }catch(e){
    const code=e instanceof Error?e.message:"UNKNOWN";
    return json({error:code==="UPLOAD_LIMIT"?"UPLOAD_LIMIT":"OUTPUT_UPLOAD_FAILED"},
      code==="UPLOAD_LIMIT"?429:400);
  }
}
