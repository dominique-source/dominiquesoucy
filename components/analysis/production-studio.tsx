"use client";
import { decodeLocalAudio,chunkRanges,makeMonoWavChunk } from "@/lib/analysis/local-audio-chunks";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { capsuleById } from "@/lib/analysis/catalog";
import { MultiCamEditor } from "./multicam-editor";
import { EpisodeDashboard, type EpisodeRow } from "./episode-dashboard";
import { defaultChroma } from "@/lib/analysis/chroma-key";
import { resolveBackdrop } from "@/lib/analysis/studio-backdrops";
import { StudioBackdropPicker } from "./studio-backdrop-picker";
import { BubbleWorkshopSimple } from "./bubble-workshop-simple";
import { createDraftsFromAnalysis } from "@/lib/analysis/capsule-drafts";
import { freshProject, MAX_PROJECT_MEDIA_BYTES, episodeCode, eventFor, reviewAfterTimingChange, type StudioProject } from "@/lib/analysis/project";
import type { SourceFiles, SourceKey } from "@/lib/analysis/multicam";

const names:Record<SourceKey,string>={audio:"AUDIO ORIGINAL",enhanced:"AUDIO FINAL OPTIMISÉ",main:"CANON · PLAN PRINCIPAL",vertical:"IPHONE · VERTICAL",secondary:"SAMSUNG · HORIZONTAL"};
const englishNames:Record<SourceKey,string>={audio:"ORIGINAL AUDIO",enhanced:"ENHANCED FINAL AUDIO",main:"CANON · MAIN CAMERA",vertical:"IPHONE · VERTICAL",secondary:"SAMSUNG · HORIZONTAL"};
const allowed:Record<SourceKey,RegExp>={audio:/\.(mp3|m4a|wav|flac|ogg|webm|mp4)$/i,enhanced:/\.(mp3|m4a|wav|flac|ogg|webm|mp4)$/i,main:/\.(mov|mp4|m4v|webm)$/i,vertical:/\.(mov|mp4|m4v|webm)$/i,secondary:/\.(mov|mp4|m4v|webm)$/i};
type ProjectRow=EpisodeRow;
function download(filename:string,content:string,mime="application/json"){
  const url=URL.createObjectURL(new Blob([content],{type:mime}));
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function transcriptionFailureMessage(code:string,stage:"upload"|"transcribe",fr:boolean){
  const known:Record<string,[string,string]>={
    UNAUTHORIZED:["Ta session privée du Studio a expiré. Reconnecte-toi dans un nouvel onglet, puis reviens ici et réessaie. Ne ferme pas cet onglet : ton audio reste sélectionné.","Your private Studio session expired. Sign in in a new tab, then return here and retry. Keep this tab open; your audio remains selected."],
    AUTH_STORE_UNAVAILABLE:["Le service de connexion du Studio est momentanément indisponible. Ce n'est pas un problème de fichier audio.","The Studio authentication service is temporarily unavailable. Your audio file is not the issue."],
    RATE_LIMITED:["Trop de demandes de transcription. Réessaie plus tard.","Transcription request limit reached. Try again later."],
    AI_RATE_LIMITED:["Le service de transcription limite actuellement les requêtes. Réessaie plus tard.","AI transcription is rate limited. Try again later."],
    AUDIO_REJECTED:["Le service refuse cet audio. Essaie un fichier MP3 ou M4A compatible.","The service rejected this audio. Try a compatible MP3 or M4A file."],
    MEDIA_TOO_LARGE:["Le fichier dépasse la limite de 24 Mo. Importe une version MP3 ou M4A compressée.","The file exceeds 24 MB. Import a compressed MP3 or M4A."],
    TRANSCRIPTION_TIMEOUT:["Le traitement audio a dépassé le délai serveur. Le fichier n'a pas été modifié.","Audio processing timed out. Your source file was not changed."],
    AI_AUTH_FAILED:["Le service IA refuse l'accès. La configuration serveur doit être vérifiée.","AI provider authorization failed. Server configuration needs checking."],
    AI_NOT_CONFIGURED:["Le service IA n'est pas configuré sur ce déploiement.","The AI service is not configured on this deployment."],
    MEDIA_NOT_OWNED:["L'accès au fichier temporaire n'a pas pu être confirmé. Relance la transcription.","Temporary file ownership could not be verified. Retry transcription."],
    MEDIA_READ_FAILED:["Le Studio n'a pas pu lire le fichier audio privé. Relance la transcription.","The Studio could not read the private audio. Retry transcription."],
  };
  const match=known[code];
  if(match)return match[fr?0:1];
  if(stage==="upload")return fr
    ?"L'envoi de l'audio a échoué. Vérifie la connexion et le format du fichier, puis réessaie."
    :"Audio upload failed. Check your connection and file type, then retry.";
  return fr?"La transcription n'a pas abouti. Le fichier reste sélectionné : utilise Réessayer ou communique le code d'erreur."
    :"Transcription did not complete. Your source is still selected: retry or share the error code.";
}
export function ProductionStudio({lang,initialProject}:{lang:"fr"|"en";initialProject:StudioProject}){
  const fr=lang==="fr";
  const [project,setProject]=useState(initialProject);
  const [activeSection,setActiveSection]=useState<"projects"|"import"|"analysis"|"editing"|"production"|"publish"|"advanced">("projects");
  const [showTechnicalMontage,setShowTechnicalMontage]=useState(false);
  const [projects,setProjects]=useState<ProjectRow[]>([]);
  const [files,setFiles]=useState<SourceFiles>({});
  const uploading=false;
  const [transcriptionProgress,setTranscriptionProgress]=useState("");
  const [cleanupBusy,setCleanupBusy]=useState(false);
  const [cleanupFeedback,setCleanupFeedback]=useState("");
  const [ready,setReady]=useState(false);
  const [status,setStatus]=useState<"loading"|"pending"|"saving"|"saved"|"error">("loading");
  const [consent,setConsent]=useState(false);
  const [busy,setBusy]=useState<""|"transcribe"|"analyze"|"questions">("");
  const [error,setError]=useState("");
  const [saveFailure,setSaveFailure]=useState("");
  // Transcription errors must survive unrelated autosave responses and section changes.
  const [transcriptionFailure,setTranscriptionFailure]=useState<{code:string;stage:"upload"|"transcribe";detail:string}|null>(null);
  const [localBackupError,setLocalBackupError]=useState("");
  const [retryKey,setRetryKey]=useState(0);
  const [message,setMessage]=useState("");
  const revision=useRef(0);
  const latest=useRef(project);
  const persisted=useRef("");
  // Serialize uploads and autosaves: older requests must never overwrite newer media references.
  const saveQueue=useRef<Promise<void>>(Promise.resolve());
  const serverVersions=useRef<Record<string,number>>({});
  const saveProject=useCallback((value:StudioProject):Promise<{updatedAt:number}>=>{
    const task=saveQueue.current.catch(()=>undefined).then(async()=>{
      const response=await fetch("/api/analysis/projects",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...value,updatedAt:serverVersions.current[value.id]??value.updatedAt??0}),
      });
      if(!response.ok){
        const data=await response.json().catch(()=>({error:"SAVE_FAILED"})) as {error?:string};
        throw Error(`${response.status}:${data.error||"SAVE_FAILED"}`);
      }
      const saved=await response.json() as {updatedAt:number};
      serverVersions.current[value.id]=saved.updatedAt;
      return saved;
    });
    saveQueue.current=task.then(()=>undefined,()=>undefined);
    return task;
  },[]);
  const [recoveryCandidate,setRecoveryCandidate]=useState<StudioProject|null>(null);
  useEffect(()=>{latest.current=project},[project]);
  // Browser recovery contains project metadata and transcripts, never media bytes.
  const recoveryKey="ds-studio-project-recovery";
  useEffect(()=>{
    try{
      const raw=localStorage.getItem(recoveryKey);
      if(!raw)return;
      const p=JSON.parse(raw) as StudioProject;
      if(p?.id && p?.timeline?.visualClaps){
        setRecoveryCandidate(p);
      }
    }catch{}
  },[]);
  useEffect(()=>{
    if(!ready)return;
    // Never replace a potentially newer recovery copy on initial load.
    if(recoveryCandidate && (recoveryCandidate.id!==project.id ||
      JSON.stringify({...recoveryCandidate,updatedAt:undefined})!==
      JSON.stringify({...project,updatedAt:undefined})))return;
    try{
      localStorage.setItem(recoveryKey,JSON.stringify(project));
      setLocalBackupError("");
    }catch{
      setLocalBackupError(fr?
        "Copie locale non disponible : télécharge une copie JSON du projet.":
        "Local recovery is unavailable: download the project JSON.");
    }
  },[project,ready,fr,recoveryCandidate]);
  const modify=useCallback((patch:Partial<StudioProject>)=>{
    setProject(prev=>{
      const next={...prev,...patch};
      latest.current=next;
      return next;
    });
    setStatus("pending");
  },[]);
  const record=useCallback((kind:StudioProject["events"][number]["type"],note:string,outcome:StudioProject["events"][number]["status"]="info")=>{
    setProject(prev=>{
      const next={...prev,events:[eventFor(kind,note,outcome),...prev.events].slice(0,100)};
      latest.current=next;
      return next;
    });
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
    serverVersions.current[data.project.id]=data.project.updatedAt??0;
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
          const incoming={...freshProject(lang),transcript:pendingLive.slice(0,26000)};
          latest.current=incoming;setProject(incoming);setStatus("pending");
          try{sessionStorage.removeItem("ds-studio-pending-analysis")}catch{}
        }else if(new URLSearchParams(window.location.search).get("mode")==="new"){
          setActiveSection("import");
          const fresh=freshProject(lang);
          latest.current=fresh;setProject(fresh);setStatus("pending");
        }else if(available.length){
          const requested=new URLSearchParams(window.location.search).get("project");
          const requestedRow=available.find(item=>item.id===requested);
          const p=await load(requestedRow?.id||available[0].id);
          if(cancelled)return;
          latest.current=p;setProject(p);persisted.current=JSON.stringify({...p,updatedAt:undefined});setStatus("saved");
        }else setStatus("pending");
      }catch{
        if(!cancelled){setStatus("error");setError(fr?"Stockage du Studio indisponible. Ne ferme pas la page.":"Studio storage unavailable. Do not close the page.");}
      }finally{if(!cancelled)setReady(true)}
    })();
    return()=>{cancelled=true};
  },[list,load,fr,lang]);
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
        const result=await saveProject(project);
        if(ticket!==revision.current)return;
        persisted.current=snapshot;setStatus("saved");setError("");setSaveFailure("");
        setProjects(old=>[{id:project.id,name:project.name,season:project.season,episode:project.episode,stage:project.stage,recordingDate:project.recordingDate,capsuleCount:project.capsules.length,failedCount:project.events.filter(e=>e.status==="failure").length,mediaCount:Object.keys(project.localMedia||{}).length,hasTranscript:!!project.transcript,hasAnalysis:!!project.analysis,updatedAt:result.updatedAt},
          ...old.filter(p=>p.id!==project.id)].slice(0,100));
      }catch(err){
        if(ticket!==revision.current)return;
        setStatus("error");
        const code=err instanceof Error?err.message:"SAVE_FAILED";
        setSaveFailure(code);
        const unauthorized=code.startsWith("401:");
        const conflict=code.includes("PROJECT_VERSION_CONFLICT");
        const invalid=code.includes("BAD_PROJECT")||code.includes("TOO_LARGE");
        setError(fr?
          conflict?"Une autre session a modifié ce projet. Tes changements restent dans la copie locale. Télécharge le JSON de secours avant de recharger la version serveur.":
          unauthorized?"Session Studio expirée. Une copie locale existe dans ce navigateur. Reconnecte-toi sans fermer cet onglet.":
          invalid?"Le serveur refuse une donnée du projet. Télécharge la copie JSON de secours.":
          "Le serveur n’a pas confirmé la sauvegarde. Conserve la copie locale et réessaie.":
          conflict?"Another session changed this project. Your edits remain in local recovery. Download the backup JSON before reloading the server version.":
          unauthorized?"Studio session expired. Local recovery exists. Sign in again without closing this tab.":
          invalid?"Server rejected project data. Download the recovery JSON.":
          "Server save was not confirmed. Keep your recovery copy and try again.");
      }
    },1000);
    return()=>clearTimeout(timeout);
  },[project,ready,fr,uploading,retryKey,saveProject]);
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
    const current=latest.current;
    const previous=current.localMedia?.[key];
    const changed=previous?.filename!==file.name||previous.bytes!==file.size;
    modify({
      localMedia:{...current.localMedia,[key]:{filename:file.name.slice(0,180),bytes:file.size}},
      timeline:{
        ...current.timeline,
        alignmentApproved:changed?false:current.timeline.alignmentApproved,
        offsets:changed?{...current.timeline.offsets,[key]:0}:current.timeline.offsets,
        visualClaps:changed&&["main","vertical","secondary"].includes(key)?
          {...current.timeline.visualClaps,[key]:null}:current.timeline.visualClaps,
        finalAudioSource:key==="enhanced"?"enhanced":current.timeline.finalAudioSource,
      },
    });
    setMessage(fr?`${file.name} lié localement, sans téléversement vers Vercel.`:
      `${file.name} linked locally; nothing uploaded to Vercel.`);
    setError("");
  };
  const choosePremiereMaster=(file:File)=>{
    if(file.size<=0||file.size>MAX_PROJECT_MEDIA_BYTES||!/\.(mov|mp4|m4v)$/i.test(file.name)){
      setError(fr?"Choisis un MP4 ou MOV de 5 Go maximum.":"Choose an MP4 or MOV up to 5 GB.");
      return;
    }
    const audioFromVideo=file.size<=600_000_000;
    const previous=latest.current;
    const different=!!previous.localMedia.main&&(previous.localMedia.main.filename!==file.name||previous.localMedia.main.bytes!==file.size);
    if(different&&(previous.transcript||previous.capsules.length)&&!window.confirm(fr?
      "Changer de vidéo invalidera les anciens extraits et leurs repères. Créer une nouvelle analyse pour ce master?":
      "Changing the video invalidates previous clips and their timing. Start a new analysis for this master?"))return;
    setFiles(current=>({...current,main:file,audio:audioFromVideo?file:undefined}));
    const safeMedia={...previous.localMedia};
    if(!audioFromVideo)delete safeMedia.audio;
    modify({...(different?{transcript:"",analysis:null,timedWords:[],capsules:[],selectedCapsuleId:"",stage:"recording" as const}:{}),
      localMedia:{
      ...safeMedia,
      main:{filename:file.name.slice(0,180),bytes:file.size},
      ...(audioFromVideo?{audio:{filename:file.name.slice(0,180),bytes:file.size}}:{}),
    },timeline:{...previous.timeline,alignmentApproved:false,
      offsets:{...previous.timeline.offsets,main:0,...(audioFromVideo?{audio:0}:{})},
      visualClaps:{...previous.timeline.visualClaps,main:null},
      audioSource:audioFromVideo?"audio":previous.timeline.audioSource,
      finalAudioSource:audioFromVideo?"audio":previous.timeline.finalAudioSource,
    }});
    setMessage(audioFromVideo?(fr?
      "Master Premiere importé. Une seule vidéo suffit pour l'aperçu et la transcription si le navigateur peut en lire l'audio.":
      "Premiere master imported. One file is enough if your browser can decode its audio."):(fr?
      "Vidéo importée. Pour analyser ce gros fichier, exporte une copie audio MP3/M4A depuis Premiere dans les options ci-dessous.":
      "Video imported. For transcription, export an MP3/M4A from Premiere and select it below."));
    setError("");setTranscriptionFailure(null);
  };
  // One IA action: transcribe the Premiere master, analyze, and prepare visual clips.
  async function analyzeTranscriptText(transcript:string,context?:Partial<StudioProject>){
    const response=await fetch("/api/analysis",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({consent:true,lang,transcript})});
    if(!response.ok){
      const body=await response.json().catch(()=>null) as {error?:string}|null;
      throw Error(body?.error||"ANALYSIS_FAILED");
    }
    const raw=await response.json() as NonNullable<StudioProject["analysis"]>;
    const value={synopsis:raw.synopsis,themes:raw.themes,editorial_cautions:raw.editorial_cautions,moments:raw.moments};
    const prepared={...latest.current,...context,transcript,analysis:value};
    const drafts=createDraftsFromAnalysis(prepared);
    const capsules=[...prepared.capsules,...drafts];
    modify({
      ...context,transcript,analysis:value,selectedMoment:0,stage:"editing",
      capsules,selectedCapsuleId:prepared.selectedCapsuleId||capsules[0]?.id||"",
    });
    record("analysis","Analyse IA terminée : "+String(value.moments.length)+" extraits, "+String(drafts.length)+" capsules préparées","success");
    setActiveSection("editing");
    setMessage(fr?"L'IA a trouvé "+String(value.moments.length)+" passages. Clique sur une bulle pour la voir sur ta vidéo.":
      "AI found "+String(value.moments.length)+" highlights. Choose a bubble to preview it on your video.");
  }
  const transcribe=async()=>{
    const audio=files.audio;
    if(!audio||!consent||busy)return;
    setTranscriptionFailure(null);
    setBusy("transcribe");setError("");
    try{
      setTranscriptionProgress(fr?"Vérification de la session privée…":"Checking Studio session…");
      const authResponse=await fetch("/api/studio/session",{method:"GET",cache:"no-store",credentials:"same-origin"});
      if(!authResponse.ok){
        const authBody=await authResponse.json().catch(()=>null) as {error?:string}|null;
        throw Error(authResponse.status===401?"UNAUTHORIZED":
          authResponse.status===503?"AUTH_STORE_UNAVAILABLE":authBody?.error||"AUTH_CHECK_FAILED");
      }
      setTranscriptionProgress(fr?"Décodage audio local…":"Decoding local audio…");
      const decoded=await decodeLocalAudio(audio);
      const ranges=chunkRanges(decoded.duration);
      const textParts:string[]=[];
      const words:StudioProject["timedWords"]=[];
      for(let i=0;i<ranges.length;i++){
        const {start,end}=ranges[i];
        setTranscriptionProgress(fr?`Transcription : segment ${i+1}/${ranges.length}`:
          `Transcribing segment ${i+1}/${ranges.length}`);
        const chunk=makeMonoWavChunk(decoded,start,end);
        const form=new FormData();
        form.set("audio",chunk);form.set("lang",lang);form.set("consent","true");
        const response=await fetch("/api/analysis/transcribe",{method:"POST",body:form});
        const data=await response.json().catch(()=>null) as
          {transcript?:string;timedWords?:StudioProject["timedWords"];error?:string}|null;
        if(!response.ok||!data?.transcript){
          const code=data?.error||`HTTP_${response.status}`;
          throw Error(code.replace(/[^A-Z0-9_:-]/gi,"").slice(0,90)||"TRANSCRIBE_FAILED");
        }
        textParts.push(data.transcript);
        for(const word of data.timedWords||[]){
          if(words.length>=6000)break;
          words.push({...word,start:Math.round((word.start+start)*100)/100,
            end:Math.round((word.end+start)*100)/100});
        }
      }
      const transcript=textParts.join(" ").slice(0,26000);
      const timeline={...latest.current.timeline,
        duration:Math.min(7200,Math.max(10,Math.ceil(decoded.duration)))};
      modify({transcript,timedWords:words,analysis:null,selectedMoment:0,
        stage:"transcription",timeline});
      record("transcription","Transcription horodatée générée en mémoire, sans Blob","success");
      setTranscriptionFailure(null);
      setBusy("analyze");
      setTranscriptionProgress(fr?"L'IA sélectionne maintenant les meilleurs moments…":
        "AI is selecting the strongest highlights…");
      try{
        await analyzeTranscriptText(transcript,{timedWords:words,timeline});
      }catch(e){
        setActiveSection("analysis");
        setError(fr?
          "Audio transcrit et conservé, mais l'analyse IA n'a pas abouti. Clique à nouveau sur Analyser pour réessayer.":
          "Audio was transcribed and saved, but AI analysis did not finish. Click Analyze to retry.");
        record("error","Analyse IA échouée après transcription : "+(e instanceof Error?e.message:"UNKNOWN"),"failure");
      }
    }catch(e){
      const code=(e instanceof Error?e.message:"UNKNOWN").slice(0,90);
      const detail=transcriptionFailureMessage(code,"transcribe",fr);
      setTranscriptionFailure({code,stage:"transcribe",detail});
      record("error",`Échec transcription directe : ${code}`,"failure");
      setMessage("");
    }finally{setBusy("");setTranscriptionProgress("")}
  };
  const reconstructQuestions=async()=>{
    if(!consent||project.transcript.length<100||busy)return;
    setBusy("questions");setError("");
    try{
      const res=await fetch("/api/analysis/reconstruct-questions",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({transcript:project.transcript,lang}),
      });
      const body=await res.json() as {proposals?:StudioProject["reconstructedQuestions"];error?:string};
      if(!res.ok||!body.proposals)throw Error(body.error||"FAILED");
      modify({reconstructedQuestions:body.proposals});
      record("analysis",`${body.proposals.length} questions hypothétiques proposées à partir des réponses`,"success");
      setMessage(fr?"Questions hypothétiques générées et enregistrées. Ce ne sont pas les questions originales.":"Hypothetical questions saved; these are not original audio.");
    }catch(e){
      setError(fr?`Reconstruction indisponible (${e instanceof Error?e.message:"ERROR"}).`:
        `Question reconstruction unavailable (${e instanceof Error?e.message:"ERROR"}).`);
    }finally{setBusy("")}
  };
  const analyze=async()=>{
    if(!consent||project.transcript.length<100||busy)return;
    setBusy("analyze");setError("");
    try{await analyzeTranscriptText(project.transcript)}
    catch{
      record("error","Échec analyse IA","failure");
      setError(fr?"Analyse IA indisponible. Ta transcription est conservée.":"AI analysis unavailable. Your transcript is preserved.");
    }finally{setBusy("")}
  };
  const openProject=async(id:string)=>{
    if(uploading||status==="saving"||status==="pending")return;
    try{
      const p=await load(id);setFiles({});
      persisted.current=JSON.stringify({...p,updatedAt:undefined});
      latest.current=p;setProject(p);setStatus("saved");setError("");setTranscriptionFailure(null);setActiveSection("projects");
    }catch{setError(fr?"Impossible d’ouvrir ce projet.":"Cannot open this project.")}
  };
  const newProject=()=>{
    if(uploading||status==="pending"||status==="saving")return;
    const last=[project,...projects].reduce((n,item)=>item.season===project.season?Math.max(n,item.episode):n,0);
    const p={...freshProject(lang),season:project.season,episode:last+1,name:`DOM SOUCY MEDIA — ${episodeCode(project.season,last+1)}`};setFiles({});
    latest.current=p;setProject(p);setStatus("pending");setError("");setMessage("");
    setRecoveryCandidate(null);
    setTranscriptionFailure(null);
    setActiveSection("import");
  };
  const stepSection=(n:number)=>n===0?"projects":n===1||n===4?"import":n===2||n===3?"analysis":"advanced";
  const step=(n:number,title:string,meta:string,children:React.ReactNode)=><section
    hidden={activeSection!==stepSection(n)} className="analysis-panel studio-step">
    <div className="analysis-panel-head"><h2>{String(n).padStart(2,"0")} / {title}</h2><span>{meta}</span></div>{children}
  </section>;
  const tile=(key:SourceKey)=>{
    const file=files[key],saved=project.localMedia?.[key]||undefined;
    const legacy=project.media[key];
    const name=(fr?names:englishNames)[key];
    return <div className="studio-source-tile">
      <strong>{name}</strong>
      <label className="analysis-source-pick">
        {file?(fr?"REMPLACER LE FICHIER LOCAL":"REPLACE LOCAL FILE"):(fr?"+ CHOISIR UN FICHIER":" + CHOOSE FILE")}
        <input aria-label={name} type="file"
          accept={key==="audio"||key==="enhanced"?"audio/*,.mp3,.m4a,.wav,.ogg,.flac":"video/*,.mov,.mp4,.m4v,.webm"}
          onChange={e=>choose(key,e)}/>
      </label>
      {file?<p className="studio-media-confirm">✓ {fr?"FICHIER LOCAL PRÊT":"LOCAL FILE READY"} · {file.name} · {(file.size/1e6).toFixed(1)} Mo</p>:
        saved?<p className="analysis-note">{fr?`Dernière source : ${saved.filename} — à resélectionner sur cet appareil.`:
          `Last source: ${saved.filename} — reselect on this device.`}</p>:
        legacy?<p className="analysis-note">{fr?`Ancienne copie Vercel : ${legacy.filename}. Resélectionne l'original local.`:
          `Legacy Vercel file: ${legacy.filename}. Reselect the local original.`}</p>:null}
    </div>;
  };
  const cleanupLegacyMedia=async()=>{
    if(cleanupBusy||!Object.keys(project.media).length)return;
    if(!window.confirm(fr?
      "Supprimer définitivement les anciens médias de ce projet dans Vercel Blob ? Assure-toi que les originaux sont disponibles dans Google Drive. Aucun fichier Google Drive ne sera supprimé.":
      "Permanently delete this project's legacy Vercel Blob media? Confirm your originals are in Google Drive. Drive files will not be touched."))return;
    setCleanupBusy(true);setCleanupFeedback("");
    try{
      const response=await fetch("/api/analysis/legacy-media-cleanup",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({projectId:project.id,confirm:"DELETE_PROJECT_VERCEL_MEDIA"}),
      });
      const data=await response.json() as {deleted?:string[];failed?:string[];total?:number;error?:string};
      if(!response.ok)throw Error(data.error||"CLEANUP_FAILED");
      if(data.deleted?.length){
        const media={...latest.current.media};
        for(const key of data.deleted as SourceKey[])delete media[key];
        modify({media});
      }
      setCleanupFeedback(fr?
        `${data.deleted?.length||0} fichier(s) supprimé(s) de Vercel. ${data.failed?.length||0} échec(s). ${data.failed?.length?"Si Vercel refuse les suppressions pendant la suspension, supprime-les via Storage > Manage Blobs.":""}`:
        `${data.deleted?.length||0} Vercel files deleted; ${data.failed?.length||0} failed.`);
    }catch(e){
      setCleanupFeedback(fr?`Suppression impossible : ${e instanceof Error?e.message:"UNKNOWN"}. Utilise Vercel Storage > Manage Blobs.`:
        `Delete failed: ${e instanceof Error?e.message:"UNKNOWN"}. Use Vercel Storage > Manage Blobs.`);
    }finally{setCleanupBusy(false)}
  };
  const projectSaved=status==="saved";
  const hasTranscript=project.transcript.trim().length>=100;
  const hasAnalysis=!!project.analysis?.moments.length;
  const approvedCapsules=project.capsules.filter(c=>c.review==="approved");
  const suggestedNext=approvedCapsules.length?"production":project.capsules.length?"editing":
    !files.main&&!files.audio&&!hasTranscript?"import":!hasAnalysis?"analysis":"editing";
  const quickNavigate=(tab:typeof activeSection)=>{
    setActiveSection(tab);
    window.setTimeout(()=>document.getElementById("studio-phase5-current")?.scrollIntoView({behavior:"smooth",block:"start"}),0);
  };
  const mainSteps=[
    {id:"import" as const,num:"01",icon:"↓",name:fr?"IMPORTER":"IMPORT",
      detail:fr?"Choisir les médias sources":"Choose source media",ready:!!files.main||!!files.audio||hasTranscript},
    {id:"analysis" as const,num:"02",icon:"✦",name:fr?"ANALYSER":"ANALYZE",
      detail:fr?"Transcription et meilleurs extraits":"Transcript and highlights",ready:hasAnalysis},
    {id:"editing" as const,num:"03",icon:"◉",name:fr?"CRÉER LES BULLES":"CREATE BUBBLES",
      detail:fr?"Valider les extraits et créer les bulles":"Review clips and create graphics",ready:approvedCapsules.length>0},
    {id:"production" as const,num:"04",icon:"↓",name:fr?"EXPORTER":"EXPORT",
      detail:fr?"Préparer le rendu HD sur ton Mac":"Prepare local HD rendering",ready:false},
    {id:"publish" as const,num:"05",icon:"↗",name:fr?"PUBLIER":"PUBLISH",
      detail:fr?"Préparer la diffusion":"Prepare social distribution",ready:false},
  ];
  const nextStep=mainSteps.find(item=>item.id===suggestedNext);
  const saveLabel={
    loading:fr?"CHARGEMENT":"LOADING",
    pending:fr?"MODIFICATIONS À ENREGISTRER":"UNSAVED CHANGES",
    saving:fr?"SAUVEGARDE EN COURS":"SAVING",
    saved:fr?"✓ PROJET SAUVEGARDÉ":"✓ PROJECT SAVED",
    error:fr?"ÉCHEC DE SAUVEGARDE":"SAVE FAILED",
  }[status];

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
        {saveLabel}
      </div>
    </header>
    {transcriptionFailure&&<div className="studio-transcription-banner" role="alert">
      <strong>{fr?"TRANSCRIPTION EN ÉCHEC":"TRANSCRIPTION FAILED"}</strong>
      <span>{transcriptionFailure.code}</span>
      <button type="button" onClick={()=>setActiveSection("import")}>{fr?"VOIR L'ERREUR":"VIEW ERROR"}</button>
    </div>}
    <div className="studio-simple-command">
      <div className="studio-simple-heading">
        <div>
          <p className="analysis-kicker">PREMIERE PRO → DOM SOUCY STUDIO → HD</p>
          <h2>{fr?"UNE ACTION À LA FOIS.":"ONE ACTION AT A TIME."}</h2>
          <p>{fr?"Le montage multicaméra se fait dans Premiere. Ici, tu crées les capsules, les bulles et leur plan de production.":"Multicam editing belongs in Premiere. Here, build your capsules, graphics and production plans."}</p>
        </div>
        <div className="studio-simple-tools">
          <button type="button" onClick={()=>quickNavigate("projects")}>{fr?"MES PROJETS":"MY PROJECTS"}</button>
          <button type="button" onClick={()=>quickNavigate("advanced")}>{fr?"RÉGLAGES":"SETTINGS"}</button>
        </div>
      </div>
      <nav className="studio-simple-steps" aria-label={fr?"Étapes de production":"Production steps"}>
        {mainSteps.map(item=><button type="button" key={item.id}
          className={activeSection===item.id?"studio-simple-tile active":"studio-simple-tile"}
          aria-current={activeSection===item.id?"step":undefined}
          onClick={()=>quickNavigate(item.id)}>
          <span className="studio-simple-tile-top"><span>{item.num} / {String(mainSteps.length).padStart(2,"0")}</span><span>{activeSection===item.id?(fr?"EN COURS":"CURRENT"):item.ready?"✓ "+(fr?"PRÊT":"READY"):(fr?"À FAIRE":"TO DO")}</span></span>
          <span className="studio-simple-tile-icon" aria-hidden="true">{item.icon}</span>
          <strong>{item.name}</strong>
          <small>{item.detail}</small>
        </button>)}
      </nav>
      <div className="studio-simple-continue">
        <span><strong>{fr?"PROCHAINE ACTION":"NEXT ACTION"}</strong>
          {nextStep?.detail}
        </span>
        <button type="button" className="studio-simple-go" onClick={()=>quickNavigate(suggestedNext)}>
          {nextStep?.name} →
        </button>
      </div>
    </div>
    <div id="studio-phase5-current" className="studio-phase5-context" role="status">
      <span>{project.name} / {episodeCode(project.season,project.episode)}</span>
      <strong>{activeSection==="projects"?(fr?"BIBLIOTHÈQUE":"LIBRARY"):
        activeSection==="import"?(fr?"FICHIERS SOURCES":"SOURCE FILES"):
        activeSection==="analysis"?(fr?"TRANSCRIPTION & IA":"TRANSCRIPT & AI"):
        activeSection==="editing"?(fr?"CAPSULES & BULLES":"CAPSULES & GRAPHICS"):
        activeSection==="production"?(fr?"RENDU HD LOCAL":"LOCAL HD RENDERER"):
        activeSection==="publish"?(fr?"PRÉPARATION DE LA DIFFUSION":"PUBLICATION PREPARATION"):
        fr?"OUTILS AVANCÉS":"ADVANCED TOOLS"}</strong>
    </div>
    <div hidden={activeSection!=="projects"} className="studio-workspace-project-library">
      <EpisodeDashboard lang={lang} episodes={projects} currentId={project.id} onOpen={openProject}
        onNew={newProject} disabled={!ready||uploading||status==="pending"||status==="saving"}/>
    </div>
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
      <div id="studio-episode-backdrops"><StudioBackdropPicker lang={lang} project={project} onChange={patch=>modify(patch)}/></div>
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
      {status==="error"&&<div className="studio-recovery-alert" role="alert">
        <strong>{fr?"SAUVEGARDE SERVEUR NON CONFIRMÉE":"SERVER SAVE NOT CONFIRMED"}</strong>
        <p>{error}</p>
        <small>{fr?"Code d’erreur":"Error code"} : {saveFailure||"UNKNOWN"}</small>
        <div className="studio-recovery-actions">
          <button type="button" className="analysis-primary" onClick={()=>setRetryKey(n=>n+1)}
            disabled={uploading}>{fr?"RÉESSAYER LA SAUVEGARDE":"RETRY SAVE"}</button>
          <button type="button" className="analysis-secondary"
            onClick={()=>download(`dom-soucy-${project.season}-${project.episode}-recuperation.json`,JSON.stringify(project,null,2))}>
            {fr?"TÉLÉCHARGER UNE COPIE DE SECOURS":"DOWNLOAD RECOVERY COPY"}
          </button>
        </div>
      </div>}
      {localBackupError&&<p className="analysis-error">{localBackupError}</p>}
      {recoveryCandidate && (recoveryCandidate.id!==project.id ||
        JSON.stringify({...recoveryCandidate,updatedAt:undefined}) !==
        JSON.stringify({...project,updatedAt:undefined})) &&
        <div className="studio-recovery-available">
        <strong>{fr?"COPIE LOCALE D’UN AUTRE PROJET":"LOCAL BACKUP OF ANOTHER PROJECT"}</strong>
        <p>{recoveryCandidate.name} — {fr?"copie locale différente du serveur":"local copy differs from server"}</p>
        <div className="studio-recovery-actions">
          <button type="button" className="analysis-primary" onClick={()=>{
            if(status==="saving"||uploading)return;
            latest.current=recoveryCandidate;
            setProject(recoveryCandidate);
            setRecoveryCandidate(null);setStatus("pending");setRetryKey(n=>n+1);
          }}>{fr?"RESTAURER LA COPIE LOCALE":"RESTORE LOCAL BACKUP"}</button>
          <button type="button" className="analysis-secondary" onClick={()=>setRecoveryCandidate(null)}>
            {fr?"GARDER LA VERSION SERVEUR":"KEEP SERVER VERSION"}
          </button>
        </div>
      </div>}
      <p className="analysis-note">{fr
        ?"Sauvegarde automatique du projet, de la transcription et des coupes. Les vidéos restent sur ton appareil ou dans Google Drive et doivent être resélectionnées après un rechargement."
        :"Auto-saves the project, transcript and edit decisions. Videos stay on your device or in Google Drive and must be selected again after a reload."}</p>
      <button type="button" className="analysis-secondary"
        onClick={()=>download("dom-soucy-projet-sauvegarde.json",JSON.stringify(project,null,2))}>
        {fr?"TÉLÉCHARGER UNE COPIE DU PROJET (.JSON)":"DOWNLOAD PROJECT BACKUP (.JSON)"}
      </button>
    </>)}
    {step(1,fr?"DÉPOSER MA VIDÉO PREMIERE":"DROP MY PREMIERE VIDEO",files.main?(fr?"✓ VIDÉO PRÊTE":"✓ VIDEO READY"):"MP4 / MOV",<>
      <p>{fr?"Ton montage multicaméra, ton son et ton décor sont déjà terminés dans Premiere. Dépose simplement le master ici : aucune correction d'image n'est demandée.":"Your multicam edit, sound and backdrop are already finished in Premiere. Just drop the master here. No image adjustments are required."}</p>
      <div className="studio-master-dropzone" onDragOver={e=>e.preventDefault()}
        onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files?.[0];if(file)choosePremiereMaster(file)}}>
        <label className="studio-master-pick" htmlFor="studio-premiere-master">
          <span aria-hidden="true">↓</span>
          <strong>{files.main?(fr?"✓ VIDÉO PREMIERE IMPORTÉE":"✓ PREMIERE VIDEO IMPORTED"):
            fr?"DÉPOSE TA VIDÉO ICI":"DROP YOUR VIDEO HERE"}</strong>
          <small>{files.main?.name||(fr?"OU CLIQUE POUR CHOISIR UN MP4 / MOV":"OR CLICK TO CHOOSE AN MP4 / MOV")}</small>
          <input type="file" id="studio-premiere-master" accept="video/mp4,video/quicktime,.mp4,.mov,.m4v"
            onChange={e=>{const file=e.currentTarget.files?.[0];if(file)choosePremiereMaster(file);e.currentTarget.value=""}}/>
        </label>
      </div>
      <details className="studio-simple-details">
        <summary>{fr?"MON MP4 EST TROP LOURD OU SON AUDIO N'EST PAS RECONNU":"MY VIDEO IS TOO LARGE OR AUDIO CAN'T BE READ"}</summary>
        <p className="analysis-note">{fr?
          "Si le MP4 dépasse 600 Mo ou si le navigateur ne sait pas décoder sa piste audio, exporte depuis Premiere un fichier M4A, MP3 ou WAV du même montage. Il servira seulement à l'analyse.":
          "If your MP4 is over 600 MB or your browser cannot decode the audio track, export a matching M4A, MP3 or WAV from Premiere for analysis only."}</p>
        {tile("audio")}
      </details>
      <details className="studio-audio-optimized studio-simple-details"><summary>{fr?"OPTIONNEL — AMÉLIORER LA VOIX":"OPTIONAL — ENHANCE VOICE"}</summary>
        <h3>{fr?"PISTE AUDIO FINALE — VOIX OPTIMISÉE":"FINAL AUDIO — ENHANCED VOICE"}</h3>
        <p>{fr
          ?"Améliore ton audio avec Adobe Podcast, puis sélectionne ici le résultat. Le Studio utilise la piste optimisée pour le montage tant que cet onglet reste ouvert."
          :"Enhance audio with Adobe Podcast, then select the result here. The optimized track is available for editing in this browser session."}</p>
        <a href="https://podcast.adobe.com/enhance-speech" target="_blank" rel="noopener noreferrer"
          className="analysis-secondary studio-enhance-cta">{fr?"✦ OPTIMISER L’AUDIO ↗":"✦ ENHANCE AUDIO ↗"}</a>
        {tile("enhanced")}
        <p className="analysis-note">{fr
          ?"Adobe Enhance n’est pas lancé automatiquement depuis ce bouton : aucun accès API public générique n’est disponible. Télécharge d’abord le résultat d’Adobe, puis importe-le ici."
          :"Adobe Enhance does not run inside this Studio. Download the processed audio from Adobe first, then import it here."}</p>
      </details>

      <p className="analysis-note">{fr?"Transcription en segments de 90 secondes : pas de limite de 24 Mo sur le fichier original et aucune copie audio conservée sur Vercel Blob. Fichiers compatibles avec le décodeur du navigateur uniquement.":"90-second transcription chunks. No 24 MB original-file limit and no audio archived in Vercel Blob. Source must be decodable by the browser."}</p>
    </>)}
    {step(2,fr?"TRANSCRIPTION (FACULTATIF)":"TRANSCRIPT (OPTIONAL)",`${project.transcript.length} / 26 000`,<>
      <details className="studio-simple-details"><summary>{fr?"VOIR OU CORRIGER LA TRANSCRIPTION (OPTIONNEL)":"VIEW OR EDIT TRANSCRIPT (OPTIONAL)"}</summary>
      <p>{fr?"Relis tes paroles. La transcription horodatée permet de découper automatiquement les capsules. Toute correction manuelle du texte invalide les anciens repères et nécessite une nouvelle transcription horodatée.":"Review the transcript. Word timestamps can create capsule cuts automatically. Editing the transcript invalidates previous timestamps and requires re-transcription."}</p>
      <p className="analysis-note">{fr?`${project.timedWords.length} mots horodatés`:`${project.timedWords.length} timed words`}</p>
      <textarea aria-label={fr?"Transcription":"Transcript"} rows={11} maxLength={26000}
        value={project.transcript} onChange={e=>modify({transcript:e.target.value,timedWords:[],analysis:null,selectedMoment:0})}
        placeholder={fr?"La transcription apparaît ici après traitement…":"Transcription appears here…"}/>
      <button type="button" className="analysis-secondary" disabled={!project.transcript}
        onClick={()=>download("dom-soucy-transcription.txt",project.transcript,"text/plain")}>
        {fr?"TÉLÉCHARGER LE TEXTE (.TXT)":"DOWNLOAD TEXT (.TXT)"}
      </button>
      </details>
    </>)}
    {step(3,fr?"ANALYSE IA":"AI ANALYSIS",`${project.analysis?.moments.length||0} ${fr?"EXTRAITS":"CLIPS"}`,<>
      <p>{fr?"L’analyse détecte des passages exacts, sans créer artificiellement des citations.":"AI finds exact excerpts, without inventing quotes."}</p>
      {transcriptionProgress&&<p role="status" className="analysis-note">{transcriptionProgress}</p>}
      <label className="analysis-consent"><input type="checkbox" checked={consent}
        onChange={e=>setConsent(e.target.checked)}/>
        <span>{fr?"J'autorise la transcription et l'analyse privées par l'IA.":"I consent to private AI transcription and analysis."}</span>
      </label>
      <button type="button" className="analysis-primary studio-simple-primary"
        disabled={!consent||(!files.audio&&project.transcript.trim().length<100)||!!busy}
        onClick={()=>{if(project.transcript.trim().length>=100)void analyze();else void transcribe()}}>
        {busy?(fr?"✦ ANALYSE EN COURS…":"✦ ANALYZING…"):
          fr?"✦ ANALYSER MA VIDÉO":"✦ ANALYZE MY VIDEO"}
      </button>
      {!files.audio&&project.transcript.length<100&&<p className="analysis-note">{fr?
        "Dépose d'abord le master Premiere. Pour une vidéo de plus de 600 Mo, ajoute sa petite piste audio dans l'étape Importer.":
        "First import your Premiere master. For videos over 600 MB, add a separate audio export in Import."}</p>}
      {transcriptionFailure&&<div className="studio-transcription-failure" role="alert" aria-live="assertive" id="studio-transcription-failure">
        <div className="studio-transcription-failure-header">
          <strong>{fr?"TRANSCRIPTION BLOQUÉE":"TRANSCRIPTION BLOCKED"}</strong>
          <button type="button" aria-label={fr?"Fermer l'erreur":"Dismiss error"} onClick={()=>setTranscriptionFailure(null)}>×</button>
        </div>
        <p>{transcriptionFailure.detail}</p>
        {transcriptionFailure.code==="UNAUTHORIZED"&&<div className="studio-session-recovery">
          <strong>{fr?"01 / RECONNECTER LE STUDIO":"01 / SIGN BACK IN"}</strong>
          <a href={`/${lang}/studio-live`} target="_blank" rel="noopener noreferrer"
             className="studio-session-reconnect">
            {fr?"OUVRIR LA CONNEXION DANS UN NOUVEL ONGLET ↗":"OPEN SIGN-IN IN A NEW TAB ↗"}
          </a>
          <p>{fr?"Une fois reconnecté, reviens dans CET onglet et clique sur Réessayer. Ne recharge pas la page : ton audio reste sélectionné.":"After signing in, return to THIS tab and click Retry. Do not refresh; your audio stays selected."}</p>
          <strong>{fr?"02 / RÉESSAYER LA TRANSCRIPTION":"02 / RETRY TRANSCRIPTION"}</strong>
        </div>}
        <code>{transcriptionFailure.stage.toUpperCase()} · {transcriptionFailure.code}</code>
        <div className="studio-transcription-failure-actions">
          <button type="button" className="analysis-primary" disabled={!!busy||!consent||!files.audio}
            onClick={()=>{void transcribe()}}>{transcriptionFailure.code==="UNAUTHORIZED"?(fr?"JE SUIS RECONNECTÉ — RÉESSAYER":"SIGNED BACK IN — RETRY"):(fr?"RÉESSAYER LA TRANSCRIPTION":"RETRY TRANSCRIPTION")}</button>
          <button type="button" className="analysis-secondary" onClick={()=>
            void navigator.clipboard?.writeText(`${transcriptionFailure.stage}: ${transcriptionFailure.code}`)}>
            {fr?"COPIER LE CODE D'ERREUR":"COPY ERROR CODE"}</button>
        </div>
      </div>}

      <details className="studio-reconstructed studio-simple-details"><summary>{fr?"OPTIONNEL — RECONSTRUIRE LES QUESTIONS DES JOURNALISTES":"OPTIONAL — RECONSTRUCT JOURNALIST QUESTIONS"}</summary>
        <h3>{fr?"RECRÉER LES QUESTIONS MANQUANTES POUR LES BULLES":"REBUILD MISSING QUESTIONS FOR BUBBLES"}</h3>
        <p>{fr
          ?"Si tu n’as plus l’audio des journalistes, l’IA peut proposer des questions plausibles à partir des réponses réellement filmées. Ce sont des propositions de montage, pas les paroles originales des journalistes."
          :"If the journalists' audio was lost, AI can suggest plausible on-screen questions grounded in your filmed responses. These are editing suggestions, not original speech."}</p>
        <button type="button" className="analysis-secondary" onClick={reconstructQuestions}
          disabled={!consent||project.transcript.trim().length<100||!!busy}>
          {busy==="questions"?(fr?"RECONSTRUCTION EN COURS…":"RECONSTRUCTING…"):
           (fr?"✦ PROPOSER LES QUESTIONS POUR LES BULLES":"✦ SUGGEST QUESTIONS FOR BUBBLES")}
        </button>
        {!!project.reconstructedQuestions.length&&<div className="studio-reconstructed-list">
          {project.reconstructedQuestions.map((q,i)=><div key={q.id}>
            <strong>{fr?"QUESTION RECONSTRUITE (NON ORIGINALE)":"RECONSTRUCTED QUESTION (NOT ORIGINAL)"} · {i+1}</strong>
            <label>{fr?"TEXTE MODIFIABLE DE LA BULLE":"EDITABLE BUBBLE TEXT"}
              <textarea rows={2} value={q.question} maxLength={300} onChange={e=>
                modify({reconstructedQuestions:project.reconstructedQuestions.map(x=>x.id===q.id?{...x,question:e.target.value}:x)})}/>
            </label>
            <small>{fr?"Réponse utilisée comme contexte":"Supporting answer excerpt"} : « {q.answerExcerpt} »</small>
            <button className="analysis-secondary" type="button" onClick={()=>{
              const id=crypto.randomUUID();
              modify({capsules:[...project.capsules,{
                id,title:`Question ${i+1}`,start:0,end:0,format:project.format,review:"pending" as const,
                style:"conversation" as const,caption:q.answerExcerpt.slice(0,500),bubble:q.question,
                background:"dark" as const,keying:{...defaultChroma},textPosition:"bottom" as const,status:"draft" as const,
              }].slice(0,40),selectedCapsuleId:id,stage:"editing"});
              setActiveSection("editing");
              window.setTimeout(()=>document.getElementById("studio-capsule-workshop")?.scrollIntoView({behavior:"smooth",block:"start"}),0);
            }}>{fr?"UTILISER CETTE BULLE DANS UNE CAPSULE":"USE THIS BUBBLE IN A CAPSULE"}</button>
          </div>)}
        </div>}
      </details>
      {project.analysis&&<><div className="studio-auto-edit-panel">
        <strong>{fr?"ANALYSE TERMINÉE — PROCHAINE ÉTAPE":"ANALYSIS COMPLETE — NEXT STEP"}</strong>
        <p>{fr?
          `Tes ${project.analysis.moments.length} moments sont repérés. Passe à l’atelier pour préparer des capsules, choisir nos bulles et exporter un plan HD.`:
          `${project.analysis.moments.length} highlights found. Open the workshop to prepare clips, choose graphics and export an HD plan.`}</p>
        <button type="button" className="analysis-primary" onClick={()=>{
          const drafts=createDraftsFromAnalysis(latest.current);
          if(drafts.length)modify({capsules:[...latest.current.capsules,...drafts],selectedCapsuleId:drafts[0].id,stage:"editing"});
          setActiveSection("editing");
          window.setTimeout(()=>document.getElementById("studio-capsule-workshop")?.scrollIntoView({behavior:"smooth",block:"start"}),0);
        }}>
          {fr?`CRÉER MES ${project.analysis.moments.length} CAPSULES →`:
            `CREATE MY ${project.analysis.moments.length} CAPSULES →`}
        </button>
      </div><p className="analysis-synopsis">{project.analysis.synopsis}</p>
        <div className="analysis-tags">{project.analysis.themes.map((t,i)=><span key={i}>{t}</span>)}</div>
        <div className="analysis-moment-list">{project.analysis.moments.map((m,i)=><button
          key={i} type="button" className={project.selectedMoment===i?"selected":""}
          onClick={()=>modify({selectedMoment:i})}><span>{i+1}</span><div><strong>{m.title}</strong>
          <small>{capsuleById(m.model_id)?.[fr?"title":"en"]} · {m.excerpt.slice(0,115)}</small></div></button>)}</div>
        <button className="analysis-secondary" type="button" onClick={()=>download("dom-soucy-analyse.json",JSON.stringify(project.analysis,null,2))}>
          {fr?"TÉLÉCHARGER L’ANALYSE":"DOWNLOAD ANALYSIS"}
        </button>
      </>}
    </>)}
    <div hidden={activeSection!=="editing"&&activeSection!=="production"} className="studio-phase5-capsules">
      <BubbleWorkshopSimple lang={lang} project={project} master={files.main}
        view={activeSection==="production"?"export":"editing"}
        onReviewClips={()=>quickNavigate("editing")} onOpenExport={()=>quickNavigate("production")}
        onChange={patch=>modify(patch)} onEvent={record}/>
    </div>

    <div hidden={activeSection!=="advanced"} className="studio-simple-technical">
      <button type="button" className="analysis-secondary" onClick={()=>setShowTechnicalMontage(v=>!v)}>
        {showTechnicalMontage?(fr?"MASQUER L’ANCIEN ÉDITEUR TECHNIQUE":"HIDE LEGACY TECHNICAL EDITOR"):
          fr?"OPTIONS AVANCÉES — ANCIEN ÉDITEUR VIDÉO":"ADVANCED — LEGACY VIDEO EDITOR"}
      </button>
      <p className="analysis-note">{fr?"Les caméras et le montage multicaméra se font désormais dans Premiere. L’ancien éditeur navigateur reste disponible pour les anciens projets, sans remplacer le rendu HD.":"Multicam editing now happens in Premiere. The old browser editor remains for legacy projects and is not the HD renderer."}</p>
    </div>
    <section hidden={activeSection!=="production"} className="analysis-panel studio-step studio-simple-production">
      <div className="analysis-panel-head"><h2>{fr?"04 / PRODUIRE EN HD":"04 / PRODUCE IN HD"}</h2><span>PREMIERE + STUDIO + MAC</span></div>
      <p>{fr?"Les bulles se règlent dans le Studio. Elles sont placées automatiquement dans le MP4 par notre moteur HD local. Tu n’as pas besoin de les positionner dans Premiere.":"Set the bubbles in Studio. The local HD renderer automatically positions them in the MP4; you do not need to place them in Premiere."}</p>
      <div className="studio-simple-production-steps">
        <div><strong>01</strong><span>{fr?"EXPORTER master.mp4 DEPUIS PREMIERE":"EXPORT master.mp4 FROM PREMIERE"}</span></div>
        <div><strong>02</strong><span>{fr?"CHOISIR LA CAPSULE ET TÉLÉCHARGER SON JSON":"CHOOSE THE CAPSULE AND DOWNLOAD ITS JSON"}</span></div>
        <div><strong>03</strong><span>{fr?"LANCER LE MOTEUR HD SUR LE MAC":"RUN THE HD RENDERER ON YOUR MAC"}</span></div>
      </div>
      <button className="analysis-primary studio-simple-primary" type="button" onClick={()=>quickNavigate("editing")}>
        {fr?"CHOISIR MA CAPSULE ET MES BULLES →":"CHOOSE MY CAPSULE AND BUBBLES →"}
      </button>
      <a className="analysis-secondary" target="_blank" rel="noopener noreferrer"
        href="https://github.com/dominique-source/dominiquesoucy/tree/main/render-engine">
        {fr?"OUVRIR LE MOTEUR HD ET LES INSTRUCTIONS ↗":"OPEN THE HD RENDERER AND INSTRUCTIONS ↗"}
      </a>
      <p className="analysis-note">{fr?"Aujourd’hui, le Studio fournit un manifeste JSON par capsule. L’export HD en un clic directement sur le site reste à développer; aucun rendu n’est lancé ici automatiquement.":"Currently Studio downloads a JSON manifest for each capsule. One-click HD rendering from this page is not implemented; no render starts here automatically."}</p>
    </section>
    <section hidden={activeSection!=="publish"} className="analysis-panel studio-step studio-simple-production">
      <div className="analysis-panel-head">
        <h2>{fr?"05 / PRÉPARER LA DIFFUSION":"05 / PREPARE PUBLICATION"}</h2>
        <span>{fr?"PLATEFORMES NON CONNECTÉES":"PLATFORMS NOT CONNECTED"}</span>
      </div>
      <p>{fr?"Retrouve les capsules approuvées et leurs formats pour préparer la diffusion. Le Studio n’envoie aucun fichier aux plateformes à cette étape.":
        "Review approved clips and their formats before sharing. Studio sends no files to platforms at this step."}</p>
      {approvedCapsules.length>0?<ul className="studio-approved-clips">
        {approvedCapsules.map(c=><li key={c.id}><strong>{c.title}</strong><span>{c.format}</span></li>)}
      </ul>:<p className="analysis-note">{fr?"Les capsules approuvées apparaîtront ici.":"Approved clips will appear here."}</p>}
      <button className="analysis-primary studio-simple-primary" type="button" onClick={()=>quickNavigate(approvedCapsules.length?"production":"editing")}>
        {approvedCapsules.length?(fr?"← ACCÉDER AUX EXPORTS":"← OPEN EXPORTS"):(fr?"← VALIDER LES CAPSULES":"← REVIEW CLIPS")}
      </button>
    </section>
    {showTechnicalMontage&&activeSection==="advanced"&&<div className="studio-phase5-editor">
    <MultiCamEditor key={project.id}
      autoSyncEnabled={ready&&!!files.audio&&(["main","vertical","secondary"] as SourceKey[]).some(k=>!!files[k])}
      projectId={project.id} capsules={project.capsules}
      backdrops={Object.fromEntries(project.capsules.map(c=>[c.id,
        resolveBackdrop(project.studioBackdrop,project.id,[project.name,project.transcript,c.title].join(" ")).file]))}
      sources={files}
      name={project.name} lang={lang} highlight={project.analysis?.moments[project.selectedMoment]?.excerpt}
      savedTimeline={project.timeline} onTimelineChange={t=>modify({timeline:t})}
      format={project.format} onFormatChange={format=>modify({format})}
      capsule={project.capsules.find(c=>c.id===project.selectedCapsuleId)}
      onCapsuleChange={(id,patch)=>modify({capsules:latest.current.capsules.map(c=>
        c.id===id?{...c,...patch,review:reviewAfterTimingChange(c,patch),status:"draft"}:c)})}
      selectedBackgroundUrl={resolveBackdrop(project.studioBackdrop,project.id,[project.name,project.transcript,project.capsules.find(c=>c.id===project.selectedCapsuleId)?.title||""].join(" ")).file}
      onProceedToCapsules={()=>{
        if(!project.capsules.length){
          const id=crypto.randomUUID();
          modify({stage:"editing",selectedCapsuleId:id,capsules:[{
            id,title:project.analysis?.moments?.[0]?.title?.slice(0,100)||"Capsule 01",
            start:project.timeline.clipStart,end:project.timeline.clipEnd,
            format:project.format,style:"conversation",
            caption:project.analysis?.moments?.[0]?.excerpt?.slice(0,500)||"",
            bubble:project.analysis?.moments?.[0]?.title?.slice(0,160)||"",
            background:"dark",keying:{...defaultChroma},textPosition:"bottom",status:"draft",
          }]});
        }else modify({stage:"editing"});
      }}
      onExportOutcome={(ok,details)=>{
        record(ok?"export":"error",details,ok?"success":"failure");
        const id=project.selectedCapsuleId;
        if(id)modify({capsules:project.capsules.map(c=>c.id===id?{...c,status:ok?"rendered":"failed"}:c)});
      }}/>
    </div>}
    {step(9,fr?"HISTORIQUE ET INCIDENTS":"HISTORY & ISSUES",`${project.events.length} LOGS`,<>
      <div className="studio-auto-edit-panel">
        <strong>{fr?"NETTOYAGE DES ANCIENNES COPIES VERCEL":"LEGACY VERCEL MEDIA CLEANUP"}</strong>
        <p>{fr?
          "Les nouveaux fichiers ne sont plus envoyés sur Vercel. Tu peux supprimer les anciennes copies Blob de ce projet; les projets, transcriptions, réglages et fichiers Google Drive ne seront pas supprimés.":
          "New files no longer upload to Vercel. Delete the legacy Blob copies for this project; project metadata, transcripts, edits and Google Drive files are untouched."}</p>
        <p className="analysis-note">{Object.keys(project.media).length} {fr?"ancienne(s) référence(s) Vercel":"legacy Vercel references"}</p>
        <button type="button" className="analysis-secondary" disabled={cleanupBusy||!Object.keys(project.media).length}
          onClick={()=>{void cleanupLegacyMedia()}}>
          {cleanupBusy?(fr?"SUPPRESSION…":"DELETING…"):(fr?"SUPPRIMER CES COPIES DE VERCEL":"DELETE THESE VERCEL COPIES")}
        </button>
        {cleanupFeedback&&<p role="status" className="analysis-note">{cleanupFeedback}</p>}
      </div>
      <p>{fr?"Tableau de bord de cet épisode : retrouve les événements, les transferts, les erreurs de traitement et les exports. Les détails techniques confidentiels ne sont pas enregistrés.":"Episode dashboard: processing events and recoverable errors. Sensitive technical details are not logged."}</p>
      <div className="studio-event-log">{project.events.length?project.events.map(e=><div key={e.id} className={`studio-event ${e.status}`}>
        <span>{new Date(e.date).toLocaleString(fr?"fr-CA":"en-CA")}</span><strong>{e.type.toUpperCase()}</strong><p>{e.message}</p>
      </div>):<p>{fr?"Aucun événement pour le moment.":"No events yet."}</p>}</div>
    </>)}
    {message&&<p className="analysis-media-ok" role="status">{message}</p>}
    {error&&<p className="analysis-error" role="alert">{error}</p>}
  </section>;
}
