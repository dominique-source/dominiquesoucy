/**
 * Cross-correlation of audio activity envelopes.
 *
 * Positive lag means the same sound occurs later in a camera recording than
 * it does in the master recording, so the camera's timeline offset is +lag.
 *
 * Results below the reliability threshold MUST NOT be applied automatically.
 */
export type Match = {
  lagSeconds:number;
  correlation:number;
  confidence:"strong"|"moderate"|"unreliable";
  separation:number;
};
export const SYNC_RATE=20;
export const MAX_LAG_SECONDS=18;
export type ScanRegion="start"|"middle"|"end";
/** Pick a bounded media-time search window; end scans must seek near the end. */
export function scanRegionStart(duration:number,region:ScanRegion,windowSeconds=44):number {
  if(!Number.isFinite(duration)||duration<=0)return 0;
  const length=Math.max(1,Math.min(windowSeconds,duration));
  if(region==="end")return Math.max(0,duration-length-1);
  if(region==="middle")return Math.max(0,(duration-length)/2);
  return 0;
}
const finite=(n:number)=>Number.isFinite(n)?n:0;

export function matchEnvelopes(reference:readonly number[],source:readonly number[],
  rate=SYNC_RATE,maxLagSeconds=MAX_LAG_SECONDS):Match {
  if(reference.length<rate*8 || source.length<rate*8)
    return {lagSeconds:0,correlation:0,confidence:"unreliable",separation:0};
  const maxLag=Math.min(Math.floor(maxLagSeconds*rate),reference.length-1,source.length-1);
  const minimum=Math.min(reference.length,source.length,Math.max(rate*8,Math.floor(Math.min(reference.length,source.length)*.38)));
  const scores:Array<{lag:number;correlation:number}>=[];
  for(let lag=-maxLag;lag<=maxLag;lag++){
    const refStart=Math.max(0,-lag),sourceStart=Math.max(0,lag);
    const length=Math.min(reference.length-refStart,source.length-sourceStart);
    if(length<minimum)continue;
    let sx=0,sy=0,sxx=0,syy=0,sxy=0;
    for(let i=0;i<length;i++){
      const x=finite(reference[refStart+i]),y=finite(source[sourceStart+i]);
      sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y;
    }
    const covariance=sxy-sx*sy/length;
    const dx=sxx-sx*sx/length,dy=syy-sy*sy/length;
    const correlation=dx>1e-8&&dy>1e-8?covariance/Math.sqrt(dx*dy):0;
    scores.push({lag,correlation:finite(correlation)});
  }
  const sorted=[...scores].sort((a,b)=>b.correlation-a.correlation);
  const best=sorted[0]||{lag:0,correlation:0};
  // Compare with second best outside the same local peak (>= 1 second away).
  const competitor=sorted.find(x=>Math.abs(x.lag-best.lag)>=rate);
  const separation=best.correlation-(competitor?.correlation??0);
  const strength=best.correlation>=.68&&separation>=.12?"strong":
    best.correlation>=.53&&separation>=.08?"moderate":"unreliable";
  return {lagSeconds:Math.round(best.lag/rate*20)/20,
    correlation:Math.round(best.correlation*1000)/1000,
    confidence:strength,separation:Math.round(separation*1000)/1000};
}

export function interpolateEnvelope(samples:readonly {at:number;level:number}[],
  seconds:number,rate=SYNC_RATE):number[]{
  const valid=samples.filter(s=>Number.isFinite(s.at)&&Number.isFinite(s.level)&&s.at>=0)
    .sort((a,b)=>a.at-b.at);
  if(valid.length<2)return [];
  const count=Math.floor(Math.min(seconds,valid[valid.length-1].at)*rate);
  const out:number[]=[];
  let j=0;
  for(let i=0;i<count;i++){
    const t=i/rate;
    while(j+1<valid.length&&valid[j+1].at<t)j++;
    const left=valid[j],right=valid[Math.min(j+1,valid.length-1)];
    const factor=right.at>left.at?Math.max(0,Math.min(1,(t-left.at)/(right.at-left.at))):0;
    out.push(left.level*(1-factor)+right.level*factor);
  }
  return out;
}
