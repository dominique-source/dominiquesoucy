"use client";
import { useEffect,useRef,useState } from "react";
import { renderLocalMp4 } from "./local-mp4";
import { createProductionPlan,renderFormat,type RenderJob } from "@/lib/analysis/production-plan";
import type { OutputFormat } from "@/lib/analysis/outputs";
import { cameraKeys,proposeMulticamCuts,type CameraKey,type Cut,type SourceFiles,type SourceKey } from "@/lib/analysis/multicam";
import { canProduceLegacyCapsule, type StudioProject } from "@/lib/analysis/project";

type Capsule=StudioProject["capsules"][number];
type JobStatus={job:RenderJob;state:"queued"|"rendering"|"saved"|"download"|"failed";progress:number;error?:string};
type LocalOutput={id:string;title:string;filename:string;url:string|null;bytes:number};
type DirectoryHandle={
  getFileHandle:(name:string,options:{create:boolean})=>Promise<{
    createWritable:()=>Promise<{write:(data:Blob)=>Promise<void>;close:()=>Promise<void>}>
  }>
};
const formats:OutputFormat[]=["horizontal","vertical","square"];
const formatLabels:Record<OutputFormat,string>={
  horizontal:"16:9 · YouTube",vertical:"9:16 · Reels / Shorts",square:"1:1",
};
const safeName=(value:string)=>value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
  .replace(/[^a-zA-Z0-9_-]/g,"-").replace(/-+/g,"-").slice(0,55)||"video";

