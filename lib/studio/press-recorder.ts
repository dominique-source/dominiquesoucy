"use client";
/** Explicit local recording of microphone plus synthesized journalist voices.
 * Stores small chunks to IndexedDB so a disrupted session may be recoverable.
 * Never sends raw recording to the app server.
 */
type SavedChunk={id:string;index:number;blob:Blob;date:number;mime:string};
const DB="dom-soucy-press-audio-v1";
const STORE="chunks";
function database():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{req.result.createObjectStore(STORE,{keyPath:["id","index"]})};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error("DB_UNAVAILABLE"));
 });
}
async function put(chunk:SavedChunk){
 const db=await database();
 try{
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(STORE,"readwrite");
   tx.objectStore(STORE).put(chunk);
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error);
  });
 }finally{db.close()}
}
export async function recentTake():Promise<{id:string;date:number;mime:string;chunks:Blob[]}|null>{
 const db=await database();
 try{
  const all=await new Promise<SavedChunk[]>((resolve,reject)=>{
   const tx=db.transaction(STORE,"readonly");
   const req=tx.objectStore(STORE).getAll();
   req.onsuccess=()=>resolve(req.result as SavedChunk[]);
   req.onerror=()=>reject(req.error);
  });
  if(!all.length)return null;
  const id=all.reduce((best,x)=>x.date>best.date?x:{id:best.id,date:best.date} as SavedChunk,all[0]).id;
  const matches=all.filter(x=>x.id===id).sort((a,b)=>a.index-b.index);
  return {id,date:matches[0].date,mime:matches[0].mime,chunks:matches.map(x=>x.blob)};
 }finally{db.close()}
}
export function downloadAudio(blob:Blob,filename:string){
 const url=URL.createObjectURL(blob);
 const link=document.createElement("a");link.href=url;link.download=filename;
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export class PressRecorder{
 private context:AudioContext;
 private destination:MediaStreamAudioDestinationNode;
 private recorder:MediaRecorder;
 private chunks:Blob[]=[];
 private index=0;
 private id=crypto.randomUUID();
 private pending:Promise<void>[]=[];
 private stopped=false;
 private voices:Set<MediaElementAudioSourceNode>=new Set();
 public onError?:(code:string)=>void;
 constructor(microphone:MediaStream){
  if(typeof MediaRecorder==="undefined")throw Error("RECORDER_UNSUPPORTED");
  this.context=new AudioContext();
  this.destination=this.context.createMediaStreamDestination();
  const mic=this.context.createMediaStreamSource(microphone);
  mic.connect(this.destination);
  const type=["audio/webm;codecs=opus","audio/mp4","audio/webm"].find(x=>MediaRecorder.isTypeSupported(x));
  this.recorder=new MediaRecorder(this.destination.stream,type?{mimeType:type}:{});
  this.recorder.ondataavailable=e=>{
   if(!e.data.size)return;
   const index=this.index++;
   this.chunks.push(e.data);
   const promise=put({id:this.id,index,blob:e.data,date:Date.now(),mime:this.recorder.mimeType})
     .catch(()=>this.onError?.("LOCAL_AUDIO_BACKUP_FAILED"));
   this.pending.push(promise);
  };
  this.recorder.onerror=()=>this.onError?.("RECORDING_ERROR");
 }
 async start(){
  await this.context.resume();
  this.recorder.start(10000);
 }
 async playJournalist(file:Blob):Promise<void>{
  if(this.stopped)return;
  const url=URL.createObjectURL(file);
  const audio=new Audio(url);
  const node=this.context.createMediaElementSource(audio);
  node.connect(this.destination);
  node.connect(this.context.destination);
  this.voices.add(node);
  try{
   await audio.play();
   await new Promise<void>((resolve,reject)=>{
    audio.onended=()=>resolve();
    audio.onerror=()=>reject(Error("JOURNALIST_AUDIO_ERROR"));
   });
  }finally{
   audio.pause();audio.src="";audio.load();
   node.disconnect();this.voices.delete(node);
   URL.revokeObjectURL(url);
  }
 }
 async stop():Promise<Blob>{
  if(this.stopped)return new Blob(this.chunks,{type:this.recorder.mimeType});
  this.stopped=true;
  if(this.recorder.state!=="inactive"){
   await new Promise<void>(resolve=>{
    this.recorder.onstop=()=>resolve();
    this.recorder.stop();
   });
  }
  await Promise.allSettled(this.pending);
  this.destination.stream.getTracks().forEach(t=>t.stop());
  await this.context.close().catch(()=>{});
  const mime=this.recorder.mimeType||"audio/webm";
  const blob=new Blob(this.chunks,{type:mime});
  if(!blob.size)throw Error("EMPTY_RECORDING");
  return blob;
 }
 get mime(){return this.recorder.mimeType}
}
