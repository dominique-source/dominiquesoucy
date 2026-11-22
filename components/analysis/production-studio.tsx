"use client";
import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { capsuleById } from "@/lib/analysis/catalog";
import { MultiCamEditor } from "./multicam-editor";
import { EpisodeDashboard, type EpisodeRow } from "./episode-dashboard";
import { CapsuleWorkshop } from "./capsule-workshop";
import { freshProject, MAX_PROJECT_MEDIA_BYTES, episodeCode, eventFor, type StudioProject, type SourceMedia } from "@/lib/analysis/project";
import type { SourceFiles, SourceKey } from "@/lib/analysis/multicam";

const names:Record<SourceKey,string>={audio:"AUDIO ORIGINAL",enhanced:"AUDIO FINAL OPTIMISÉ",main:"CANON · PLAN PRINCIPAL",vertical:"IPHONE · VERTICAL",secondary:"SAMSUNG · HORIZONTAL"};
const allowed:Record<SourceKey,RegExp>={audio:/\.(mp3|m4a|wav|flac|ogg|webm|mp4)$/i,enhanced:/\.(mp3|m4a|wav|flac|ogg|webm|mp4)$/i,main:/\.(mov|mp4|m4v|webm)$/i,vertical:/\.(mov|mp4|m4v|webm)$/i,secondary:/\.(mov|mp4|m4v|webm)$/i};
type ProjectRow=EpisodeRow;
type UploadState={progress:number;busy:boolean;error?:string};
type PendingUploads=Partial<Record<SourceKey,UploadState>>;
function download(filename:string,content:string,mime="application/json"){
  const url=URL.createObjectURL(new Blob([content],{type:mime}));
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function ProductionStudio({lang}:{lang:"fr"|"en"}){
  const fr=lang==="fr";
  const [project,setProject]=useState<StudioProject>(()=>freshProject());
  const [projects,setProjects]=useState<ProjectRow[]>([]);
  const [files,setFiles]=useState<SourceFiles>({});
  const [remoteUrls,setRemoteUrls]=useState<Partial<Record<SourceKey,string>>>({});
  const [uploads,setUploads]=useState<PendingUploads>({});
  const uploading=Object.values(uploads).some(u=>u?.busy);
  const [ready,setReady]=useState(false);
  const [status,setStatus]=useState<"loading"|"pending"|"saving"|"saved"|"error">("loading");
  const [consent,setConsent]=useState(false);
  const [busy,setBusy]=useState<""|"transcribe"|"analyze">("");
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const revision=useRef(0);
  const latest=useRef(project);
  const persisted=useRef("");
  useEffect(()=>{latest.current=project},[project]);
  const modify=useCallback((patch:Partial<StudioProject>)=>{
    setProject(prev=>({...prev,...patch}));
    setStatus("pending");
  },[]);
  const record=useCallback((kind:StudioProject["events"][number]["type"],note:string,outcome:StudioProject["events"][number]["status"]="info")=>{
    setProject(prev=>({...prev,events:[eventFor(kind,note,outcome),...prev.events].slice(0,100)}));
    setStatus("pending");
  },[]);
  const list=useCallback(async()=>{
    const r=await fetch("/api/analysis/projects",{cache:"no-store"});
    if(!r.ok)throw Error("LIST_UNAVAILABLE");
    const data=await r.json() as {projects:ProjectRow[]};
    setProjects(data.projects||[]);
    return data.projects||[];
  },[]);
  const load=useCallback(async(id:string)=>{
    const r=await fetch(`/api/analysis/projects?id=${encodeURIComponent(id)}`,{cache:"no-store"});
    if(!r.ok)throw Error("PROJECT_NOT_FOUND");
    const data=await r.json() as {project:StudioProject};
    return data.project;
  },[]);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const available=await list();
        if(cancelled)return;
        // Preserve the explicit Studio Live handoff when opening this new workflow.
        let pendingLive="";
        try{
          pendingLive=sessionStorage.getItem("ds-studio-pending-analysis")||"";
        }catch{ /* storage disabled */ }
        if(pendingLive){
          const incoming={...freshProject(),transcript:pendingLive.slice(0,26000)};
          setProject(incoming);setStatus("pending");
          try{sessionStorage.removeItem("ds-studio-pending-analysis")}catch{}
        }else if(available.length){
          const p=await load(available[0].id);
          if(cancelled)return;
          setProject(p);persisted.current=JSON.stringify({...p,updatedAt:undefined});setStatus("saved");
        }else setStatus("pending");
      }catch{
        if(!cancelled){setStatus("error");setError(fr?"Stockage du Studio indisponible. Ne ferme pas la page.":"Studio storage unavailable. Do not close the page.");}
      }finally{if(!cancelled)setReady(true)}
    })();
    return()=>{cancelled=true};
  },[list,load,fr]);
  useEffect(()=>{
    if(!ready||uploading)return;
    const snapshot=JSON.stringify({...project,updatedAt:undefined});
    if(snapshot===persisted.current)return;
    const ticket=++revision.current;
    setStatus("pending");
    const timeout=setTimeout(async()=>{
      if(ticket!==revision.current)return;
      setStatus("saving");
      try{
        const r=await fetch("/api/analysis/projects",{
          method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(project),
        });
        if(!r.ok)throw Error("SAVE_FAILED");
        const result=await r.json() as {updatedAt:number};
        if(ticket!==revision.current)return;
        persisted.current=snapshot;setStatus("saved");setError("");
        setProjects(old=>[{id:project.id,name:project.name,season:project.season,episode:project.episode,stage:project.stage,recordingDate:project.recordingDate,capsuleCount:project.capsules.length,failedCount:project.events.filter(e=>e.status==="failure").length,mediaCount:Object.keys(project.media).length,hasTranscript:!!project.transcript,hasAnalysis:!!project.analysis,updatedAt:result.updatedAt},
          ...old.filter(p=>p.id!==project.id)].slice(0,100));
      }catch{
        if(ticket!==revision.current)return;
        setStatus("error");
        setError(fr?"Impossible de sauvegarder ce projet sur le serveur. Garde cet onglet ouvert.":"Could not save the project on the server. Keep this tab open.");
      }
    },1000);
    return()=>clearTimeout(timeout);
  },[project,ready,fr,uploading]);
  useEffect(()=>{
    if(!ready)return;
    const controller=new AbortController();
    const media=project.media;
    (async()=>{
      const links=await Promise.all((Object.keys(media) as SourceKey[]).map(async key=>{
        try{
          const r=await fetch(`/api/analysis/project-media-link?id=${project.id}&source=${key}`,{
            signal:controller.signal,cache:"no-store",
          });
          if(!r.ok)return [key,""] as const;
          const data=await r.json() as {url:string};
          return [key,data.url] as const;
        }catch{return [key,""] as const}
      }));
      if(!controller.signal.aborted)setRemoteUrls(Object.fromEntries(links.filter(x=>x[1])));
    })();
    return()=>controller.abort();
  },[project.id,project.media,ready]);
  useEffect(()=>{
    const before=(e:BeforeUnloadEvent)=>{
      if(uploading||status!=="saved"){e.preventDefault();}
    };
    window.addEventListener("beforeunload",before);
    return()=>window.removeEventListener("beforeunload",before);
  },[uploading,status]);
  const choose=(key:SourceKey,e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    if(file.size<=0||file.size>MAX_PROJECT_MEDIA_BYTES||!allowed[key].test(file.name)){
      setError(fr?"Fichier non pris en charge ou supérieur à 5 Go.":"Unsupported file or over 5 GB.");
      return;
    }
    setFiles(prev=>({...prev,[key]:file}));
    setMessage("");setError("");
  };
  const saveMedia=async(key:SourceKey)=>{
    const file=files[key];
    if(!file)return;
    const id=latest.current.id;
    setUploads(p=>({...p,[key]:{busy:true,progress:0}}));setError("");
    try{
      const ext=file.name.split(".").pop()?.toLowerCase();
      const path=`studio-projects/${id}/${key}/${crypto.randomUUID()}.${ext}`;
      const blob=await upload(path,file,{
        access:"private",handleUploadUrl:"/api/analysis/project-media-upload",multipart:true,
        onUploadProgress:({percentage})=>setUploads(p=>({...p,[key]:{busy:true,progress:Math.round(percentage)}})),
      });
      if(latest.current.id!==id)throw Error("PROJECT_CHANGED");
      const info:SourceMedia={pathname:blob.pathname,filename:file.name,bytes:file.size,
        contentType:file.type||"application/octet-stream"};
      const next={...latest.current,media:{...latest.current.media,[key]:info}};
      const r=await fetch("/api/analysis/projects",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(next),
      });
      if(!r.ok)throw Error("SAVE_FAILED");
      setProject(next);
      setUploads(p=>({...p,[key]:{busy:false,progress:100}}));
      setMessage(fr?`${file.name} enregistré dans le stockage privé.`:`${file.name} saved privately.`);
      record("upload",`${key} : fichier privé enregistré`,"success");
    }catch{
      setUploads(p=>({...p,[key]:{busy:false,progress:0,error:"UPLOAD_FAILED"}}));
      setError(fr?"Transfert non confirmé. Garde le fichier original et réessaie.":"Upload not confirmed. Keep your original and retry.");
      record("error",`Transfert média ${key} échoué`,"failure");
    }
  };
  const transcribe=async()=>{
    const audio=files.audio;
    if(!audio||!consent||busy)return;
    if(audio.size>24_000_000){setError(fr?"La transcription accepte un audio compressé de 24 Mo maximum.":"Transcription needs an audio under 24 MB.");return}
    setBusy("transcribe");setError("");
    try{
      const filename=audio.name.replace(/[^a-zA-Z0-9_.-]/g,"_").slice(-100);
      const blob=await upload(`private-studio/${crypto.randomUUID()}/${filename}`,audio,{
        access:"private",handleUploadUrl:"/api/analysis/media-upload",multipart:true,
      });
      const response=await fetch("/api/analysis/transcribe",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({pathname:blob.pathname,lang,consent:true}),
      });
      const data=await response.json() as {transcript?:string;error?:string};
      if(!response.ok||!data.transcript)throw Error(data.error||"TRANSCRIBE_FAILED");
      modify({transcript:data.transcript,analysis:null,selectedMoment:0,stage:"transcription"});
      record("transcription","Transcription générée","success");
      setMessage(fr?"Transcription obtenue. Vérifie le texte ci-dessous.":"Transcript received. Review the text below.");
    }catch(e){
      record("error",`Échec transcription : ${e instanceof Error?e.message:"UNKNOWN"}`,"failure");
      setError(fr?`Transcription impossible (${e instanceof Error?e.message:"ERROR"}). Le fichier reste sélectionné.`:
        `Transcription failed (${e instanceof Error?e.message:"ERROR"}). Your file remains selected.`);
    }finally{setBusy("")}
  };
  const analyze=async()=>{
    if(!consent||project.transcript.length<100||busy)return;
    setBusy("analyze");setError("");
    try{
      const r=await fetch("/api/analysis",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({consent:true,lang,transcript:project.transcript})});
      if(!r.ok)throw Error("ANALYSIS_FAILED");
      const value=await r.json() as NonNullable<StudioProject["analysis"]>;
      modify({analysis:value,selectedMoment:0,stage:"analysis"});
      record("analysis",`Analyse terminée : ${value.moments.length} extrait(s)`,"success");
      setMessage(fr?"Analyse terminée. Les extraits seront enregistrés dans le projet.":"Analysis complete. Highlights will be saved in the project.");
    }catch{record("error","Échec analyse IA","failure");setError(fr?"Analyse IA indisponible. La transcription est conservée.":"AI analysis unavailable. Transcript is preserved.")}
    finally{setBusy("")}
  };
  const openProject=async(id:string)=>{
    if(uploading||status==="saving"||status==="pending")return;
    try{
      const p=await load(id);setFiles({});setUploads({});setRemoteUrls({});
      persisted.current=JSON.stringify({...p,updatedAt:undefined});
      setProject(p);setStatus("saved");setError("");
    }catch{setError(fr?"Impossible d’ouvrir ce projet.":"Cannot open this project.")}
  };
  const newProject=()=>{
    if(uploading||status==="pending"||status==="saving")return;
    const last=[project,...projects].reduce((n,item)=>item.season===project.season?Math.max(n,item.episode):n,0);
    const p={...freshProject(),season:project.season,episode:last+1,name:`DOM SOUCY MEDIA — ${episodeCode(project.season,last+1)}`};setFiles({});setUploads({});setRemoteUrls({});
    setProject(p);setStatus("pending");setError("");setMessage("");
  };
  const step=(n:number,title:string,meta:string,children:React.ReactNode)=><section className="analysis-panel studio-step">
    <div className="analysis-panel-head"><h2>{String(n).padStart(2,"0")} / {title}</h2><span>{meta}</span></div>{children}
  </section>;
  const tile=(key:SourceKey)=>{
    const file=files[key],saved=project.media[key],progress=uploads[key];
    return <div className="studio-source-tile">
      <strong>{names[key]}</strong>
      <label className="analysis-source-pick">
        {file?(fr?"REMPLACER":"REPLACE"):(fr?"+ CHOISIR UN FICHIER":"+ CHOOSE FILE")}
        <input aria-label={names[key]} type="file"
          accept={key==="audio"||key==="enhanced"?"audio/*,.mp3,.m4a,.wav,.ogg,.flac":"video/*,.mov,.mp4,.m4v,.webm"}
          disabled={progress?.busy} onChange={e=>choose(key,e)}/>
      </label>
      {file&&<p>{file.name} · {(file.size/1e6).toFixed(1)} Mo</p>}
      {saved&&<p className="studio-media-confirm">✓ {fr?"MÉDIA ENREGISTRÉ":"MEDIA SAVED"} · {saved.filename}</p>}
      {file&&<button type="button" className="analysis-secondary" disabled={progress?.busy||!ready} onClick={()=>saveMedia(key)}>
        {progress?.busy?(fr?`ENVOI… ${progress.progress}%`:`UPLOAD… ${progress.progress}%`):
          (fr?"SAUVEGARDER LE MÉDIA":"SAVE MEDIA")}
      </button>}
      {progress?.error&&<p role="alert">{fr?"Envoi échoué. Réessayer.":"Upload failed. Retry."}</p>}
    </div>;
  };
  const projectSaved=status==="saved";
  return <section className="analysis-studio studio-production">
    <div className="analysis-topline">
      <div className="analysis-logo">DOMINIQUE SOUCY <span>/ STUDIO PRODUCTION</span></div>
      <Link href={`/${lang}/studio-live`}>{fr?"RETOUR STUDIO LIVE":"BACK TO LIVE STUDIO"} ↗</Link>
    </div>
    <header className="analysis-heading studio-production-header">
      <div><p className="analysis-kicker">DOM SOUCY MEDIA / PRIVATE WORKSPACE</p>
        <h1>{fr?"DE L’AUDIO À LA CAPSULE":"FROM AUDIO TO VIDEO"}<em>.</em></h1>
        <p>{fr?"Un projet enregistré, chaque étape dans le bon ordre.":"One saved project, every step in order."}</p>
      </div>
      <div className={`studio-save-state ${projectSaved?"is-saved":status==="error"?"is-error":""}`} role="status">
        {status==="loading"?"CHARGEMENT":status==="pending"?"MODIFICATIONS À ENREGISTRER":
        status==="saving"?"SAUVEGARDE EN COURS":status==="saved"?"✓ PROJET SAUVEGARDÉ":"ÉCHEC DE SAUVEGARDE"}
      </div>
    </header>
    <EpisodeDashboard lang={lang} episodes={projects} currentId={project.id} onOpen={openProject}
      onNew={newProject} disabled={!ready||uploading||status==="pending"||status==="saving"}/>
    {step(0,fr?"PROJET ET SAUVEGARDE":"PROJECT & SAVE","AUTO-SAVE",<>
      <div className="studio-episode-identity">
        <label>{fr?"SAISON":"SEASON"}
          <input type="number" min={1} max={999} value={project.season}
            onChange={e=>modify({season:Math.max(1,Math.min(999,Number(e.target.value)||1))})}/>
        </label>
        <label>{fr?"ÉPISODE":"EPISODE"}
          <input type="number" min={1} max={999} value={project.episode}
            onChange={e=>modify({episode:Math.max(1,Math.min(999,Number(e.target.value)||1))})}/>
        </label>
        <label>{fr?"DATE D’ENREGISTREMENT":"RECORDING DATE"}
          <input type="date" value={project.recordingDate}
            onChange={e=>modify({recordingDate:e.target.value})}/>
        </label>
        <strong>{episodeCode(project.season,project.episode)}</strong>
      </div>
      <label className="studio-project-field">{fr?"NOM DU PROJET":"PROJECT NAME"}
        <input maxLength={100} value={project.name} onChange={e=>modify({name:e.target.value})} disabled={!ready}/>
      </label>
      <div className="studio-project-row">
        <label>{fr?"REPRENDRE UN PROJET":"RESUME PROJECT"}
          <select value={projects.some(p=>p.id===project.id)?project.id:""}
            onChange={e=>openProject(e.target.value)} disabled={!ready||uploading}>
            {!projects.some(p=>p.id===project.id)&&<option value="">{fr?"Nouveau projet":"New project"}</option>}
            {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <button type="button" className="analysis-secondary" onClick={newProject} disabled={!ready||uploading}>+ {fr?"NOUVEAU PROJET":"NEW PROJECT"}</button>
      </div>
      <p className="analysis-note">{fr
        ?"Sauvegarde automatique de la transcription, de l’analyse et des coupes. Les médias doivent être enregistrés séparément avec « Sauvegarder le média ». Attends « Projet sauvegardé » avant de quitter."
        :"Auto-save for transcript, analysis and edits. Media must be saved separately. Wait for Project Saved before leaving."}</p>
      <button type="button" className="analysis-secondary"
        onClick={()=>download("dom-soucy-projet-sauvegarde.json",JSON.stringify(project,null,2))}>
        {fr?"TÉLÉCHARGER UNE COPIE DU PROJET (.JSON)":"DOWNLOAD PROJECT BACKUP (.JSON)"}
      </button>
    </>)}
    {step(1,fr?"AUDIO PRINCIPAL":"MAIN AUDIO",project.media.audio?"✓ MÉDIA SAUVEGARDÉ":"M4A / MP3",<>
      <p>{fr?"Dépose d’abord le son original de ta conférence. Tu peux ensuite ajouter une deuxième piste améliorée pour le montage final.":"Start with your original recording. Add a separate enhanced voice track for final editing."}</p>
      {tile("audio")}
      <div className="studio-audio-optimized">
        <h3>{fr?"PISTE AUDIO FINALE — VOIX OPTIMISÉE":"FINAL AUDIO — ENHANCED VOICE"}</h3>
        <p>{fr
          ?"Améliore ton audio original avec Adobe Podcast Enhance, puis ajoute ici le fichier optimisé. Le Studio conserve les deux fichiers séparément et utilise l’audio optimisé à la prévisualisation et à l’export si tu le choisis."
          :"Enhance your original audio with Adobe Podcast, then upload the processed track here. The Studio keeps both and lets you choose the final sound for preview and export."}</p>
        <a href="https://podcast.adobe.com/enhance-speech" target="_blank" rel="noopener noreferrer"
          className="analysis-secondary">{fr?"OUVRIR ADOBE PODCAST ENHANCE ↗":"OPEN ADOBE PODCAST ENHANCE ↗"}</a>
        {tile("enhanced")}
        <p className="analysis-note">{fr
          ?"Adobe Enhance n’est pas lancé automatiquement depuis ce bouton : aucun accès API public générique n’est disponible. Télécharge d’abord le résultat d’Adobe, puis importe-le ici."
          :"Adobe Enhance does not run inside this Studio. Download the processed audio from Adobe first, then import it here."}</p>
      </div>
      <label className="analysis-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
        <span>{fr?"J’autorise la transcription et l’analyse privées de ma conférence par l’IA.":"I authorize private AI transcription and analysis."}</span>
      </label>
      <button type="button" className="analysis-primary" disabled={!consent||!files.audio||!!busy} onClick={transcribe}>
        {busy==="transcribe"?"TRANSCRIPTION EN COURS…":fr?"TRANSCRIRE L’AUDIO":"TRANSCRIBE AUDIO"}
      </button>
      <p className="analysis-note">{fr?"Pour transcrire : 24 Mo maximum. Pour conserver l’original dans le projet, clique sur « Sauvegarder le média ».":"24 MB maximum for transcription. Save the original media separately."}</p>
    </>)}
    {step(2,fr?"TRANSCRIPTION":"TRANSCRIPT",`${project.transcript.length} / 26 000`,<>
      <p>{fr?"Relis et corrige tes paroles. Le texte se sauvegarde automatiquement.":"Review your transcript; text edits autosave."}</p>
      <textarea aria-label={fr?"Transcription":"Transcript"} rows={11} maxLength={26000}
        value={project.transcript} onChange={e=>modify({transcript:e.target.value,analysis:null,selectedMoment:0})}
        placeholder={fr?"La transcription apparaît ici après traitement…":"Transcription appears here…"}/>
      <button type="button" className="analysis-secondary" disabled={!project.transcript}
        onClick={()=>download("dom-soucy-transcription.txt",project.transcript,"text/plain")}>
        {fr?"TÉLÉCHARGER LE TEXTE (.TXT)":"DOWNLOAD TEXT (.TXT)"}
      </button>
    </>)}
    {step(3,fr?"ANALYSE IA":"AI ANALYSIS",`${project.analysis?.moments.length||0} EXTRAITS`,<>
      <p>{fr?"L’analyse détecte des passages exacts, sans créer artificiellement des citations.":"AI finds exact excerpts, without inventing quotes."}</p>
      <button type="button" className="analysis-primary" disabled={!consent||project.transcript.trim().length<100||!!busy} onClick={analyze}>
        {busy==="analyze"?"ANALYSE EN COURS…":fr?"ANALYSER LA SÉANCE":"ANALYZE SESSION"}
      </button>
      {project.analysis&&<><p className="analysis-synopsis">{project.analysis.synopsis}</p>
        <div className="analysis-tags">{project.analysis.themes.map((t,i)=><span key={i}>{t}</span>)}</div>
        <div className="analysis-moment-list">{project.analysis.moments.map((m,i)=><button
          key={i} type="button" className={project.selectedMoment===i?"selected":""}
          onClick={()=>modify({selectedMoment:i})}><span>{i+1}</span><div><strong>{m.title}</strong>
          <small>{capsuleById(m.model_id)?.title} · {m.excerpt.slice(0,115)}</small></div></button>)}</div>
        <button className="analysis-secondary" type="button" onClick={()=>download("dom-soucy-analyse.json",JSON.stringify(project.analysis,null,2))}>
          {fr?"TÉLÉCHARGER L’ANALYSE":"DOWNLOAD ANALYSIS"}
        </button>
      </>}
    </>)}
    {step(4,fr?"IMPORTER LES VIDÉOS":"UPLOAD VIDEO SOURCES",
      `${["main","vertical","secondary"].filter(k=>!!project.media[k as SourceKey]).length} / 3`,<>
      <p>{fr?"Importe tes trois caméras, une par une, puis clique sur « Sauvegarder le média » pour chacune. Les fichiers volumineux sont transférés directement dans un stockage privé.":"Upload your three cameras one by one and save each to private storage."}</p>
      <div className="studio-video-grid">{(["main","vertical","secondary"] as SourceKey[]).map(k=><div key={k}>{tile(k)}</div>)}</div>
    </>)}
    <MultiCamEditor key={project.id} sources={files} remoteUrls={remoteUrls} mediaMetadata={project.media}
      name={project.name} lang={lang} highlight={project.analysis?.moments[project.selectedMoment]?.excerpt}
      savedTimeline={project.timeline} onTimelineChange={t=>modify({timeline:t})}
      format={project.format} onFormatChange={format=>modify({format})}
      capsule={project.capsules.find(c=>c.id===project.selectedCapsuleId)}
      onExportOutcome={(ok,details)=>{
        record(ok?"export":"error",details,ok?"success":"failure");
        const id=project.selectedCapsuleId;
        if(id)modify({capsules:project.capsules.map(c=>c.id===id?{...c,status:ok?"rendered":"failed"}:c)});
      }}/>
    <CapsuleWorkshop lang={lang} project={project}
      onChange={patch=>modify(patch)} onEvent={record}/>
    {step(8,fr?"EXPORT VIDÉO":"VIDEO EXPORT","MP4 BÊTA",<>
      <p>{fr
        ?"Ton projet et tes décisions de montage sont sauvegardés. Dans l’étape 07, essaie « Exporter MP4 · Bêta » : l’export est fait sur ton ordinateur, en temps réel, seulement si ton navigateur accepte MP4/H.264. Le rendu serveur haute qualité sera une phase suivante."
        :"Your project and edit decisions are saved. In step 07, try Export MP4 · Beta. Rendering runs locally in real time and requires browser MP4/H.264 support. High-quality server rendering comes later."}</p>
    </>)}
    {step(9,fr?"HISTORIQUE ET INCIDENTS":"HISTORY & ISSUES",`${project.events.length} LOGS`,<>
      <p>{fr?"Tableau de bord de cet épisode : retrouve les événements, les transferts, les erreurs de traitement et les exports. Les détails techniques confidentiels ne sont pas enregistrés.":"Episode dashboard: processing events and recoverable errors. Sensitive technical details are not logged."}</p>
      <div className="studio-event-log">{project.events.length?project.events.map(e=><div key={e.id} className={`studio-event ${e.status}`}>
        <span>{new Date(e.date).toLocaleString(fr?"fr-CA":"en-CA")}</span><strong>{e.type.toUpperCase()}</strong><p>{e.message}</p>
      </div>):<p>{fr?"Aucun événement pour le moment.":"No events yet."}</p>}</div>
    </>)}
    {message&&<p className="analysis-media-ok" role="status">{message}</p>}
    {error&&<p className="analysis-error" role="alert">{error}</p>}
  </section>;
}
