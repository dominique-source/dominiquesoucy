import {NextResponse} from "next/server";
import {session,sameOrigin} from "@/lib/studio/auth";
import {redis} from "@/lib/studio/store";
import {validCatalog} from "@/lib/media-catalog";
export const dynamic="force-dynamic";
const key="studio:public-media-catalog:v1";
export async function GET(req:Request){try{const admin=new URL(req.url).searchParams.get("admin")==="1";if(admin&&!await session())return NextResponse.json({error:"Unauthorized"},{status:401});const raw=await redis(["GET",key]);const data=raw?JSON.parse(raw):[];if(!validCatalog(data))throw Error("Invalid catalog");return NextResponse.json(admin?data:data.filter(x=>x.visible).map(x=>({...x,shorts:x.shorts.filter(s=>s.visible)})),{headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({error:"Unavailable"},{status:503})}}
export async function PUT(req:Request){try{if(!sameOrigin(req)||!await session())return NextResponse.json({error:"Unauthorized"},{status:403});const raw=await req.text();if(raw.length>1000000)return NextResponse.json({error:"Too large"},{status:413});const data=JSON.parse(raw);if(!validCatalog(data))return NextResponse.json({error:"Invalid title or YouTube URL"},{status:400});await redis(["SET",key,JSON.stringify(data)]);return NextResponse.json({ok:true})}catch{return NextResponse.json({error:"Unavailable"},{status:503})}}
