import { NextResponse } from "next/server";
import { z } from "zod";
import { session, sameOrigin } from "@/lib/studio/auth";
import { limit } from "@/lib/studio/store";
import { sourcePassages } from "@/lib/analysis/passages";

export const runtime="nodejs";
export const maxDuration=60;
const json=(value:unknown,status=200)=>NextResponse.json(value,{
 status,headers:{"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"}
});
const input=z.object({transcript:z.string().min(100).max(26000),lang:z.enum(["fr","en"])}).strict();
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:"ORIGIN_DENIED"},403);
 const user=await session().catch(()=>null);
 if(!user)return json({error:"UNAUTHORIZED"},401);
 if(!process.env.OPENAI_API_KEY)return json({error:"AI_NOT_CONFIGURED"},503);
 if(!(await limit(`question-reconstruction:${user.key}`,15,3600).catch(()=>false)))return json({error:"RATE_LIMITED"},429);
 let raw:unknown;
 try{raw=await request.json()}catch{return json({error:"BAD_REQUEST"},400)}
 const parsed=input.safeParse(raw);
 if(!parsed.success)return json({error:"BAD_REQUEST"},400);
 const excerpts=sourcePassages(parsed.data.transcript);
 if(excerpts.length<2)return json({error:"INSUFFICIENT_TRANSCRIPT"},422);
 try{
  const response=await fetch("https://api.openai.com/v1/responses",{
   method:"POST",headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
   signal:AbortSignal.timeout(40000),
   body:JSON.stringify({
    model:process.env.OPENAI_SUMMARY_MODEL||"gpt-4.1-mini",store:false,max_output_tokens:1100,
    text:{format:{type:"json_schema",name:"reconstructed_press_questions",strict:true,
     schema:{type:"object",additionalProperties:false,required:["proposals"],
      properties:{proposals:{type:"array",items:{type:"object",additionalProperties:false,
       required:["passage_id","question","journalist"],properties:{
        passage_id:{type:"integer"},question:{type:"string"},journalist:{type:"integer"}
       }}}}}}},
    instructions:`You are a careful press interview editor. Propose 3-8 plausible questions that MAY have preceded the provided answers in ${parsed.data.lang==="fr"?"Quebec French":"English"}. DO NOT claim these are the questions actually spoken. No fabrication of interview audio, timeline, or factual claims. Each proposal must cite an exact numbered answer passage_id. Use journalists 0, 1 or 2 and rotate them. Questions should connect tightly to the answer, one sentence each, neutral but probing, <=160 characters. Return only JSON.`,
    input:excerpts.map(p=>`[${p.id}] ${p.text}`).join("\n").slice(0,22000),
   }),
  });
  if(!response.ok)return json({error:"QUESTION_AI_UNAVAILABLE"},502);
  const data=await response.json();
  if(data.status!=="completed")return json({error:"AI_INCOMPLETE"},502);
  const value=(data.output||[]).flatMap((x:{content?:Array<{type:string;text?:string}>})=>x.content||[])
    .filter((x:{type:string})=>x.type==="output_text").map((x:{text?:string})=>x.text||"").join("");
  const shape=z.object({proposals:z.array(z.object({passage_id:z.number().int().positive(),question:z.string().min(8).max(300),journalist:z.number().int().min(0).max(2)})).max(12)});
  const result=shape.safeParse(JSON.parse(value));
  if(!result.success)return json({error:"AI_INVALID_OUTPUT"},502);
  const index=new Map(excerpts.map(x=>[x.id,x.text]));
  const used=new Set<number>();
  const proposals=result.data.proposals.flatMap(x=>{
   const answer=index.get(x.passage_id);
   if(!answer||used.has(x.passage_id))return [];
   used.add(x.passage_id);
   return [{id:crypto.randomUUID(),question:x.question.slice(0,300),journalist:x.journalist,
    answerExcerpt:answer.slice(0,330),label:"QUESTION_RECONSTRUITE_NON_ORIGINALE"}];
  }).slice(0,8);
  return json({proposals,notice:"EDITING_SUGGESTIONS_NOT_REAL_JOURNALIST_SPEECH"});
 }catch{return json({error:"QUESTION_RECONSTRUCTION_FAILED"},503)}
}
