"use client";
/** Transparent standalone graphics, rendered in local browser memory. */
export type BubblePngInput={
 style:"conversation"|"quote"|"rafale";question:string;caption:string;
 journalistName?:string;journalistOutlet?:string;
 questionAttribution?:"verified"|"reconstructed";portraitFile?:File|null;
};
export const BUBBLE_PNG_WIDTH=1600, BUBBLE_PNG_HEIGHT=900;
const FONT='"Barlow Condensed","Arial Narrow",Impact,Arial,sans-serif';
function rounded(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
 c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);
 c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
 c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);
 c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();
}
function glass(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){
 c.save();rounded(c,x,y,w,h,48);c.shadowColor="rgba(204,255,0,.60)";c.shadowBlur=40;
 c.lineWidth=6;c.strokeStyle="#CCFF00";c.stroke();c.shadowBlur=0;
 const g=c.createLinearGradient(x,y,x+w,y+h);
 g.addColorStop(0,"rgba(92,97,105,.94)");g.addColorStop(.24,"rgba(30,33,38,.97)");
 g.addColorStop(.66,"rgba(2,3,4,.98)");g.addColorStop(1,"rgba(33,47,12,.97)");
 rounded(c,x,y,w,h,48);c.fillStyle=g;c.fill();
 rounded(c,x+3,y+3,w-6,h-6,45);c.lineWidth=3;c.strokeStyle="rgba(244,244,239,.77)";c.stroke();
 c.clip();
 const sheen=c.createLinearGradient(x,y,x+w*.65,y+h*.75);
 sheen.addColorStop(0,"rgba(255,255,255,.34)");
 sheen.addColorStop(.42,"rgba(255,255,255,.06)");
 sheen.addColorStop(1,"rgba(255,255,255,0)");
 c.fillStyle=sheen;c.beginPath();c.moveTo(x,y);c.lineTo(x+w*.76,y);
 c.lineTo(x+w*.13,y+h);c.lineTo(x,y+h);c.closePath();c.fill();
 c.restore();
}
function ribbon(c:CanvasRenderingContext2D,t:string,x:number,y:number,w:number){
 c.save();c.translate(x,y);c.transform(1,0,-.14,1,0,0);
 c.fillStyle="#CCFF00";c.fillRect(0,0,w,77);
 c.font="italic 900 43px "+FONT;c.fillStyle="#080a06";c.textBaseline="middle";
 c.fillText(t,20,38,w-36);c.restore();
}
function fitLines(c:CanvasRenderingContext2D,t:string,w:number,maxLines:number,size:number){
 c.font="italic 900 "+size+"px "+FONT;
 const lines:string[]=[];let line="";
 for(const word of t.replace(/\s+/g," ").trim().split(" ")){
  const next=line?line+" "+word:word;
  if(c.measureText(next).width<=w)line=next;
  else{if(line)lines.push(line);line=word;}
  if(lines.length>=maxLines)break;
 }
 if(line&&lines.length<maxLines)lines.push(line);
 return lines;
}
function writing(c:CanvasRenderingContext2D,t:string,x:number,y:number,w:number,h:number,start:number){
 let size=start,lines:string[]=[];
 for(;size>30;size-=3){
  lines=fitLines(c,t,w,6,size);
  if(lines.length*size*1.15<h&&lines.every(l=>c.measureText(l).width<=w))break;
 }
 c.fillStyle="#F4F4EF";c.font="italic 900 "+size+"px "+FONT;
 c.textBaseline="top";c.shadowColor="#080808";c.shadowBlur=9;
 lines.forEach((l,i)=>c.fillText(l,x,y+i*size*1.14,w));
 c.shadowBlur=0;
}
async function portrait(c:CanvasRenderingContext2D,file:File,x:number,y:number,w:number,h:number){
 const url=URL.createObjectURL(file),img=new Image();
 try{
  await new Promise<void>((ok,no)=>{img.onload=()=>ok();img.onerror=()=>no(Error("PORTRAIT_READ_FAILED"));img.src=url;});
  c.save();rounded(c,x,y,w,h,24);c.clip();
  const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight);
  const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
  c.filter="grayscale(1)";c.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);c.filter="none";
  const fade=c.createLinearGradient(x,y,x+w*.7,y);
  fade.addColorStop(0,"rgba(7,8,9,.68)");fade.addColorStop(1,"rgba(7,8,9,0)");
  c.fillStyle=fade;c.fillRect(x,y,w,h);c.restore();
 }finally{URL.revokeObjectURL(url);}
}
export async function createTransparentBubblePng(v:BubblePngInput):Promise<Blob>{
 const content=(v.style==="quote"?v.caption:v.question).trim();
 if(!content)throw Error("BUBBLE_TEXT_REQUIRED");
 const canvas=document.createElement("canvas");
 canvas.width=BUBBLE_PNG_WIDTH;canvas.height=BUBBLE_PNG_HEIGHT;
 const c=canvas.getContext("2d");if(!c)throw Error("CANVAS_UNAVAILABLE");
 if(document.fonts?.ready)await document.fonts.ready;
 // No full-canvas paint: the surroundings are truly transparent.
 if(v.style==="rafale"){
  const questions=v.question.split("\n").map(s=>s.trim()).filter(Boolean).slice(0,3);
  const height=questions.length===3?226:questions.length===2?320:560;
  const gap=28,total=questions.length*height+(questions.length-1)*gap;
  questions.forEach((q,i)=>{
   const y=(900-total)/2+i*(height+gap);glass(c,75,y,1450,height);
   ribbon(c,String(i+1).padStart(2,"0"),130,y+36,155);
   writing(c,q,355,y+(height===226?55:120),1110,height-94,height===226?65:94);
  });
 }else{
  glass(c,80,115,1440,660);
  if(v.style==="quote"){
   ribbon(c,"LA RÉPONSE",140,180,475);
   writing(c,"« "+v.caption.trim()+" »",145,323,1290,366,99);
  }else{
   const verified=v.questionAttribution==="verified";
   ribbon(c,verified?"QUESTION — JOURNALISTE":"QUESTION PROPOSÉE",145,174,760);
   const attribution=[v.journalistName?.trim(),v.journalistOutlet?.trim()].filter(Boolean).join(" / ");
   if(attribution){c.font="italic 700 37px "+FONT;c.fillStyle="#EDEDEB";c.textBaseline="top";c.fillText(attribution,155,285,1230);}
   const hasPhoto=!!v.portraitFile;
   writing(c,"« "+v.question.trim()+" »",155,attribution?366:316,hasPhoto?900:1270,335,hasPhoto?71:83);
   if(!verified){c.font="italic 700 27px "+FONT;c.fillStyle="#DADEDA";c.fillText("RECONSTITUTION ÉDITORIALE",155,698);}
   if(v.portraitFile)await portrait(c,v.portraitFile,1172,265,265,393);
  }
 }
 return await new Promise<Blob>((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error("PNG_ENCODING_FAILED")),"image/png"));
}
export function downloadBubblePng(blob:Blob,filename:string){
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),3000);
}
