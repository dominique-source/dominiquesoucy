import type { StudioProject } from "@/lib/analysis/project";
import { keyPixels } from "@/lib/analysis/chroma-key";
type Capsule=StudioProject["capsules"][number];
export type CanvasVisual=Pick<Capsule,"style"|"background"|"caption"|"bubble"|"textPosition"|"keying">&{backgroundUrl?:string};
const backgroundCache=new Map<string,HTMLImageElement>();
export async function preloadStudioBackground(url:string){
  if(!url.startsWith("/assets/studio/backdrops/"))throw Error("INVALID_STUDIO_BACKGROUND");
  let image=backgroundCache.get(url);
  if(!image){image=new Image();backgroundCache.set(url,image);image.src=url}
  if(image.complete&&image.naturalWidth>0)return image;
  try{await image.decode()}catch{throw Error("STUDIO_BACKGROUND_NOT_FOUND")}
  if(!image.naturalWidth)throw Error("STUDIO_BACKGROUND_NOT_FOUND");
  return image;
}

const matteCache=new WeakMap<CanvasRenderingContext2D,HTMLCanvasElement>();
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
function drawSignatureWall(ctx:CanvasRenderingContext2D,w:number,h:number){
  ctx.fillStyle="#070907";ctx.fillRect(0,0,w,h);
  const glow=ctx.createRadialGradient(w*.55,h*.28,w*.02,w*.55,h*.28,w*.84);
  glow.addColorStop(0,"#26321b");glow.addColorStop(1,"#070907");
  ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  ctx.save();
  ctx.globalAlpha=.28;
  ctx.font=`900 ${Math.round(w*.034)}px Impact,Arial,sans-serif`;
  ctx.textAlign="center";
  for(let row=0;row<5;row++){
    for(let col=0;col<4;col++){
      const x=(col+.5)*w/4+(row%2?w/16:0);
      const y=(row+.5)*h/5;
      ctx.fillStyle=(row+col)%3===0?"#ccff00":"#b5bbaf";
      ctx.fillText("DS / MEDIA",x,y);
      ctx.fillStyle="#5f7050";ctx.fillRect(x-w*.045,y+8,w*.09,2);
    }
  }
  ctx.restore();
  ctx.fillStyle="#ccff00";ctx.fillRect(0,0,w*.012,h);
  ctx.save();ctx.globalAlpha=.52;
  ctx.strokeStyle="#a6cc33";ctx.lineWidth=Math.max(1,w*.001);
  ctx.strokeRect(w*.025,h*.045,w*.95,h*.91);
  ctx.restore();
}
function drawKeyedVideo(
 ctx:CanvasRenderingContext2D,video:HTMLVideoElement,
 x:number,y:number,areaW:number,areaH:number,zoom:number,
 settings:NonNullable<CanvasVisual["keying"]>,
){
  const pixelWidth=Math.max(1,Math.min(640,Math.round(areaW)));
  const pixelHeight=Math.max(1,Math.round(pixelWidth*areaH/areaW));
  let source=matteCache.get(ctx);
  if(!source){source=document.createElement("canvas");matteCache.set(ctx,source)}
  if(source.width!==pixelWidth)source.width=pixelWidth;
  if(source.height!==pixelHeight)source.height=pixelHeight;
  const painter=source.getContext("2d",{willReadFrequently:true});
  if(!painter)throw Error("CHROMA_CANVAS_UNAVAILABLE");
  painter.clearRect(0,0,pixelWidth,pixelHeight);
  const scale=Math.max(pixelWidth/video.videoWidth,pixelHeight/video.videoHeight)*zoom;
  const w=video.videoWidth*scale,h=video.videoHeight*scale;
  painter.drawImage(video,(pixelWidth-w)/2,(pixelHeight-h)/2,w,h);
  const frame=painter.getImageData(0,0,pixelWidth,pixelHeight);
  keyPixels(frame.data,settings);
  painter.putImageData(frame,0,0);
  ctx.drawImage(source,x,y,areaW,areaH);
}
export function drawStudioFrame(
 ctx:CanvasRenderingContext2D,video:HTMLVideoElement|undefined,
 width:number,height:number,t:number,start:number,visual?:CanvasVisual,
){
 const bg=visual?.background||"original";
 const grad=ctx.createLinearGradient(0,0,width,height);
 grad.addColorStop(0,"#0a0a0a");grad.addColorStop(1,"#263412");
 ctx.fillStyle=bg==="lime"?"#ccff00":bg==="gradient"?grad:"#080808";
 ctx.fillRect(0,0,width,height);
 if(video&&video.readyState>=2&&video.videoWidth&&video.videoHeight){
  const inset=bg==="original"?0:Math.round(Math.min(width,height)*.075);
  const areaW=width-inset*2,areaH=height-inset*2;
  const zoom=visual?.style==="quote"?1.12:1;
  const scale=Math.max(areaW/video.videoWidth,areaH/video.videoHeight)*zoom;
  const w=video.videoWidth*scale,h=video.videoHeight*scale;
  ctx.save();ctx.beginPath();ctx.rect(inset,inset,areaW,areaH);ctx.clip();
  if(visual?.keying?.enabled){
    drawKeyedVideo(ctx,video,inset,inset,areaW,areaH,zoom,visual.keying);
  }else{
    ctx.drawImage(video,inset+(areaW-w)/2,inset+(areaH-h)/2,w,h);
  }
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