export function ProductionBatch({
  lang,projectId,name,capsules,duration,mediaFiles,offsets,audioSource,finalAudioSource,
  episodeCuts,getNodes,backdrops,
}:{
  lang:"fr"|"en";projectId:string;name:string;capsules:Capsule[];
  duration:number;mediaFiles:SourceFiles;
  offsets:Record<SourceKey,number>;audioSource:SourceKey;finalAudioSource:SourceKey;
  episodeCuts:Cut[];
  getNodes:()=>Partial<Record<SourceKey,HTMLMediaElement|null>>;
  backdrops:Record<string,string>;
}){
  const fr=lang==="fr";
  const [selected,setSelected]=useState<string[]>(()=>capsules.filter(c=>c.end>c.start).map(c=>c.id));
  const [selectedFormats,setSelectedFormats]=useState<OutputFormat[]>(["horizontal","vertical"]);
  const [includeEpisode,setIncludeEpisode]=useState(true);
  const [jobs,setJobs]=useState<JobStatus[]>([]);
  const [completed,setCompleted]=useState<LocalOutput[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [directoryMode,setDirectoryMode]=useState(false);
  const cancel=useRef(false);
  const createdUrls=useRef<string[]>([]);
  useEffect(()=>()=>{for(const url of createdUrls.current)URL.revokeObjectURL(url)},[]);
  const validCapsules=capsules.filter(c=>c.end>c.start&&c.end<=duration&&canProduceLegacyCapsule(c));
  const cameras=cameraKeys.filter(k=>!!mediaFiles[k]);
  const canRender=cameras.length>0&&!!mediaFiles[audioSource]&&!!mediaFiles[finalAudioSource];
  const toggleFormat=(format:OutputFormat)=>setSelectedFormats(old=>
    old.includes(format)?old.filter(x=>x!==format):[...old,format]);
  const toggleCapsule=(id:string)=>setSelected(old=>old.includes(id)?
    old.filter(x=>x!==id):[...old,id]);
  const requested=createProductionPlan({capsules,selectedIds:selected,formats:selectedFormats,includeEpisode,duration,lang});
  const updateJob=(id:string,patch:Partial<JobStatus>)=>setJobs(old=>old.map(j=>
    j.job.id===id?{...j,...patch}:j));

  async function produce(retryFailed=false){
    if(busy)return;
    setError("");
    if(!canRender){
      setError(fr?"Sélectionne tes fichiers audio et vidéo locaux avant de lancer le lot.":
        "Select your local audio and video files before starting.");
      return;
    }
    const plan=retryFailed?jobs.filter(j=>j.state==="failed"&&
      (j.job.capsuleId===null||validCapsules.some(c=>c.id===j.job.capsuleId)))
      .map(j=>({...j.job,id:crypto.randomUUID()})):requested;
    if(!plan.length){
      setError(fr?"Sélectionne au moins une vidéo et un format.":"Select at least one video and format.");
      return;
    }
    // Native folder picker is called before the first asynchronous operation;
    // users can choose a Google Drive-synced directory with supported browsers.
    const picker=(window as Window&{
      showDirectoryPicker?:()=>Promise<DirectoryHandle>
    }).showDirectoryPicker;
    let directory:DirectoryHandle|null=null;
    if(picker){
      try{directory=await picker.call(window)}
      catch(e){
        if(e instanceof Error&&e.name==="AbortError")return;
        // Unsupported provider/folder: fall back to manual downloads.
      }
    }
    setDirectoryMode(!!directory);
    setJobs(plan.map(job=>({job,state:"queued",progress:0})));
    setBusy(true);cancel.current=false;
    const nodes=getNodes();
    try{
      for(const job of plan){
        if(cancel.current)break;
        if(job.end-job.start>600){
          updateJob(job.id,{state:"failed",error:fr?
            "Limite actuelle de 10 minutes par rendu navigateur.":
            "Current browser rendering limit is 10 minutes."});
          continue;
        }
        const capsule=job.capsuleId?capsules.find(c=>c.id===job.capsuleId):undefined;
        const primary=(cameras.includes("main")?"main":cameras[0]) as CameraKey;
        const cuts=capsule?(capsule.cameraCuts?.length?capsule.cameraCuts:proposeMulticamCuts({
          start:job.start,end:job.end,available:cameras,primary,
        })):episodeCuts;
        updateJob(job.id,{state:"rendering",progress:0});
        try{
          const blob=await renderLocalMp4({
            nodes,offsets,audioSource,finalAudioSource,cuts,fallback:primary,
            duration,start:job.start,end:job.end,format:renderFormat(job.format),
            visual:capsule?{
              style:capsule.style,background:capsule.background,caption:capsule.caption,
              bubble:capsule.bubble,textPosition:capsule.textPosition,keying:capsule.keying,
              backgroundUrl:backdrops[capsule.id],
            }:undefined,
            onProgress:progress=>updateJob(job.id,{progress}),
          });
          if(cancel.current)break;
          const filename=`${safeName(name)}-${safeName(job.title)}-${job.format}-${job.id.slice(0,8)}.mp4`;
          if(directory){
            const handle=await directory.getFileHandle(filename,{create:true});
            const writer=await handle.createWritable();
            try{await writer.write(blob);await writer.close()}
            catch(e){try{await writer.close()}catch{};throw e}
            setCompleted(old=>[...old,{id:job.id,title:job.title,filename,url:null,bytes:blob.size}]);
            updateJob(job.id,{state:"saved",progress:100});
          }else{
            const url=URL.createObjectURL(blob);
            createdUrls.current.push(url);
            setCompleted(old=>[...old,{id:job.id,title:job.title,filename,url,bytes:blob.size}]);
            updateJob(job.id,{state:"download",progress:100});
          }
        }catch(e){
          updateJob(job.id,{state:"failed",error:e instanceof Error?e.message:"RENDER_FAILED"});
        }
      }
    }finally{setBusy(false);cancel.current=false}
  }
  const success=jobs.filter(j=>j.state==="saved"||j.state==="download").length;
  const failed=jobs.filter(j=>j.state==="failed").length;
  return <section className="analysis-panel studio-step" id="studio-production-batch">
    <div className="analysis-panel-head">
      <h2>08 / {fr?"PRODUCTION LOCALE":"LOCAL PRODUCTION"}</h2>
      <span>{completed.length} MP4 {fr?"PRÉPARÉS":"PREPARED"}</span>
    </div>
    <p>{fr?
      "Les fichiers vidéo restent sur ton ordinateur. Choisis un dossier de destination (par exemple Google Drive synchronisé) : les MP4 y seront enregistrés au fur et à mesure, sans passer par Vercel Blob.":
      "Video files stay on your device. Choose a destination folder (such as synchronized Google Drive); MP4s are saved there as they finish, without Vercel Blob."}</p>
    <div className="studio-auto-edit-panel">
      <strong>{fr?"VIDÉOS À PRODUIRE":"VIDEOS TO PRODUCE"}</strong>
      <label><input type="checkbox" disabled={busy} checked={includeEpisode}
        onChange={e=>setIncludeEpisode(e.target.checked)}/> {fr?"Émission complète":"Full episode"} ({Math.round(duration)} s)</label>
      {validCapsules.map(c=><label key={c.id} style={{display:"block",marginTop:8}}>
        <input type="checkbox" disabled={busy} checked={selected.includes(c.id)} onChange={()=>toggleCapsule(c.id)}/>
        {" "}{c.title} · {Math.round(c.end-c.start)} s
      </label>)}
      <div className="studio-auto-edit-actions">
        {formats.map(format=><label key={format}>
          <input type="checkbox" disabled={busy} checked={selectedFormats.includes(format)}
            onChange={()=>toggleFormat(format)}/> {formatLabels[format]}
        </label>)}
      </div>
      <p className="analysis-note">{fr?`${requested.length} exports prévus · ${validCapsules.length} capsules disponibles`:
        `${requested.length} planned exports · ${validCapsules.length} available clips`}</p>
      <button className="analysis-primary" type="button" disabled={busy||!requested.length}
        onClick={()=>{void produce()}}>
        {busy?(fr?"RENDU LOCAL EN COURS…":"LOCAL RENDERING…"):
          fr?`✦ PRODUIRE ${requested.length} MP4 LOCALEMENT`:`✦ PRODUCE ${requested.length} MP4 LOCALLY`}
      </button>
      {!busy&&failed>0&&<button type="button" className="analysis-secondary"
        onClick={()=>void produce(true)}>
        {fr?`RELANCER LES ${failed} ÉCHECS`:`RETRY ${failed} FAILURES`}
      </button>}
      {busy&&<button type="button" className="analysis-secondary" onClick={()=>{cancel.current=true}}>
        {fr?"ARRÊTER APRÈS LE RENDU EN COURS":"STOP AFTER CURRENT RENDER"}
      </button>}
      {!canRender&&<p className="analysis-note">{fr?
        "Les sources doivent être sélectionnées localement pour ce lot. Les fichiers cloud ne sont pas téléchargés vers Vercel.":
        "Source files must be selected locally. They are never uploaded to Vercel."}</p>}
    </div>
    {!!jobs.length&&<div className="studio-auto-edit-panel" role="status" aria-live="polite">
      <strong>{fr?"SUIVI DU LOT":"BATCH STATUS"} · {success}/{jobs.length} {fr?"TERMINÉS":"COMPLETE"} · {failed} {fr?"ÉCHECS":"FAILED"}</strong>
      {jobs.map(j=><div key={j.job.id} style={{marginTop:8}}>
        <span>{j.job.title} · {formatLabels[j.job.format]} · {j.state} {j.state==="rendering"?`${j.progress}%`:""}</span>
        {j.error&&<small style={{display:"block"}}>{j.error}</small>}
      </div>)}
    </div>}
    <div className="studio-auto-edit-panel">
      <strong>{fr?"MP4 GÉNÉRÉS DANS CETTE SESSION":"MP4 GENERATED THIS SESSION"}</strong>
      {completed.map(output=><div key={output.id} style={{marginTop:9}}>
        <strong>{output.filename}</strong><span style={{marginLeft:8}}>{(output.bytes/1e6).toFixed(1)} Mo</span>
        {output.url?<a href={output.url} download={output.filename} className="analysis-secondary">
          {fr?"TÉLÉCHARGER MP4":"DOWNLOAD MP4"}
        </a>:<span className="analysis-note">✓ {fr?"ENREGISTRÉ DANS TON DOSSIER":"SAVED IN YOUR FOLDER"}</span>}
      </div>)}
      {!completed.length&&<p className="analysis-note">{fr?
        "Aucun export produit. Le Studio ne conserve pas de copie MP4 en ligne.":
        "No exports produced. The Studio keeps no online MP4 copy."}</p>}
    </div>
    {error&&<p role="alert" className="analysis-error">{error}</p>}
    <p className="analysis-note">{fr?
      "Si ton navigateur ne permet pas de choisir un dossier, utilise les liens Télécharger MP4. Dans ce cas les fichiers restent disponibles uniquement jusqu'à la fermeture de cette page. La limite actuelle est de 10 minutes par rendu et les traitements s'arrêtent si tu fermes l'onglet.":
      "If your browser cannot select a folder, download MP4s individually. Those links disappear when the page closes. Rendering is limited to 10 minutes per video, and stops when you close the tab."}</p>
    {directoryMode&&<p className="analysis-note">{fr?
      "Les vidéos terminées ont été écrites directement dans le dossier choisi. Vérifie la synchronisation Google Drive pour leur archivage distant.":
      "Completed videos were written directly to your selected folder. Verify Google Drive synchronization to archive them remotely."}</p>}
  </section>;
}
