import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { session, sameOrigin } from "@/lib/studio/auth";
import { limit } from "@/lib/studio/store";
import { MAX_PROJECT_MEDIA_BYTES, validProjectMediaPath, sourceIds } from "@/lib/analysis/project";

export const runtime="nodejs";
export const maxDuration=30;
const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex"};
const json=(v:unknown,s=200)=>NextResponse.json(v,{status:s,headers});

export async function POST(request:Request){
  if(Number(request.headers.get("content-length")||0)>16000)return json({error:"BAD_REQUEST"},413);
  let body:HandleUploadBody;
  try{body=await request.json()}catch{return json({error:"BAD_REQUEST"},400)}
  if(!body||!("type" in body))return json({error:"BAD_REQUEST"},400);
  if(body.type==="blob.generate-client-token"){
    if(!sameOrigin(request))return json({error:"ORIGIN_DENIED"},403);
    if(!await session().catch(()=>null))return json({error:"UNAUTHORIZED"},401);
    if(!process.env.BLOB_READ_WRITE_TOKEN&&!process.env.BLOB_STORE_ID)
      return json({error:"BLOB_NOT_CONFIGURED"},503);
  }else if(body.type!=="blob.upload-completed")return json({error:"BAD_REQUEST"},400);
  try{
    const result=await handleUpload({
      request,body,
      onBeforeGenerateToken:async pathname=>{
        const user=await session();
        if(!user||!sameOrigin(request))throw new Error("UNAUTHORIZED");
        const parts=pathname.split("/");
        if(parts.length!==4||!sourceIds.includes(parts[2] as typeof sourceIds[number])||
           !validProjectMediaPath(parts[1],parts[2] as typeof sourceIds[number],pathname))
          throw new Error("INVALID_PATH");
        if(!(await limit(`large-media:${user.key}`,20,3600)))throw new Error("UPLOAD_LIMIT");
        return {
          allowedContentTypes:["video/mp4","video/quicktime","video/webm","video/x-m4v","audio/mpeg","audio/mp4","audio/x-m4a","audio/m4a","audio/wav","audio/x-wav","audio/webm","audio/ogg","audio/flac","application/octet-stream"],
          maximumSizeInBytes:MAX_PROJECT_MEDIA_BYTES,
          addRandomSuffix:false,
          validUntil:Date.now()+15*60*1000,
        };
      },
      onUploadCompleted:async()=>{},
    });
    return json(result);
  }catch(e){
    const message=e instanceof Error?e.message:"UNKNOWN";
    // Never expose upload credentials or private URLs in API responses.
    const code=/UNAUTHORIZED|ORIGIN_DENIED/.test(message)?"UNAUTHORIZED":
      /INVALID_PATH/.test(message)?"INVALID_MEDIA_PATH":
      /UPLOAD_LIMIT/.test(message)?"UPLOAD_RATE_LIMIT":
      /size|large/i.test(message)?"MEDIA_TOO_LARGE":
      /content.type|mime/i.test(message)?"INVALID_MEDIA_TYPE":
      "BLOB_UPLOAD_REJECTED";
    console.error("[studio-media-upload] request rejected",code);
    return json({error:code},code==="UNAUTHORIZED"?401:code==="UPLOAD_RATE_LIMIT"?429:400);
  }
}
