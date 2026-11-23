"use client";
import { upload } from "@vercel/blob/client";
import { useCallback,useEffect,useRef,useState } from "react";
import { renderLocalMp4 } from "./local-mp4";
import { createProductionPlan,renderFormat,type RenderJob } from "@/lib/analysis/production-plan";
import { outputPath,type OutputRecord,type OutputFormat } from "@/lib/analysis/outputs";
import { cameraKeys,proposeMulticamCuts,type CameraKey,type Cut,type SourceFiles,type SourceKey } from "@/lib/analysis/multicam";
import type { StudioProject } from "@/lib/analysis/project";

type Capsule=StudioProject["capsules"][number];
type JobStatus={job:RenderJob;state:"queued"|"rendering"|"uploading"|"archived"|"failed";progress:number;error?:string};
const formats:OutputFormat[]=["horizontal","vertical","square"];
const formatLabels:Record<OutputFormat,string>={horizontal:"16:9 · YouTube",vertical:"9:16 · Reels / Shorts",square:"1:1"};
const jsonHeaders={"Content-Type":"application/json"};
export function ProductionBatch({
  lang,projectId,name,capsules,duration,mediaFiles,offsets,audioSource,finalAudioSource,
  episodeCuts,getNodes,backdrops
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
  const [archives,setArchives]=useState<OutputRecord[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [archiveError,setArchiveError]=useState("");
  const cancel=useRef(false);
  const validCapsules=capsules.filter(c=>c.end>c.start&&c.end<=duration);
  const cameras=cameraKeys.filter(k=>!!mediaFiles[k]);
  const canRender=cameras.length>0&&!!mediaFiles[audioSource]&&!!mediaFiles[finalAudioSource];
  const refresh=useCallback(async()=>{
    const response=await fetch(`/api/analysis/outputs?id=${encodeURIComponent(projectId)}`,{cache:"no-store"});
    const data=await response.json() as {outputs?:OutputRecord[];error?:string};
    if(!response.ok||!data.outputs)throw Error(data.error||"ARCHIVE_UNAVAILABLE");
    setArchives(data.outputs);
  },[projectId]);
  useEffect(()=>{void refresh().catch(e=>setArchiveError(e instanceof Error?e.message:"ARCHIVE_UNAVAILABLE"))},[refresh]);
  const toggleFormat=(value:OutputFormat)=>setSelectedFormats(old=>old.includes(value)?old.filter(x=>x!==value):[...old,value]);
  const toggleCapsule=(id:string)=>setSelected(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  const requested=createProductionPlan({capsules,selectedIds:selected,formats:selectedFormats,includeEpisode,duration});
  const updateJob=(id:string,patch:Partial<JobStatus>)=>setJobs(old=>old.map(j=>j.job.id===id?{...j,...patch}:j));
  async function produce(retryFailed=false){
    if(busy)return;
    setError("");
    setArchiveError("");
    if(!canRender){setError(fr?"Sélectionne les originaux locaux de toutes les caméras et des pistes audio nécessaires avant de lancer ce lot.":"Select the local video and audio sources before starting this batch.");return}
    const plan=retryFailed?jobs.filter(j=>j.state==="failed").map(j=>({...j.job,id:crypto.randomUUID()})):requested;
    if(!plan.length){setError(fr?"Sélectionne au moins une vidéo et un format.":"Select at least one video and format.");return}
    setJobs(plan.map(job=>({job,state:"queued",progress:0})));
    setBusy(true);cancel.current=false;
    const nodes=getNodes();
    try{
      for(const job of plan){
        if(cancel.current)break;
        if(job.end-job.start>600){
          updateJob(job.id,{state:"failed",error:fr?"Ce rendu dépasse la limite actuelle de 10 minutes du moteur navigateur.":"This clip exceeds the current 10-minute browser rendering limit."});
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
          updateJob(job.id,{state:"uploading",progress:100});
          const pathname=outputPath(projectId,job.id,job.format);
          const uploaded=await upload(pathname,new File([blob],`${job.id}.mp4`,{type:"video/mp4"}),{
            access:"private",multipart:true,
            handleUploadUrl:"/api/analysis/outputs-upload",
          });
          if(uploaded.pathname!==pathname)throw Error("ARCHIVE_PATH_MISMATCH");
          const response=await fetch("/api/analysis/outputs",{
            method:"POST",headers:jsonHeaders,
            body:JSON.stringify({
              projectId,id:job.id,pathname,format:job.format,
              kind:job.kind,capsuleId:job.capsuleId,title:job.title,
            }),
          });
          if(!response.ok){
            const data=await response.json().catch(()=>({error:"ARCHIVE_FAILED"})) as {error?:string};
            throw Error(data.error||"ARCHIVE_FAILED");
          }
          updateJob(job.id,{state:"archived"});
          await refresh();
        }catch(e){
          updateJob(job.id,{state:"failed",error:e instanceof Error?e.message:"RENDER_FAILED"});
        }
      }
    }finally{setBusy(false);cancel.current=false}
  }
  async function openOutput(output:OutputRecord){
    try{
      const response=await fetch(`/api/analysis/outputs?id=${encodeURIComponent(projectId)}&output=${output.id}`,{cache:"no-store"});
      const data=await response.json() as {url?:string;error?:string};
      if(!response.ok||!data.url)throw Error(data.error||"OUTPUT_NOT_FOUND");
      const a=document.createElement("a");
      a.href=data.url;a.target="_blank";a.rel="noopener noreferrer";
      a.download=`dom-soucy-${output.kind}-${output.format}.mp4`;
      document.body.appendChild(a);a.click();a.remove();
    }catch(e){setArchiveError(e instanceof Error?e.message:"OUTPUT_NOT_FOUND")}
  }
  const complete=jobs.filter(j=>j.state==="archived").length;
  const failed=jobs.filter(j=>j.state==="failed").length;
  return <section className="analysis-panel studio-step" id="studio-production-batch">
    <div className="analysis-panel-head">
      <h2>08 / {fr?"CENTRE DE PRODUCTION":"PRODUCTION CENTER"}</h2>
      <span>{archives.length} MP4 {fr?"ARCHIVÉS":"ARCHIVED"}</span>
    </div>
    <p>{fr?
      "Prépare un lot de capsules horizontales et verticales, et conserve chaque MP4 terminé dans le projet. Les rendus s'effectuent l'un après l'autre dans ce navigateur : ne ferme pas cet onglet pendant la production.":
      "Prepare horizontal and vertical clips and privately archive each completed MP4. Rendering runs sequentially in this browser; keep this tab open."}</p>
    <div className="studio-auto-edit-panel">
      <strong>{fr?"VIDÉOS À PRODUIRE":"VIDEOS TO PRODUCE"}</strong>
      <label><input type="checkbox" disabled={busy} checked={includeEpisode}
        onChange={e=>setIncludeEpisode(e.target.checked)}/> {fr?"Émission complète":"Full episode"} ({Math.round(duration)} s)</label>
      {validCapsules.map(c=><label key={c.id} style={{display:"block",marginTop:8}}>
        <input type="checkbox" disabled={busy} checked={selected.includes(c.id)} onChange={()=>toggleCapsule(c.id)}/>
        {" "}{c.title} · {Math.round(c.end-c.start)} s
      </label>)}
      <div className="studio-auto-edit-actions">
        {formats.map(f=><label key={f}>
          <input type="checkbox" disabled={busy} checked={selectedFormats.includes(f)}
            onChange={()=>toggleFormat(f)}/> {formatLabels[f]}
        </label>)}
      </div>
      <p className="analysis-note">{fr?`${requested.length} exports prévus · ${validCapsules.length} capsules disponibles`:
        `${requested.length} planned exports · ${validCapsules.length} available clips`}</p>
      <button className="analysis-primary" type="button" disabled={busy||!requested.length}
        onClick={()=>{void produce()}}>
        {busy?(fr?"PRODUCTION EN COURS…":"RENDERING…"):
          fr?`✦ PRODUIRE ${requested.length} MP4 ET ARCHIVER`:`✦ PRODUCE ${requested.length} MP4 AND ARCHIVE`}
      </button>
      {!busy&&failed>0&&<button type="button" className="analysis-secondary" onClick={()=>{void produce(true)}}>
        {fr?`RELANCER LES ${failed} RENDUS EN ÉCHEC`:`RETRY ${failed} FAILED RENDERS`}
      </button>}
      {busy&&<button type="button" className="analysis-secondary" onClick={()=>{cancel.current=true}}>
        {fr?"ARRÊTER APRÈS LE RENDU EN COURS":"STOP AFTER CURRENT RENDER"}
      </button>}
      {!canRender&&<p className="analysis-note">{fr?
        "Les vidéos déjà sauvegardées dans le projet restent disponibles, mais ce moteur navigateur utilise encore les fichiers locaux sélectionnés. Le rendu serveur indépendant du navigateur n'est pas activé.":
        "Stored media remains available, but browser rendering currently requires local originals. Background cloud rendering is not enabled."}</p>}
    </div>
    {jobs.length>0&&<div className="studio-auto-edit-panel" role="status" aria-live="polite">
      <strong>{fr?"SUIVI DU LOT":"BATCH STATUS"} · {complete}/{jobs.length} {fr?"ARCHIVÉS":"ARCHIVED"} · {failed} {fr?"ÉCHECS":"FAILED"}</strong>
      {jobs.map(j=><div key={j.job.id} style={{marginTop:8}}>
        <span>{j.job.title} · {formatLabels[j.job.format]} · {j.state} {j.state==="rendering"?`${j.progress}%`:""}</span>
        {j.error&&<small style={{display:"block"}}>{j.error}</small>}
      </div>)}
    </div>}
    <div className="studio-auto-edit-panel">
      <strong>{fr?"BIBLIOTHÈQUE MP4 PRIVÉE":"PRIVATE MP4 LIBRARY"}</strong>
      <button className="analysis-secondary" type="button" onClick={()=>void refresh().catch(e=>setArchiveError(e instanceof Error?e.message:"ERROR"))}>
        {fr?"ACTUALISER LES EXPORTS":"REFRESH EXPORTS"}
      </button>
      {archives.map(o=><div key={o.id} style={{marginTop:9}}>
        <strong>{o.title} · {formatLabels[o.format]}</strong>
        <span style={{marginLeft:8}}>{(o.bytes/1_000_000).toFixed(1)} Mo</span>
        <button type="button" className="analysis-secondary" onClick={()=>void openOutput(o)}>
          {fr?"TÉLÉCHARGER MP4":"DOWNLOAD MP4"}
        </button>
      </div>)}
      {!archives.length&&<p className="analysis-note">{fr?"Aucun MP4 archivé pour cet épisode.":"No archived MP4 for this episode."}</p>}
    </div>
    {error&&<p role="alert" className="analysis-error">{error}</p>}
    {archiveError&&<p role="alert" className="analysis-error">{archiveError}</p>}
    <p className="analysis-note">{fr?
      "Le moteur local conserve une limite de 10 minutes par rendu et nécessite un navigateur compatible MP4/H.264. Les rendus déjà archivés subsistent même si la page est fermée; les tâches non terminées ne continuent pas en arrière-plan. Un moteur cloud est nécessaire pour cette dernière capacité.":
      "Browser rendering is limited to 10 minutes and requires MP4/H.264 support. Completed archives remain saved; unfinished work does not continue when the tab is closed. Cloud rendering is still needed for that."}</p>
  </section>;
}
