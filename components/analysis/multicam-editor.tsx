"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderLocalMp4 } from "./local-mp4";
import { drawStudioFrame,preloadStudioBackground } from "./canvas-overlays";
import type { StudioProject } from "@/lib/analysis/project";
import { alignCameraAudio, type CameraSyncResult } from "@/lib/analysis/browser-audio-fingerprint";
import {
  activeCamera, cameraKeys, edl, labels, offsetFromClap,
  safeCutTime, sourceTime, timeCode, proposeMulticamCuts,
  type CameraKey, type Cut, type SourceFiles, type SourceKey
} from "@/lib/analysis/multicam";

const initialOffsets: Record<SourceKey, number> = { audio:0, enhanced:0, main:0, vertical:0, secondary:0 };
const initialClaps: Record<SourceKey, number> = { audio:0, enhanced:0, main:0, vertical:0, secondary:0 };

type Timeline={ duration:number; clipStart:number; clipEnd:number; audioSource:SourceKey; finalAudioSource:SourceKey; alignmentApproved:boolean; visualClaps:Record<CameraKey,number|null>; offsets:Record<SourceKey,number>; claps:Record<SourceKey,number>; cuts:Cut[] };
type MediaInfo={filename:string;bytes:number;pathname:string;contentType:string};
export function MultiCamEditor({ sources, remoteUrls, mediaMetadata, name, lang, highlight, savedTimeline, onTimelineChange, format, onFormatChange, capsule, onExportOutcome, onProceedToCapsules, selectedBackgroundUrl }: {
  sources: SourceFiles; remoteUrls?:Partial<Record<SourceKey,string>>;
  mediaMetadata?:Partial<Record<SourceKey,MediaInfo>>;
  name: string; lang: "fr"|"en"; highlight?: string;
  savedTimeline?:Timeline; onTimelineChange?:(value:Timeline)=>void;
  format?:"16:9"|"9:16"|"1:1"; onFormatChange?:(format:"16:9"|"9:16"|"1:1")=>void;
  capsule?:StudioProject["capsules"][number]; onExportOutcome?:(ok:boolean,details:string)=>void;
  onProceedToCapsules?:()=>void;
  selectedBackgroundUrl?:string;
}) {
  const fr = lang === "fr";
  const videos = cameraKeys.filter(key=>!!sources[key] || !!remoteUrls?.[key]);
  const availableAudio: SourceKey[] = [ ...(sources.audio || remoteUrls?.audio ? ["audio" as const] : []), ...(sources.enhanced || remoteUrls?.enhanced ? ["enhanced" as const] : []), ...videos ];
  const [audioSource, setAudioSource] = useState<SourceKey>(savedTimeline?.audioSource || "audio");
  const [finalAudioSource,setFinalAudioSource]=useState<SourceKey>(savedTimeline?.finalAudioSource || "audio");
  const [visualClaps,setVisualClaps]=useState<Record<CameraKey,number|null>>(savedTimeline?.visualClaps || {main:null,vertical:null,secondary:null});
  const [visualAligned,setVisualAligned]=useState<{anchor:CameraKey;projectClap:number;offsets:Record<SourceKey,number>;count:number}|null>(null);
  const [alignmentReviewed,setAlignmentReviewed]=useState(savedTimeline?.alignmentApproved||false);
  const [expandedReview,setExpandedReview]=useState(true);

  const [selectedCamera, setSelectedCamera] = useState<CameraKey>("main");
  const [offsets,setOffsets] = useState(savedTimeline?.offsets || initialOffsets);
  const [claps,setClaps] = useState(savedTimeline?.claps || initialClaps);
  const [duration,setDuration] = useState(savedTimeline?.duration || 300);
  const [clipStart,setClipStart]=useState(savedTimeline?.clipStart ?? 0);
  const [clipEnd,setClipEnd]=useState(savedTimeline?.clipEnd ?? 60);
  const [playhead,setPlayhead] = useState(0);
  const [playing,setPlaying] = useState(false);
  const [cuts,setCuts] = useState<Cut[]>(savedTimeline?.cuts || []);
  const [suggestedCuts,setSuggestedCuts]=useState<Cut[]|null>(null);
  const [decorPreview,setDecorPreview]=useState(false);
  const [decorCamera,setDecorCamera]=useState<CameraKey>("main");
  const decorCanvas=useRef<HTMLCanvasElement|null>(null);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");
  const [rendering,setRendering]=useState(false);
  const [renderPercent,setRenderPercent]=useState(0);
  const [renderNonce,setRenderNonce]=useState(0);
  const [autoSyncBusy,setAutoSyncBusy]=useState(false);
  const [autoSyncProgress,setAutoSyncProgress]=useState("");
  const [autoSyncResults,setAutoSyncResults]=useState<CameraSyncResult[]>([]);
  const autoSyncController=useRef<AbortController|null>(null);
  useEffect(()=>()=>autoSyncController.current?.abort(),[]);
  const elements=useRef<Partial<Record<SourceKey,HTMLMediaElement|null>>>({});
  const urls=useMemo(() => {
    // Browser object URLs do not copy gigabyte-sized camera files to JavaScript memory.
    const created: Partial<Record<SourceKey,string>> = {};
    (Object.keys(sources) as SourceKey[]).forEach(k => {
      if(sources[k]) created[k]=URL.createObjectURL(sources[k]);
    });
    return created;
  },[sources]);
  useEffect(()=>()=>Object.values(urls).forEach(url=>URL.revokeObjectURL(url)),[urls]);
  const playbackUrls={...remoteUrls,...urls};
  const timeline={duration,clipStart,clipEnd,audioSource,finalAudioSource,alignmentApproved:alignmentReviewed,visualClaps,offsets,claps,cuts};
  const lastPersisted=useRef(JSON.stringify(savedTimeline||timeline));
  useEffect(()=>{
    if(!onTimelineChange)return;
    const next=JSON.stringify(timeline);
    if(next===lastPersisted.current)return;
    lastPersisted.current=next;
    onTimelineChange(timeline);
  },[duration,clipStart,clipEnd,audioSource,finalAudioSource,alignmentReviewed,visualClaps,offsets,claps,cuts,onTimelineChange]);

  const realAudioSource = availableAudio.includes(audioSource) ? audioSource : availableAudio[0];
  const realFinalAudioSource=availableAudio.includes(finalAudioSource)?finalAudioSource:(availableAudio.includes("enhanced")?"enhanced":realAudioSource);
  const realCamera = videos.includes(selectedCamera) ? selectedCamera : videos[0];
  const selected = activeCamera(cuts,playhead,realCamera);
  const effectiveCamera = videos.includes(selected) ? selected : realCamera;

  const seekAll=useCallback((time:number, offsetsValue=offsets,maxTime=duration)=>{
    const t=safeCutTime(time,maxTime);
    for(const k of (Object.keys(elements.current) as SourceKey[])){
      const node=elements.current[k];
      if(!node || !Number.isFinite(node.duration)) continue;
      const target=Math.min(Math.max(0,node.duration-0.05),sourceTime(t,offsetsValue[k]));
      if(Math.abs(node.currentTime-target)>.12) {
        try{node.currentTime=target}catch{/* unsupported codec / source seek */ }
      }
    }
    setPlayhead(t);
  },[duration,offsets]);

  const pauseAll=useCallback(()=>{
    Object.values(elements.current).forEach(el=>el?.pause());
    setPlaying(false);
  },[]);
  useEffect(()=>{
    // Source replacement should not erase existing saved edits or clap markers.
    pauseAll();
    setPlayhead(0);
  },[urls,pauseAll]);

  const synchronize=useCallback((newOffsets:Record<SourceKey,number>,targetTime=playhead,maxTime=duration)=>{
    pauseAll();
    setOffsets(newOffsets);
    seekAll(targetTime,newOffsets,maxTime);
  },[pauseAll,seekAll,playhead,duration]);

  function openSynchronizedPreview(){
    pauseAll();
    setExpandedReview(true);
    const t=visualAligned?.projectClap!==undefined?Math.max(0,visualAligned.projectClap-2):Math.min(playhead,duration);
    seekAll(t);
    document.getElementById("studio-camera-preview")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  const play=async()=>{
    if(playing){pauseAll();return}
    setError("");
    seekAll(playhead);
    const active = Object.entries(elements.current) as Array<[SourceKey,HTMLMediaElement|null]>;
    try{
      // Start all streams at the same logical project position; local drift is
      // corrected against the chosen audio clock while playback continues.
      await Promise.all(active.map(async([key,el])=>{
        if(!el)return;
        el.muted = key!==realFinalAudioSource;
        await el.play();
      }));
      setPlaying(true);
    }catch{
      pauseAll();
      setError(fr
        ? "Le navigateur n’a pas pu lire une des caméras. Certains MOV Canon/iPhone nécessitent une conversion H.264 MP4 compatible."
        : "Browser could not play a camera. Some Canon/iPhone MOV files require H.264 MP4 conversion.");
    }
  };

  const onClock=()=>{
    if(!playing)return;
    const master=elements.current[realAudioSource];
    if(!master)return;
    const t=Math.max(0,master.currentTime-offsets[realAudioSource]);
    setPlayhead(Math.min(duration,t));
    if(t>=duration-.07){pauseAll();return}
    // Soft drift correction: no full rebuffer if deviation is under ~250ms.
    (Object.entries(elements.current) as Array<[SourceKey,HTMLMediaElement|null]>)
      .forEach(([key,el])=>{
        if(!el || key===realAudioSource || el.readyState<2)return;
        const target=sourceTime(t,offsets[key]);
        if(Math.abs(el.currentTime-target)>.30 && target<el.duration-.05){
          try{el.currentTime=target}catch{/* media may not be seekable yet */ }
        }
      });
  };

  async function synchronizeAutomatically(){
    if(autoSyncBusy||rendering||!realAudioSource||!videos.length)return;
    pauseAll();setError("");setSuccess("");setAutoSyncResults([]);
    const controller=new AbortController();
    autoSyncController.current=controller;
    setAutoSyncBusy(true);
    setAutoSyncProgress(fr?"Préparation de l’audio de référence…":"Preparing reference audio…");
    try{
      const results=await alignCameraAudio({
        urls:playbackUrls,master:realAudioSource,sources:videos,
        signal:controller.signal,
        onProgress:key=>setAutoSyncProgress(
          key==="REFERENCE"?(fr?"Lecture de l’audio de référence…":"Scanning reference audio…"):
          (fr?`Analyse du son : ${labels[key as SourceKey]}…`:`Scanning audio: ${labels[key as SourceKey]}…`)
        ),
      });
      if(controller.signal.aborted)return;
      setAutoSyncResults(results);
      const accepted=results.filter(r=>r.match.confidence!=="unreliable"&&!r.error);
      if(accepted.length){
        const next={...offsets,[realAudioSource]:0};
        for(const entry of accepted)next[entry.source]=entry.match.lagSeconds;
        synchronize(next);
      }
      const failed=results.length-accepted.length;
      setSuccess(accepted.length
        ? fr?`${accepted.length} caméra(s) alignée(s) automatiquement et sauvegardée(s). ${failed? `${failed} à vérifier manuellement.`:"Vérifie le résultat à l’écoute."}`:
          `${accepted.length} camera(s) aligned and saved. ${failed? `${failed} require manual review.`:"Verify by listening."}`
        : fr?"Aucune synchronisation suffisamment fiable. Les réglages existants ont été conservés.":"No sufficiently reliable audio match. Existing offsets were preserved.");
    }catch(e){
      if(controller.signal.aborted)return;
      const code=e instanceof Error?e.message:"UNKNOWN";
      onExportOutcome?.(false,`Échec MP4 : ${code}`);
      setError(fr?`Synchronisation automatique indisponible (${code}). Essaie les repères manuels ou un MP4 H.264 avec audio.`:
        `Automatic sync unavailable (${code}). Try manual markers or an H.264 MP4 with audio.`);
    }finally{
      if(autoSyncController.current===controller)autoSyncController.current=null;
      setAutoSyncBusy(false);setAutoSyncProgress("");
    }
  }
  function setClap(key:SourceKey,value:number){
    setClaps(prev=>({...prev,[key]:Math.max(0,Number.isFinite(value)?value:0)}));
  }
  function syncFromClap(){
    const reference = realAudioSource;
    const next = {...initialOffsets};
    (Object.keys(playbackUrls) as SourceKey[]).forEach(key=>{
      next[key]=offsetFromClap(claps[reference],claps[key]);
    });
    synchronize(next);
    setSuccess(fr
      ? "Alignement manuel appliqué à partir des repères de clap. Vérifie les lèvres et le son à plusieurs endroits de la conférence."
      : "Manual alignment applied from clap markers. Verify lips and sound at several points.");
  }
  useEffect(()=>{
    if(!decorPreview||!capsule)return;
    if(capsule.background==="signature"&&selectedBackgroundUrl){
      void preloadStudioBackground(selectedBackgroundUrl).catch(()=>setError(fr?
        "Décor de sport non disponible dans le repo. Conserve les fichiers originaux et vérifie les ressources du Studio.":
        "Sport backdrop file is missing in the repository. Verify the Studio assets."));
    }
    let raf=0;let last=0;
    const paint=(now:number)=>{
      if(now-last>=95){
        last=now;
        const canvas=decorCanvas.current;
        const ctx=canvas?.getContext("2d",{alpha:false});
        const camera=videos.includes(decorCamera)?decorCamera:videos[0];
        const el=elements.current[camera] as HTMLVideoElement|undefined;
        if(ctx&&canvas){
          try{
            drawStudioFrame(ctx,el,canvas.width,canvas.height,0,0,{
              style:capsule.style,background:capsule.background,caption:"",
              bubble:"",textPosition:capsule.textPosition,keying:capsule.keying,backgroundUrl:selectedBackgroundUrl,
            });
          }catch{setDecorPreview(false);setError(fr?
            "Prévisualisation indisponible : la vidéo ne permet pas la lecture de pixels locale.":
            "Preview unavailable: this video cannot be read into a local canvas.");return}
        }
      }
      raf=requestAnimationFrame(paint);
    };
    raf=requestAnimationFrame(paint);
    return ()=>cancelAnimationFrame(raf);
  },[decorPreview,decorCamera,capsule,fr,selectedBackgroundUrl,videos.join("|")]);
  function proposeEdit(){
    pauseAll();
    const from=capsule?capsule.start:clipStart;
    const to=capsule?capsule.end:clipEnd;
    if(!Number.isFinite(from)||!Number.isFinite(to)||to-from<1||to>duration){
      setError(fr?"Définis le début et la fin de la capsule avant de générer les angles.":
        "Set valid capsule start and end times before generating an edit.");
      return;
    }
    const plan=proposeMulticamCuts({start:from,end:to,available:videos,primary:videos.includes("main")?"main":realCamera});
    setSuggestedCuts(plan);setError("");
    setSuccess(fr?
      `Proposition prête : ${plan.length} changements d’angle à valider. Le MP4 n'est pas encore modifié.`:
      `Draft ready: ${plan.length} camera decisions to review. Your MP4 is not changed yet.`);
  }
  function applySuggestedEdit(){
    if(!suggestedCuts?.length)return;
    const from=capsule?capsule.start:clipStart;
    const to=capsule?capsule.end:clipEnd;
    const retained=cuts.filter(c=>c.at<from||c.at>=to);
    const next=[...retained,...suggestedCuts].sort((a,b)=>a.at-b.at);
    setCuts(next);
    setSuggestedCuts(null);
    pauseAll();seekAll(from);
    setSuccess(fr?
      "Montage multicaméra enregistré dans le projet. Prévisualise les angles, puis exporte le MP4.":
      "Multicam edit saved to project. Preview angles, then export MP4.");
  }
  function markCut(){
    if(!realCamera)return;
    const cut:Cut={id:crypto.randomUUID(),at:safeCutTime(playhead,duration),camera:realCamera};
    setCuts(prev=>[...prev.filter(c=>Math.abs(c.at-cut.at)>.15),cut].sort((a,b)=>a.at-b.at));
    setSelectedCamera(realCamera);
  }
  async function exportMp4(){
    if(rendering||!realCamera||!realAudioSource)return;
    const renderStart=capsule?capsule.start:clipStart;
    const renderEnd=capsule?capsule.end:clipEnd;
    if(renderEnd<=renderStart || renderEnd>duration){setError(fr?"Choisis un début et une fin de clip valides.":"Choose a valid clip start and end.");return}
    if(renderEnd-renderStart>600){setError(fr?"Le clip est limité à 10 minutes pour ce premier test.":"Clip is limited to 10 minutes.");return}
    if(!sources[realFinalAudioSource] || videos.some(key=>!sources[key])){
      setError(fr?"Pour exporter, resélectionne les fichiers originaux de toutes les caméras et de la piste audio utilisée.":"For export, reselect original files for every camera and reference audio.");
      return;
    }
    setError("");setSuccess("");pauseAll();seekAll(renderStart);setRendering(true);setRenderPercent(0);
    try{
      const blob=await renderLocalMp4({
        nodes:elements.current,offsets,audioSource:realAudioSource,finalAudioSource:realFinalAudioSource,
        cuts,fallback:realCamera,duration,start:renderStart,end:renderEnd,format:capsule?.format||format||"16:9",
        visual:capsule?{style:capsule.style,background:capsule.background,caption:capsule.caption,bubble:capsule.bubble,textPosition:capsule.textPosition,keying:capsule.keying,backgroundUrl:selectedBackgroundUrl}:undefined,
        onProgress:setRenderPercent,
      });
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download=`dom-soucy-${name.replace(/[^a-z0-9-]/gi,"-").slice(0,45)}.mp4`;a.click();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      setSuccess(fr?"Export MP4 produit dans le navigateur et proposé au téléchargement. Vérifie le son et l’image avant publication.":"MP4 rendered in your browser and offered for download. Review the result.");
      onExportOutcome?.(true,`MP4 ${capsule?.title||name} exporté localement`);
    }catch(e){
      const code=e instanceof Error?e.message:"UNKNOWN";
      setError(fr?`Export MP4 impossible (${code}). Si ton navigateur ne le supporte pas, conserve le plan de montage JSON et essaie Safari.`:
        `MP4 export failed (${code}). If unsupported, export EDL JSON or try Safari.`);
    }finally{
      setRendering(false);
      setRenderNonce(v=>v+1);
    }
  }
  function exportEdl(){
    const result=edl({
      projectName:name,duration,offsets,cuts,
      sourceNames:Object.fromEntries(Object.keys(playbackUrls).map(key=>[key,sources[key as SourceKey]?.name||mediaMetadata?.[key as SourceKey]?.filename||""])),
      audioSource:realAudioSource,
    });
    const data=new Blob([JSON.stringify(result,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(data);
    const a=document.createElement("a");a.href=url;a.download="dom-soucy-multicam-montage.json";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  if(!videos.length)return <section className="analysis-panel analysis-multicam">
    <div className="analysis-panel-head"><h2>05 / {fr?"ALIGNER LES CAMÉRAS":"ALIGN CAMERAS"}</h2><span>LOCAL / V1</span></div>
    <p>{fr?"Sélectionne au moins une caméra dans les cases ci-dessus pour ouvrir la timeline.":"Select at least one camera above to open the timeline."}</p>
  </section>;

  return <section className="analysis-panel analysis-multicam" aria-label={fr?"Montage multicaméra":"Multicamera editor"}>
    <div className="analysis-panel-head"><h2>05 / {fr?"ALIGNER LES CAMÉRAS":"ALIGN CAMERAS"}</h2><span>{videos.length} / 3 CAMÉRAS · LOCAL</span></div>
    <p>{fr
      ? "Alignement automatique expérimental par analyse du son, prévisualisation et montage. Les fichiers locaux ne sont pas envoyés à un service supplémentaire pour cette opération."
      : "Experimental automatic audio alignment, angle preview and editing. Locally selected files are processed in your browser for this operation."}</p>
    {highlight && <div className="analysis-multi-highlight">
      <strong>{fr?"EXTRAIT SÉLECTIONNÉ DANS L’ANALYSE":"HIGHLIGHT SELECTED IN ANALYSIS"}</strong>
      <p>« {highlight.slice(0,280)}{highlight.length>280?"…":""} »</p>
      <small>{fr?"Repère cet extrait à l’écoute : les mots ne sont pas encore liés automatiquement à un timecode vidéo.":"Find this passage by listening; transcript passages are not automatically linked to video timecodes yet."}</small>
    </div>}
    <div className="analysis-multi-controls">
      <label>{fr?"AUDIO DE RÉFÉRENCE":"REFERENCE AUDIO"}
        <select value={realAudioSource} onChange={e=>{pauseAll();setAudioSource(e.target.value as SourceKey)}}>
          {availableAudio.map(k=><option key={k} value={k}>{labels[k]}</option>)}
        </select>
      </label>
      <label>{fr?"AUDIO FINAL À ENTENDRE":"FINAL AUDIO TRACK"}
        <select value={realFinalAudioSource} onChange={e=>{pauseAll();setFinalAudioSource(e.target.value as SourceKey)}}>
          {availableAudio.map(k=><option key={k} value={k}>{labels[k]}</option>)}
        </select>
      </label>
      <label>{fr?"DURÉE DU PROJET (SECONDES)":"PROJECT LENGTH (SECONDS)"}
        <input type="number" min={10} max={7200} value={duration} onChange={e=>{pauseAll();setDuration(Math.min(7200,Math.max(10,Number(e.target.value)||10)))}}/>
      </label>
    </div>

    <div className="analysis-multi-claps">
      <strong>{fr?"05 · ALIGNEMENT AUTOMATIQUE PAR LE SON":"05 · AUTOMATIC AUDIO ALIGNMENT"}</strong>
      <p>{fr
        ?"Clique une seule fois. Le Studio compare un court extrait sonore de chaque caméra avec l’audio de référence et calcule le décalage. Aucun clap ni réglage de secondes requis si le son est suffisamment clair."
        :"One click compares a short sound sample from each camera with the reference audio and estimates offsets. No manual clap needed when the audio is clear."}</p>
      <button className="analysis-primary analysis-auto-sync-button" type="button" disabled={autoSyncBusy||rendering||!realAudioSource}
        onClick={synchronizeAutomatically}>
        {autoSyncBusy?(fr?"◉ ALIGNEMENT EN COURS…":"◉ SYNCING…"):(fr?"✦ ALIGNER AUTOMATIQUEMENT LES CAMÉRAS":"✦ AUTO-SYNC CAMERAS")}
      </button>
      {autoSyncBusy&&<p role="status" className="analysis-multi-sync-progress">
        <span className="analysis-multi-sync-spinner" aria-hidden="true"/> {autoSyncProgress}
      </p>}
      {!!autoSyncResults.length&&<div className="analysis-multi-sync-results">
        {autoSyncResults.map(r=><div key={r.source} className="analysis-multi-sync-result">
          <strong>{labels[r.source]}</strong>
          <span>{r.error? (fr?"Son non décodable":"Audio unavailable") :
            r.match.confidence==="unreliable"?(fr?"À vérifier — pas de correspondance fiable":"Needs review — weak match"):
            `${r.match.lagSeconds>=0?"+":""}${r.match.lagSeconds.toFixed(2)} s · ${r.match.confidence==="strong"?(fr?"CONFIANCE ÉLEVÉE":"HIGH CONFIDENCE"):(fr?"À VÉRIFIER":"REVIEW")}`}</span>
        </div>)}
      </div>}
      <details className="analysis-multi-manual">
        <summary>{fr?"AJUSTEMENT MANUEL (SI NÉCESSAIRE)":"MANUAL ALIGNMENT (IF NEEDED)"}</summary>
        <p>{fr
          ?"Si le son d’une caméra est inexploitable, repère un clap commun et saisis la seconde dans chaque fichier. Exemple : audio 4, Canon 9."
          :"If audio matching fails, identify a common clap and enter its time in each file. Example: audio 4, Canon 9."}</p>
        <div className="analysis-multi-clap-grid">
          {(Object.keys(playbackUrls) as SourceKey[]).map(key=><label key={key}>{labels[key]}
            <input type="number" min={0} step={0.1} value={claps[key]} onChange={e=>setClap(key,Number(e.target.value))}/>
          </label>)}
        </div>
        <button className="analysis-secondary" type="button" disabled={autoSyncBusy} onClick={syncFromClap}>
          {fr?"APPLIQUER LES REPÈRES MANUELS":"APPLY MANUAL MARKERS"}
        </button>
      </details>
      {success&&<p role="status" className="analysis-multi-success">{success}</p>}
    </div>

    <div className="analysis-multi-claps">
      <strong>{fr?"ALIGNEMENT PAR CLAP VISUEL EN FIN D’ENREGISTREMENT":"VISUAL END-OF-RECORDING CLAP"}</strong>
      <p>{fr
        ?"Si le micro Canon est mauvais : utilise la barre de lecture de chaque vidéo à l’étape 06 pour trouver l’image exacte où tes mains se touchent à la fin, puis clique ici sur « Marquer l’image actuelle » pour chaque caméra. Aucun son Canon n’est nécessaire."
        :"If a camera microphone is poor, use each camera video’s controls in step 06 to find the exact frame where hands touch at the end, then mark that frame here. No camera audio needed."}</p>
      <div className="analysis-multi-visual-claps">
        {videos.map(key=><div key={key}>
          <strong>{labels[key]}</strong><span>{visualClaps[key]===null?"—":`${visualClaps[key]?.toFixed(2)} s`}</span>
          <button type="button" className="analysis-secondary" onClick={()=>{
            const node=elements.current[key];
            if(!node||!Number.isFinite(node.currentTime))return;
            setVisualClaps(old=>({...old,[key]:Math.round(node.currentTime*100)/100}));
            setVisualAligned(null);
            setAlignmentReviewed(false);
          }}>{fr?"MARQUER L’IMAGE ACTUELLE":"MARK CURRENT FRAME"}</button>
        </div>)}
      </div>
      <button type="button" className="analysis-primary" onClick={()=>{
        setVisualAligned(null);
        setAlignmentReviewed(false);
        const keys=videos.filter(key=>visualClaps[key]!==null);
        if(keys.length<2){setError(fr?"Marque la même image de clap sur au moins deux vidéos.":"Mark the same clap frame on at least two videos.");return}
        // Prefer a camera already matched to the external reference audio.
        // The visual clap then transfers that trusted offset to the silent Canon.
        const confirmed=autoSyncResults.find(r=>keys.includes(r.source as CameraKey) &&
          r.match.confidence!=="unreliable"&&!r.error);
        const anchor=(confirmed?.source as CameraKey|undefined) ||
          (keys.includes(realAudioSource as CameraKey)?realAudioSource as CameraKey:undefined) ||
          (keys.includes("main")?"main":keys[0]);
        const base=visualClaps[anchor]||0;
        const anchorOffset=offsets[anchor];
        const next={...offsets};
        for(const key of keys)next[key]=anchorOffset+(visualClaps[key]||0)-base;
        const clapPosition=Math.max(0,base-anchorOffset);
        // Most claps are at the END, far past the default 300-second timeline.
        // Expand the preview range before seeking so the synchronized clap is actually visible.
        const nextDuration=Math.min(7200,Math.max(duration,Math.ceil(clapPosition+2)));
        if(nextDuration!==duration)setDuration(nextDuration);
        const previewTime=Math.max(0,clapPosition-.15);
        synchronize(next,previewTime,nextDuration);
        setVisualAligned({anchor,projectClap:clapPosition,offsets:next,count:keys.length});
        setAlignmentReviewed(false);
        setExpandedReview(true);
        setError("");
        setSuccess(fr?
          `Clap visuel aligné pour ${keys.length} caméras. ${confirmed?"Référence audio transférée depuis la caméra fiable.":"Alignement relatif des caméras seulement : vérifie le son final."} Vérifie aussi le début de la vidéo.`:
          `Visual clap matched for ${keys.length} cameras. ${confirmed?"Transferred timing from a trusted audio match.":"Cameras aligned relative to each other; check final audio."} Verify the start as well.`);
      }}>{fr?"ALIGNER SUR LE CLAP VISUEL":"ALIGN USING VISUAL CLAP"}</button>
      {visualAligned&&<div className="studio-clap-confirmation" role="status" aria-live="polite">
        <strong>✓ {fr?"ALIGNEMENT VISUEL CALCULÉ":"VISUAL ALIGNMENT CALCULATED"} · {visualAligned.count} {fr?"CAMÉRAS":"CAMERAS"}</strong>
        <p>{fr
          ? "Les vidéos ont été repositionnées près du clap commun dans l’étape 06. Les décalages sont ajoutés au projet par sauvegarde automatique."
          : "Camera playback was moved near the matching clap in step 06. Offsets are automatically saved in the project."}</p>
        <div className="studio-clap-offsets">
          {videos.map(key=><div key={key}>
            <span>{labels[key]}</span>
            <strong>{visualAligned.offsets[key]>=0?"+":""}{visualAligned.offsets[key].toFixed(2)} s</strong>
            {key===visualAligned.anchor&&<small>{fr?"RÉFÉRENCE VISUELLE":"VISUAL REFERENCE"}</small>}
          </div>)}
        </div>
        <button type="button" className="analysis-primary studio-view-sync" onClick={openSynchronizedPreview}>
          {fr?"▶ VOIR LES 3 CAMÉRAS ENSEMBLE ↓":"▶ REVIEW ALL 3 CAMERAS TOGETHER ↓"}
        </button>
        <p className="analysis-note">{fr
          ?"Important : les images des caméras sont alignées entre elles. Si ton audio final est un fichier séparé, il doit être vérifié par rapport à une caméra; ce clap visuel seul ne prouve pas la synchronisation de la voix."
          :"Camera images are aligned to each other. A separately recorded final audio track still needs verification against a camera."}</p>
      </div>}
      <p className="analysis-note">{fr
        ?"Le clap doit être visible dans au moins deux caméras. Si une caméra est déjà alignée au son principal, son repère est transmis aux autres. Sinon, les caméras sont alignées entre elles seulement. Vérifie la voix finale."
        :"If one camera has a trusted audio match, the clap transfers its offset to the other cameras. Otherwise, only relative alignment is possible. Verify final voice timing."}</p>
    </div>
    <div className="analysis-multi-player-header studio-review-header" id="studio-camera-preview">
      <div className="studio-review-title">
        <strong>{fr?"06 · VOIR LES CAMÉRAS SYNCHRONISÉES":"06 · REVIEW SYNCHRONIZED CAMERAS"}</strong>
        <small>{fr?"Les trois angles côte à côte, pilotés par une seule lecture":"Three angles side by side, one playback control"}</small>
      </div>
      <span>{timeCode(playhead)} / {timeCode(duration)}</span>
    </div>
    <div className="studio-review-instructions">
      <strong>{fr?"ÉTAPE SUIVANTE : VÉRIFIER LES IMAGES":"NEXT: CHECK THE PICTURE"}</strong>
      <p>{fr?"Clique « Lire les 3 caméras ensemble » et regarde si le clap arrive au même instant dans chaque image. Reviens aussi au début et au milieu de la vidéo pour vérifier.":"Play all three cameras and check that hands clap together. Also test the start and middle."}</p>
      <button type="button" className="analysis-primary studio-review-play" onClick={play}>
        {playing?(fr?"❚❚ METTRE LES 3 CAMÉRAS EN PAUSE":"❚❚ PAUSE ALL CAMERAS"):(fr?"▶ LIRE LES 3 CAMÉRAS ENSEMBLE":"▶ PLAY ALL 3 CAMERAS")}
      </button>
      <button type="button" className="analysis-secondary" onClick={()=>{pauseAll();seekAll(0)}}>{fr?"REVENIR AU DÉBUT":"GO TO START"}</button>
      <button type="button" className="analysis-secondary" onClick={()=>setExpandedReview(v=>!v)}>
        {expandedReview?(fr?"RÉDUIRE LA VUE":"COLLAPSE VIEW"):(fr?"AGRANDIR LA VUE":"EXPAND VIEW")}
      </button>
    </div>
    <div className={`analysis-multi-grid studio-synchronized-grid ${expandedReview?"is-expanded":""}`}>
      {videos.map(key=><div key={key} className={`analysis-multi-camera ${effectiveCamera===key?"is-active":""}`}>
        <video key={renderNonce} ref={el=>{elements.current[key]=el}} src={playbackUrls[key]} controls playsInline preload="metadata" muted
          onTimeUpdate={realAudioSource===key?onClock:undefined}
          onError={()=>setError(fr?`Impossible de lire ${labels[key]}. Essaie de convertir ce fichier en MP4 H.264.`:`Cannot play ${labels[key]}. Try converting it to H.264 MP4.`)}
          aria-label={labels[key]}/>
        <div className="analysis-multi-camera-label"><span>{labels[key]}</span>
          <button type="button" className="studio-clap-mark" onClick={()=>{
            const node=elements.current[key];
            if(!node||!Number.isFinite(node.currentTime))return;
            setVisualClaps(old=>({...old,[key]:Math.round(node.currentTime*100)/100}));
            setVisualAligned(null);
            setAlignmentReviewed(false);
            setSuccess(fr?`Clap ${labels[key]} marqué à ${node.currentTime.toFixed(2)} seconde(s).`:
              `Marked ${labels[key]} clap at ${node.currentTime.toFixed(2)} seconds.`);
          }}>{fr?"MARQUER CLAP":"MARK CLAP"}</button>
          <button type="button" onClick={()=>{setSelectedCamera(key);setCuts(prev=>[
            ...prev.filter(c=>Math.abs(c.at-playhead)>.15),
            {id:crypto.randomUUID(),at:safeCutTime(playhead,duration),camera:key}
          ].sort((a,b)=>a.at-b.at))}}>{fr?"COUPER ICI":"CUT HERE"}</button>
        </div>
      </div>)}
    </div>
    {(sources.audio || remoteUrls?.audio) && <audio key={renderNonce} ref={el=>{elements.current.audio=el}} src={playbackUrls.audio} preload="metadata"
      onTimeUpdate={realAudioSource==="audio"?onClock:undefined}/>}
    {(sources.enhanced || remoteUrls?.enhanced)&&<audio key={renderNonce} ref={el=>{elements.current.enhanced=el}}
      src={playbackUrls.enhanced} preload="metadata"
      onTimeUpdate={realAudioSource==="enhanced"?onClock:undefined}/>}
    <div className="analysis-multi-playback studio-review-secondary-playback">
      <button className="analysis-primary" type="button" onClick={play}>{playing?(fr?"❚❚ PAUSE":"❚❚ PAUSE"):(fr?"▶ LIRE LES CAMÉRAS":"▶ PLAY CAMERAS")}</button>
      <button className="analysis-secondary" onClick={()=>{pauseAll();seekAll(0)}} type="button">{fr?"RETOUR DÉBUT":"REWIND"}</button>
    </div>
    <label className="analysis-multi-scrub">{fr?"POSITION DANS LE PROJET":"PROJECT POSITION"} · {timeCode(playhead)}
      <input aria-label={fr?"Position dans la timeline":"Timeline position"} type="range" min={0} max={duration} step={0.1} value={playhead}
        onChange={e=>{pauseAll();seekAll(Number(e.target.value))}} />
    </label>
    <div className="studio-review-decision">
      <strong>{fr?"LES TROIS IMAGES SONT-ELLES SYNCHRONISÉES ?":"ARE THE THREE VIDEOS IN SYNC?"}</strong>
      <p>{fr?"Les réglages se sauvegardent automatiquement dans cet épisode. Valider signifie que tu as vérifié visuellement les trois images; cela ne certifie pas encore la piste audio finale.":"Alignment settings autosave. Confirmation means you visually reviewed the pictures; final voice timing still needs checking."}</p>
      <div className="studio-review-decision-actions">
        <button type="button" className="analysis-primary" disabled={videos.length<1} onClick={()=>{
          setAlignmentReviewed(true);pauseAll();
        }}>{fr?"✓ OUI, JE VALIDE LES ANGLES":"✓ YES, CONFIRM ANGLES"}</button>
        <button type="button" className="analysis-secondary" onClick={()=>{
          setAlignmentReviewed(false);pauseAll();
          document.querySelector(".analysis-multi-visual-claps")?.scrollIntoView({behavior:"smooth",block:"center"});
        }}>{fr?"NON, AJUSTER LES CLAPS":"NO, ADJUST CLAPS"}</button>
      </div>
      {alignmentReviewed&&<div className="studio-review-next">
        <strong>✓ {fr?"ANGLES VALIDÉS — PRÊT POUR LES CAPSULES":"ANGLES CONFIRMED — READY FOR CAPSULES"}</strong>
        <button type="button" className="analysis-primary" onClick={()=>{
          pauseAll();
          onProceedToCapsules?.();
          document.getElementById("studio-capsule-workshop")?.scrollIntoView({behavior:"smooth",block:"start"});
        }}>{fr?"✦ PASSER À LA CRÉATION DES CAPSULES ↓":"✦ START CREATING CAPSULES ↓"}</button>
      </div>}
    </div>
    <div className="analysis-multi-edit">
      <strong>{fr?"07 · PREMIER CLIP DE MONTAGE":"07 · FIRST VIDEO CLIP EDIT"}</strong>
      <p>{fr?"Clique « Couper ici » sur une caméra pour la choisir à la position courante. Le plan est mémorisé dans cet onglet et téléchargeable en JSON, sans fabriquer de vidéo.":"Click Cut Here on a camera to select it at the current position. This edit plan is kept in this tab and can be exported as JSON, not yet a video."}</p>
      <div className="studio-auto-edit-panel">
        <strong>{fr?"MONTER LES 3 CAMÉRAS":"EDIT ALL 3 CAMERAS"}</strong>
        <p>{fr?
          "Crée une première proposition de changements d’angle avec les vidéos disponibles. La Canon reste majoritaire, et les autres angles ajoutent du rythme. Le résultat n’analyse pas encore automatiquement les expressions ou les gestes.":
          "Generate a first camera-switching edit from available sources. The main camera remains dominant while alternatives add pacing. This is not yet AI-driven gesture or emotion analysis."}</p>
        <button type="button" className="analysis-primary studio-auto-edit-cta" disabled={videos.length===0||rendering} onClick={proposeEdit}>
          {fr?"✦ PROPOSER UN MONTAGE AVEC LES 3 CAMÉRAS":"✦ SUGGEST A MULTICAMERA EDIT"}
        </button>
        {suggestedCuts&&<div className="studio-auto-edit-proposal">
          <strong>{fr?"PROPOSITION À VALIDER":"EDIT SUGGESTION — REVIEW FIRST"}</strong>
          <p>{suggestedCuts.length} {fr?"changements d’angle proposés pour cette capsule":"suggested camera decisions for this clip"}</p>
          <div className="studio-auto-edit-shotlist">
            {suggestedCuts.map(c=><span key={c.id}><b>{timeCode(c.at)}</b> {labels[c.camera]}</span>)}
          </div>
          <div className="studio-auto-edit-actions">
            <button type="button" className="analysis-primary" onClick={applySuggestedEdit}>
              {fr?"✓ APPLIQUER LES ANGLES AU MONTAGE":"✓ APPLY CAMERA CUTS"}
            </button>
            <button type="button" className="analysis-secondary" onClick={()=>setSuggestedCuts(null)}>
              {fr?"ANNULER":"CANCEL"}
            </button>
          </div>
        </div>}
        {cuts.length===0&&<p className="analysis-note">{fr?
          "Aucun changement d’angle pour l’instant : sans plan de montage, le MP4 restera sur un seul angle.":
          "No camera switches yet: without an edit plan, the MP4 stays on one camera."}</p>}
      </div>
      <div className="analysis-multi-cuts">
        {cuts.length? cuts.map(c=><div key={c.id}><strong>{timeCode(c.at)}</strong><span>{labels[c.camera]}</span>
          <button type="button" onClick={()=>setCuts(prev=>prev.filter(x=>x.id!==c.id))}>{fr?"RETIRER":"REMOVE"}</button>
        </div>):<p>{fr?"Aucune coupe choisie.":"No cuts selected yet."}</p>}
      </div>
      <div className="analysis-multi-clip-range">
        <strong>{fr?"DÉBUT ET FIN DU CLIP":"CLIP START AND END"}</strong>
        <label>{fr?"DÉBUT (S)":"START (SEC)"}
          <input type="number" min={0} max={duration} step={0.1} value={clipStart}
            onChange={e=>setClipStart(safeCutTime(Number(e.target.value),duration))}/>
        </label>
        <button type="button" className="analysis-secondary" onClick={()=>setClipStart(playhead)}>{fr?"DÉBUT = POSITION":"START = PLAYHEAD"}</button>
        <label>{fr?"FIN (S)":"END (SEC)"}
          <input type="number" min={0} max={duration} step={0.1} value={clipEnd}
            onChange={e=>setClipEnd(safeCutTime(Number(e.target.value),duration))}/>
        </label>
        <button type="button" className="analysis-secondary" onClick={()=>setClipEnd(playhead)}>{fr?"FIN = POSITION":"END = PLAYHEAD"}</button>
      </div>
      {capsule&&<p className="analysis-multi-highlight"><strong>{fr?"CAPSULE SÉLECTIONNÉE":"SELECTED CAPSULE"} : {capsule.title}</strong>
        <br/>{fr?"L’export utilise les timecodes, les textes, les bulles et le format propres à cette capsule.":"Export uses this capsule’s times, graphics, bubbles and format."}</p>}
      {capsule&&<div className="studio-decor-preview-panel">
        <strong>{fr?"DÉTOURAGE ET DÉCOR · PRÉVISUALISATION":"KEYING & BACKDROP · LIVE PREVIEW"}</strong>
        <p>{fr
          ?"Les réglages de l’atelier des capsules sont appliqués à cet aperçu réel et au MP4. Teste séparément chaque caméra avant le rendu final."
          :"Capsule settings are applied to this actual footage preview and to the MP4. Check each camera before final export."}</p>
        <div className="studio-decor-preview-actions">
          <label>{fr?"CAMÉRA À VÉRIFIER":"CAMERA TO PREVIEW"}
            <select value={videos.includes(decorCamera)?decorCamera:videos[0]} onChange={e=>setDecorCamera(e.target.value as CameraKey)}>
              {videos.map(k=><option key={k} value={k}>{labels[k]}</option>)}
            </select>
          </label>
          <button type="button" className="analysis-secondary" onClick={()=>setDecorPreview(v=>!v)}>
            {decorPreview?(fr?"FERMER L’APERÇU":"CLOSE PREVIEW"):(fr?"▶ PRÉVISUALISER LE DÉTOURAGE":"▶ PREVIEW BACKGROUND REMOVAL")}
          </button>
        </div>
        {decorPreview&&<canvas ref={decorCanvas} width={640} height={360} className="studio-decor-preview-canvas"
          aria-label={fr?"Aperçu du détourage sur la vidéo réelle":"Live camera chroma-key preview"}/>}
        {capsule.keying.enabled&&<p className="analysis-note">{fr
          ?"Ce détourage par couleur peut supprimer des objets turquoises, y compris des vêtements. Vérifie les cheveux et les mains sur les trois angles; le rendu expérimental s’effectue localement dans ton navigateur."
          :"Color keying may remove turquoise clothing as well. Check hair and hands on all camera angles; beta rendering happens in your browser."}</p>}
      </div>}
      <div className="analysis-multi-actions">
        <label className="analysis-multi-render-format">{fr?"FORMAT DU CLIP":"CLIP FORMAT"}
          <select value={format||"16:9"} onChange={e=>onFormatChange?.(e.target.value as "16:9"|"9:16"|"1:1")}>
            <option value="16:9">16:9 · YouTube</option><option value="9:16">9:16 · Reels / Shorts</option>
            <option value="1:1">1:1 · Square</option>
          </select>
        </label>
        <button type="button" disabled={rendering} className="analysis-primary" onClick={exportMp4}>
          {rendering?`EXPORT MP4… ${renderPercent}%`:(fr?(capsule?"EXPORTER CETTE CAPSULE MP4 · BÊTA":"EXPORTER MP4 · BÊTA"):(capsule?"EXPORT SELECTED CAPSULE · BETA":"EXPORT MP4 · BETA"))}
        </button>
        <button type="button" onClick={markCut} className="analysis-secondary">{fr?"MARQUER L’ANGLE ACTUEL":"MARK CURRENT ANGLE"}</button>
        <button type="button" onClick={exportEdl} className="analysis-secondary">{fr?"TÉLÉCHARGER LE PLAN DE MONTAGE (.JSON)":"DOWNLOAD EDIT PLAN (.JSON)"}</button>
      </div>
    </div>
    {error&&<p role="alert" className="analysis-error">{error}</p>}
    <p className="analysis-note">{fr
      ?"Limites : les MOV non compatibles ne seront pas lus, les grosses vidéos peuvent ralentir ton navigateur, et l’alignement automatique dépend de la présence de son exploitable sur chaque caméra. N’efface pas les originaux. L’export MP4 local est expérimental et prend le temps réel du clip. Un moteur serveur haute qualité, les sous-titres et une synchronisation professionnelle avec correction de dérive restent à développer."
      :"Limits: unsupported MOV files cannot play, large videos may slow down the browser, and automatic alignment requires usable audio on each camera. Keep originals. Local MP4 export is experimental and runs in real time. Server rendering, captions and professional drift-corrected synchronization remain to be built."}</p>
  </section>;
}
