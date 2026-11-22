"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderLocalMp4 } from "./local-mp4";
import { alignCameraAudio, type CameraSyncResult } from "@/lib/analysis/browser-audio-fingerprint";
import {
  activeCamera, cameraKeys, edl, labels, offsetFromClap,
  safeCutTime, sourceTime, timeCode,
  type CameraKey, type Cut, type SourceFiles, type SourceKey
} from "@/lib/analysis/multicam";

const initialOffsets: Record<SourceKey, number> = { audio:0, main:0, vertical:0, secondary:0 };
const initialClaps: Record<SourceKey, number> = { audio:0, main:0, vertical:0, secondary:0 };

type Timeline={ duration:number; clipStart:number; clipEnd:number; audioSource:SourceKey; offsets:Record<SourceKey,number>; claps:Record<SourceKey,number>; cuts:Cut[] };
type MediaInfo={filename:string;bytes:number;pathname:string;contentType:string};
export function MultiCamEditor({ sources, remoteUrls, mediaMetadata, name, lang, highlight, savedTimeline, onTimelineChange, format, onFormatChange }: {
  sources: SourceFiles; remoteUrls?:Partial<Record<SourceKey,string>>;
  mediaMetadata?:Partial<Record<SourceKey,MediaInfo>>;
  name: string; lang: "fr"|"en"; highlight?: string;
  savedTimeline?:Timeline; onTimelineChange?:(value:Timeline)=>void;
  format?:"16:9"|"9:16"|"1:1"; onFormatChange?:(format:"16:9"|"9:16"|"1:1")=>void;
}) {
  const fr = lang === "fr";
  const videos = cameraKeys.filter(key=>!!sources[key] || !!remoteUrls?.[key]);
  const availableAudio: SourceKey[] = (sources.audio || remoteUrls?.audio) ? ["audio",...videos] : videos;
  const [audioSource, setAudioSource] = useState<SourceKey>(savedTimeline?.audioSource || "audio");
  const [selectedCamera, setSelectedCamera] = useState<CameraKey>("main");
  const [offsets,setOffsets] = useState(savedTimeline?.offsets || initialOffsets);
  const [claps,setClaps] = useState(savedTimeline?.claps || initialClaps);
  const [duration,setDuration] = useState(savedTimeline?.duration || 300);
  const [clipStart,setClipStart]=useState(savedTimeline?.clipStart ?? 0);
  const [clipEnd,setClipEnd]=useState(savedTimeline?.clipEnd ?? 60);
  const [playhead,setPlayhead] = useState(0);
  const [playing,setPlaying] = useState(false);
  const [cuts,setCuts] = useState<Cut[]>(savedTimeline?.cuts || []);
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
  const timeline={duration,clipStart,clipEnd,audioSource,offsets,claps,cuts};
  const lastPersisted=useRef(JSON.stringify(savedTimeline||timeline));
  useEffect(()=>{
    if(!onTimelineChange)return;
    const next=JSON.stringify(timeline);
    if(next===lastPersisted.current)return;
    lastPersisted.current=next;
    onTimelineChange(timeline);
  },[duration,clipStart,clipEnd,audioSource,offsets,claps,cuts,onTimelineChange]);

  const realAudioSource = availableAudio.includes(audioSource) ? audioSource : availableAudio[0];
  const realCamera = videos.includes(selectedCamera) ? selectedCamera : videos[0];
  const selected = activeCamera(cuts,playhead,realCamera);
  const effectiveCamera = videos.includes(selected) ? selected : realCamera;

  const seekAll=useCallback((time:number, offsetsValue=offsets)=>{
    const t=safeCutTime(time,duration);
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

  const synchronize=useCallback((newOffsets:Record<SourceKey,number>)=>{
    pauseAll();
    setOffsets(newOffsets);
    seekAll(playhead,newOffsets);
  },[pauseAll,seekAll,playhead]);

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
        el.muted = key!==realAudioSource;
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
  function markCut(){
    if(!realCamera)return;
    const cut:Cut={id:crypto.randomUUID(),at:safeCutTime(playhead,duration),camera:realCamera};
    setCuts(prev=>[...prev.filter(c=>Math.abs(c.at-cut.at)>.15),cut].sort((a,b)=>a.at-b.at));
    setSelectedCamera(realCamera);
  }
  async function exportMp4(){
    if(rendering||!realCamera||!realAudioSource)return;
    if(clipEnd<=clipStart || clipEnd>duration){setError(fr?"Choisis un début et une fin de clip valides.":"Choose a valid clip start and end.");return}
    if(clipEnd-clipStart>600){setError(fr?"Le clip est limité à 10 minutes pour ce premier test.":"Clip is limited to 10 minutes.");return}
    if(!sources[realAudioSource] || videos.some(key=>!sources[key])){
      setError(fr?"Pour exporter, resélectionne les fichiers originaux de toutes les caméras et de la piste audio utilisée.":"For export, reselect original files for every camera and reference audio.");
      return;
    }
    setError("");setSuccess("");pauseAll();seekAll(clipStart);setRendering(true);setRenderPercent(0);
    try{
      const blob=await renderLocalMp4({
        nodes:elements.current,offsets,audioSource:realAudioSource,
        cuts,fallback:realCamera,duration,start:clipStart,end:clipEnd,format:format||"16:9",
        onProgress:setRenderPercent,
      });
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download=`dom-soucy-${name.replace(/[^a-z0-9-]/gi,"-").slice(0,45)}.mp4`;a.click();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      setSuccess(fr?"Export MP4 produit dans le navigateur et proposé au téléchargement. Vérifie le son et l’image avant publication.":"MP4 rendered in your browser and offered for download. Review the result.");
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

    <div className="analysis-multi-player-header">
      <strong>{fr?"06 · PRÉVISUALISER LES ANGLES":"06 · ANGLE PREVIEW"}</strong>
      <span>{timeCode(playhead)} / {timeCode(duration)}</span>
    </div>
    <div className="analysis-multi-grid">
      {videos.map(key=><div key={key} className={`analysis-multi-camera ${effectiveCamera===key?"is-active":""}`}>
        <video key={renderNonce} ref={el=>{elements.current[key]=el}} src={playbackUrls[key]} playsInline preload="metadata" muted
          onTimeUpdate={realAudioSource===key?onClock:undefined}
          onError={()=>setError(fr?`Impossible de lire ${labels[key]}. Essaie de convertir ce fichier en MP4 H.264.`:`Cannot play ${labels[key]}. Try converting it to H.264 MP4.`)}
          aria-label={labels[key]}/>
        <div className="analysis-multi-camera-label"><span>{labels[key]}</span>
          <button type="button" onClick={()=>{setSelectedCamera(key);setCuts(prev=>[
            ...prev.filter(c=>Math.abs(c.at-playhead)>.15),
            {id:crypto.randomUUID(),at:safeCutTime(playhead,duration),camera:key}
          ].sort((a,b)=>a.at-b.at))}}>{fr?"COUPER ICI":"CUT HERE"}</button>
        </div>
      </div>)}
    </div>
    {(sources.audio || remoteUrls?.audio) && <audio key={renderNonce} ref={el=>{elements.current.audio=el}} src={playbackUrls.audio} preload="metadata"
      onTimeUpdate={realAudioSource==="audio"?onClock:undefined}/>}
    <div className="analysis-multi-playback">
      <button className="analysis-primary" type="button" onClick={play}>{playing?(fr?"❚❚ PAUSE":"❚❚ PAUSE"):(fr?"▶ LIRE LES CAMÉRAS":"▶ PLAY CAMERAS")}</button>
      <button className="analysis-secondary" onClick={()=>{pauseAll();seekAll(0)}} type="button">{fr?"RETOUR DÉBUT":"REWIND"}</button>
    </div>
    <label className="analysis-multi-scrub">{fr?"POSITION DANS LE PROJET":"PROJECT POSITION"} · {timeCode(playhead)}
      <input aria-label={fr?"Position dans la timeline":"Timeline position"} type="range" min={0} max={duration} step={0.1} value={playhead}
        onChange={e=>{pauseAll();seekAll(Number(e.target.value))}} />
    </label>
    <div className="analysis-multi-edit">
      <strong>{fr?"07 · PREMIER CLIP DE MONTAGE":"07 · FIRST VIDEO CLIP EDIT"}</strong>
      <p>{fr?"Clique « Couper ici » sur une caméra pour la choisir à la position courante. Le plan est mémorisé dans cet onglet et téléchargeable en JSON, sans fabriquer de vidéo.":"Click Cut Here on a camera to select it at the current position. This edit plan is kept in this tab and can be exported as JSON, not yet a video."}</p>
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
      <div className="analysis-multi-actions">
        <label className="analysis-multi-render-format">{fr?"FORMAT DU CLIP":"CLIP FORMAT"}
          <select value={format||"16:9"} onChange={e=>onFormatChange?.(e.target.value as "16:9"|"9:16"|"1:1")}>
            <option value="16:9">16:9 · YouTube</option><option value="9:16">9:16 · Reels / Shorts</option>
            <option value="1:1">1:1 · Square</option>
          </select>
        </label>
        <button type="button" disabled={rendering} className="analysis-primary" onClick={exportMp4}>
          {rendering?`EXPORT MP4… ${renderPercent}%`:(fr?"EXPORTER MP4 · BÊTA":"EXPORT MP4 · BETA")}
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
