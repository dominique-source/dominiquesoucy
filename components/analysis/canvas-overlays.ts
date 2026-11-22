import type { StudioProject } from "@/lib/analysis/project";
type Capsule=StudioProject["capsules"][number];
export type CanvasVisual=Pick<Capsule,"style"|"background"|"caption"|"bubble"|"textPosition">;
function lines(ctx:CanvasRenderingContext2D,text:string,maxWidth:number,limit=4){
 const words=text.replace(/\s+/g," ").trim().split(" ").filter(Boolean),out:string[]=[];
 let line="";
 for(const word of words){
  const next=line?line+" "+word:word;
  if(ctx.measureText(next).width>maxWidth&&line){out.push(line);line=word}
  else line=next;
  if(out.length>=limit)break;
 }
 if(out.length<limit&&line)out.push(line);
 return out.slice(0,limit);
}
function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.closePath();
}
export function drawStudioFrame(
 ctx:CanvasRenderingContext2D,video:HTMLVideoElement|undefined,
 width:number,height:number,t:number,start:number,visual?:CanvasVisual,cameraZoom=1,
){
 const bg=visual?.background||"original";
 const grad=ctx.createLinearGradient(0,0,width,height);
 grad.addColorStop(0,"#0a0a0a");grad.addColorStop(1,"#263412");
 ctx.fillStyle=bg==="lime"?"#ccff00":bg==="gradient"?grad:"#080808";
 ctx.fillRect(0,0,width,height);
 if(video&&video.readyState>=2&&video.videoWidth&&video.videoHeight){
  const inset=bg==="original"?0:Math.round(Math.min(width,height)*.075);
  const areaW=width-inset*2,areaH=height-inset*2;
  const zoom=(visual?.style==="quote"?1.08:1)*Math.min(1.25,Math.max(1,cameraZoom));
  const scale=Math.max(areaW/video.videoWidth,areaH/video.videoHeight)*zoom;
  const w=video.videoWidth*scale,h=video.videoHeight*scale;
  ctx.save();ctx.beginPath();ctx.rect(inset,inset,areaW,areaH);ctx.clip();
  ctx.drawImage(video,inset+(areaW-w)/2,inset+(areaH-h)/2,w,h);
  ctx.restore();
 }
 if(!visual)return;
 const u=Math.max(0,t-start);
 const fade=Math.min(1,u/.55);
 const size=Math.max(22,Math.round(width*.047));
 const pad=Math.round(width*.065);
 ctx.save();
 ctx.globalAlpha=fade;
 ctx.textAlign="left";
 ctx.font=`900 italic ${Math.round(width*.035)}px Impact,Arial,sans-serif`;
 ctx.fillStyle="#ccff00";
 ctx.fillText("DOM SOUCY MEDIA",pad,pad+25);
 const main=(visual.caption||"").trim().slice(0,230);
 if(main){
  const y=visual.textPosition==="top"?Math.round(height*.22):visual.textPosition==="center"?Math.round(height*.46):Math.round(height*.72);
  ctx.font=`900 ${size}px Impact,Arial,sans-serif`;
  const content=lines(ctx,main,width-pad*2,5);
  const lineHeight=Math.round(size*1.16);
  const boxHeight=content.length*lineHeight+pad*.7;
  ctx.fillStyle="rgba(2,5,2,.84)";
  rounded(ctx,pad*.55,y-pad*.65,width-pad*1.1,boxHeight,18);ctx.fill();
  content.forEach((line,i)=>{
    ctx.fillStyle=i===0?"#ccff00":"#f4f4ef";
    ctx.fillText(line,pad,y+i*lineHeight+size*.42);
  });
 }
 const bubble=(visual.bubble||"").trim().slice(0,180);
 if(bubble&&visual.style==="conversation"){
  const bSize=Math.round(size*.72);
  ctx.font=`700 ${bSize}px Arial,sans-serif`;
  const rows=lines(ctx,bubble,width-pad*3,3);
  const bHeight=rows.length*bSize*1.3+pad*.7;
  const x=pad,y=Math.round(height*.12);
  ctx.fillStyle="#f4f4ef";rounded(ctx,x,y,width-pad*2,bHeight,21);ctx.fill();
  rows.forEach((row,i)=>{ctx.fillStyle="#111";ctx.fillText(row,x+pad*.6,y+pad*.5+i*bSize*1.3)});
 }
 ctx.restore();
}
