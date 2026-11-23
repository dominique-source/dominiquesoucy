/**
 * Exact transcript-to-audio matching. No inferred / fabricated timestamps.
 * The word list belongs to the ORIGINAL transcription audio, not a camera.
 */
export type TimedWord = {word:string;start:number;end:number};
export type ClipRange = {start:number;end:number};
const tokenize=(text:string)=>text.toLocaleLowerCase("fr").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g,"").match(/[a-z0-9]+/g)||[];

export function findQuotedRange(excerpt:string,words:readonly TimedWord[]):ClipRange|null {
  const sought=tokenize(excerpt);
  if(sought.length<4 || words.length===0)return null;
  const tokens:Array<{text:string;index:number}>=[];
  words.forEach((w,i)=>tokenize(w.word).forEach(t=>tokens.push({text:t,index:i})));
  if(tokens.length<sought.length)return null;
  const hits:Array<{start:number;end:number}>=[];
  outer:for(let i=0;i<=tokens.length-sought.length;i++){
    for(let j=0;j<sought.length;j++)if(tokens[i+j].text!==sought[j])continue outer;
    const first=words[tokens[i].index],last=words[tokens[i+sought.length-1].index];
    if(!Number.isFinite(first.start)||!Number.isFinite(last.end)||last.end<=first.start)continue;
    hits.push({start:first.start,end:last.end});
    if(hits.length>1)return null; // repeated identical phrases are ambiguous
  }
  return hits.length===1?hits[0]:null;
}

export function toProjectRange(range:ClipRange,sourceOffset:number,duration:number):ClipRange|null {
  // sourceTime(t) = t + offset. Therefore projectTime = audioTime - offset.
  if(!Number.isFinite(sourceOffset)||!Number.isFinite(duration)||duration<=0)return null;
  const start=Math.max(0,Math.round((range.start-sourceOffset-.18)*10)/10);
  const end=Math.min(duration,Math.round((range.end-sourceOffset+.22)*10)/10);
  return end>start&&end-start<=600 ? {start,end} : null;
}
