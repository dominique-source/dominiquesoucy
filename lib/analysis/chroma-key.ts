/**
 * CPU chroma key for a reasonably uniform teal/green wall.
 * In-browser and deterministic; this is NOT person segmentation.
 * Pixel buffers are transient and never uploaded.
 */
export type ChromaSettings={
  enabled:boolean;
  color:string;
  tolerance:number;
  softness:number;
  spill:number;
};
export const defaultChroma:ChromaSettings={
  enabled:false,color:"#30b7b0",tolerance:0.16,softness:0.12,spill:0.45,
};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export function rgbFromHex(value:string):[number,number,number]{
  if(!/^#[a-f\d]{6}$/i.test(value))return [48,183,176];
  return [parseInt(value.slice(1,3),16),parseInt(value.slice(3,5),16),parseInt(value.slice(5,7),16)];
}
function chroma(r:number,g:number,b:number){
  const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  const sat=max?delta/max:0;
  let hue=0;
  if(delta>0){
    if(max===r)hue=((g-b)/delta)%6;
    else if(max===g)hue=(b-r)/delta+2;
    else hue=(r-g)/delta+4;
    hue=(hue/6+1)%1;
  }
  return {hue,sat};
}
export function keyPixels(data:Uint8ClampedArray,settings:ChromaSettings):void{
  if(!settings.enabled)return;
  const [kr,kg,kb]=rgbFromHex(settings.color),target=chroma(kr,kg,kb);
  const tolerance=clamp(settings.tolerance),softness=Math.max(.005,clamp(settings.softness));
  const spill=clamp(settings.spill);
  for(let i=0;i<data.length;i+=4){
    const r=data[i],g=data[i+1],b=data[i+2];
    const pixel=chroma(r,g,b);
    const hdiff=Math.min(Math.abs(pixel.hue-target.hue),1-Math.abs(pixel.hue-target.hue));
    // Saturation protects gray and skin highlights. Variable lighting is
    // handled largely by hue, rather than strict RGB equality.
    const hdist=hdiff*2;
    const sdist=Math.abs(pixel.sat-target.sat)*.32;
    const distance=Math.sqrt(hdist*hdist+sdist*sdist);
    const eligible=pixel.sat>.17&&target.sat>.16;
    const keep=eligible?clamp((distance-tolerance)/softness):1;
    const eased=keep*keep*(3-2*keep);
    data[i+3]=Math.round(data[i+3]*eased);
    // Very light spill suppression only on semi-transparent teal edges.
    if(spill>0&&keep>.04&&keep<1&&hdiff<.17){
      const amount=(1-keep)*spill*.4;
      data[i+1]=Math.round(g*(1-amount));
      data[i+2]=Math.round(b*(1-amount));
    }
  }
}
