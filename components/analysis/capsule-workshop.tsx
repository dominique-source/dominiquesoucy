"use client";
import { useState } from "react";
import { buildHdRenderManifest,hdManifestFilename } from "@/lib/analysis/hd-render-manifest";
import { createDraftsFromAnalysis } from "@/lib/analysis/capsule-drafts";
import { episodeCode, type StudioProject } from "@/lib/analysis/project";
import { defaultChroma } from "@/lib/analysis/chroma-key";
import { resolveBackdrop } from "@/lib/analysis/studio-backdrops";
import { cameraKeys, proposeMulticamCuts } from "@/lib/analysis/multicam";
import { findQuotedRange, toProjectRange } from "@/lib/analysis/timed-excerpts";
type Capsule=StudioProject["capsules"][number];
type EventKind=StudioProject["events"][number]["type"];
type EventStatus=StudioProject["events"][number]["status"];

const variants:Record<Capsule["style"],string>={
 classic:"PORTRAIT / CLASSIQUE",quote:"CITATION PERCUTANTE",
 conversation:"QUESTION JOURNALISTIQUE",rafale:"RAFALE DE QUESTIONS",editorial:"ANALYSE / ÉDITORIAL",
};
const backdrops:Record<Capsule["background"],string>={
 original:"VIDÉO PLEIN ÉCRAN",dark:"STUDIO NOIR",lime:"FOND LIME",
 gradient:"DÉGRADÉ NOIR / LIME",signature:"MUR SIGNATURE DOM SOUCY",
};
export function CapsuleWorkshop({lang,project,onChange,onEvent}:{
 lang:"fr"|"en";project:StudioProject;
 onChange:(patch:Partial<StudioProject>)=>void;
 onEvent:(type:EventKind,message:string,status?:EventStatus)=>void;
}){
 const fr=lang==="fr";
 const [transparentForeground,setTransparentForeground]=useState(false);
 const [reporterPortrait,setReporterPortrait]=useState(false);
 const [manifestNotice,setManifestNotice]=useState("");
 const capsules=project.capsules;
 const chosen=capsules.find(c=>c.id===project.selectedCapsuleId)||capsules[0];
 function select(id:string){onChange({selectedCapsuleId:id})}
 function change(capsuleId:string,patch:Partial<Capsule>){
  onChange({capsules:capsules.map(c=>c.id===capsuleId?{...c,...patch,status:"draft",timingSource:
    ("start" in patch||"end" in patch)?"manual":c.timingSource,
    cameraCuts:("start" in patch||"end" in patch)&&c.cameraEditSource==="automatic"?undefined:c.cameraCuts}:c)});
 }
 function addDraft(){
  if(capsules.length>=40)return;
  const id=crypto.randomUUID();
  const draft:Capsule={
   id,title:`Capsule ${String(capsules.length+1).padStart(2,"0")}`,
   start:project.timeline.clipStart,end:project.timeline.clipEnd,
   format:project.format,style:"classic",caption:"",bubble:"",
   background:"original",keying:{...defaultChroma},textPosition:"bottom",status:"draft",
  };
  onChange({capsules:[...capsules,draft],selectedCapsuleId:id,stage:"editing"});
 }
 function generateDrafts(){
  const newDrafts=createDraftsFromAnalysis(project);
  if(!newDrafts.length){
    setManifestNotice(fr?"Toutes les propositions de l'analyse sont déjà créées ou la limite de 40 capsules est atteinte.":"All analysis drafts already exist or the 40-capsule limit was reached.");
    return;
  }
  onChange({capsules:[...project.capsules,...newDrafts],
    selectedCapsuleId:newDrafts[0].id,stage:"editing"});
  onEvent("analysis",`${newDrafts.filter(c=>c.timingSource==="automatic").length}/${newDrafts.length} capsules horodatées et préparées`,"success");
  setManifestNotice(fr?`${newDrafts.length} capsules ajoutées. Choisis une capsule dans la liste ci-dessous.`:
    `${newDrafts.length} capsule drafts added. Choose one below.`);
 }
 function exportHdManifest(capsule:Capsule){
  try{
   const manifest=buildHdRenderManifest(project,capsule,{transparentForeground,reporterPortrait});
   const url=URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)],{type:"application/json"}));
   const link=document.createElement("a");
   link.href=url;link.download=hdManifestFilename(capsule);document.body.appendChild(link);link.click();link.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),1500);
   setManifestNotice(fr?"Manifeste HD prêt. Copie master.mp4 et le JSON dans le moteur de rendu local : instructions ci-dessous.":"HD manifest ready. Copy master.mp4 and this JSON to the local renderer (instructions below).");
  }catch(e){
   setManifestNotice(fr?"Vérifie les secondes Début / Fin (maximum 10 minutes pour ce pilote).":"Check Start / End seconds (10-minute max for this pilot).");
  }
 }
 function remove(id:string){
  onChange({capsules:capsules.filter(c=>c.id!==id),
   selectedCapsuleId:chosen?.id===id?(capsules.find(c=>c.id!==id)?.id||""):project.selectedCapsuleId});
 }
 const validRange=chosen&&chosen.end>chosen.start&&chosen.end<=project.timeline.duration;
 return <section id="studio-capsule-workshop" className="analysis-panel studio-step studio-workshop">
  <div className="analysis-panel-head"><h2>07B / {fr?"ATELIER DES CAPSULES":"CAPSULE WORKSHOP"}</h2>
   <span>{capsules.length} / 40 {fr?"PROJETS DE CAPSULES":"CAPSULE DRAFTS"}</span></div>
  <p>{fr?"Un seul épisode peut produire une série de capsules. Prépare les textes, les bulles, les couleurs et les versions. Chaque capsule garde ses propres réglages.":"One episode can produce multiple capsule versions. Each saves its own text, bubbles and graphics."}</p>
  <div className="studio-workshop-wall-summary">
    <strong>{fr?"DÉCOR DE L’ÉMISSION":"EPISODE BACKDROP"} : {resolveBackdrop(project.studioBackdrop,project.id,[project.name,project.transcript].join(" ")).label}</strong>
    <button type="button" className="analysis-secondary" onClick={()=>
      document.getElementById("studio-episode-backdrops")?.scrollIntoView({behavior:"smooth",block:"start"})}>
      {fr?"CHANGER LE MUR SIGNATURE ↑":"CHANGE SIGNATURE WALL ↑"}
    </button>
  </div>
  <div className="studio-workshop-actions">
   <button type="button" className="analysis-secondary" onClick={addDraft}>
     {fr?"+ NOUVELLE CAPSULE":"+ NEW CAPSULE"}</button>
   <button type="button" className="analysis-primary" disabled={!project.analysis?.moments.length||capsules.length>=40} onClick={generateDrafts}>
     {fr?"✦ CRÉER LES PROPOSITIONS À PARTIR DE L’ANALYSE":"✦ GENERATE DRAFTS FROM ANALYSIS"}
   </button>
  </div>
  <p className="analysis-note">{fr
   ?"Les extraits retrouvés dans la transcription horodatée reçoivent un début et une fin automatiquement. Une citation ambiguë ou introuvable reste à vérifier : aucun timecode n’est inventé."
   :"Excerpts found in the timed transcript receive automatic start and end points. Ambiguous or missing quotes require review; no timestamps are invented."}</p>
  {!!capsules.length&&<div className="studio-workshop-layout">
   <div className="studio-capsule-list">{capsules.map((c,i)=><button
    type="button" key={c.id} onClick={()=>select(c.id)}
    className={`studio-capsule-row ${chosen?.id===c.id?"is-current":""}`}>
      <small>{String(i+1).padStart(2,"0")} · {c.status.toUpperCase()}</small>
      <strong>{c.title}</strong>
      <span>{c.start.toFixed(1)}–{c.end.toFixed(1)} s · {c.format} · {c.timingSource==="automatic"?(fr?"AUTO":"AUTO"):c.timingSource==="unmatched"?(fr?"À VÉRIFIER":"REVIEW"):(fr?"MANUEL":"MANUAL")}</span>
    </button>)}</div>
   {chosen&&<div className="studio-capsule-editor">
    <div className="studio-capsule-identity">
      <strong>{episodeCode(project.season,project.episode)}</strong>
      <span>{fr?"CAPSULE":"CAPSULE"} {String(capsules.indexOf(chosen)+1).padStart(2,"0")}</span>
    </div>
    <label>{fr?"NOM DE LA CAPSULE":"CAPSULE NAME"}<input value={chosen.title} maxLength={100}
      onChange={e=>change(chosen.id,{title:e.target.value})}/></label>
    <div className="studio-capsule-2col">
     <label>{fr?"DÉBUT (SECONDES)":"START (SECONDS)"}
       <input type="number" min={0} max={7200} step={0.1} value={chosen.start}
         onChange={e=>change(chosen.id,{start:Math.max(0,Math.min(7200,Number(e.target.value)||0))})}/></label>
     <label>{fr?"FIN (SECONDES)":"END (SECONDS)"}
       <input type="number" min={0} max={7200} step={0.1} value={chosen.end}
         onChange={e=>change(chosen.id,{end:Math.max(0,Math.min(7200,Number(e.target.value)||0))})}/></label>
    </div>
    {chosen.cameraCuts?.length?<p className="analysis-note">{fr?`Montage préparé : ${chosen.cameraCuts.length} décisions de caméra · ${chosen.cameraEditSource==="automatic"?"proposition automatique":"ajustements manuels"}.`:`Edit prepared: ${chosen.cameraCuts.length} camera decisions.`}</p>:null}
    {chosen.timingSource==="automatic"&&<p className="analysis-note">{fr?"Découpage proposé à partir de l’audio original horodaté. Vérifie la synchronisation de la caméra avant l’export.":"Cut based on timestamps in the original audio. Confirm the camera is synchronized before exporting."}</p>}
    {!validRange&&<p className="studio-capsule-warning">{fr?"Choisis un début et une fin valides avant l’export.":"Set valid start and end times before exporting."}</p>}
    <div className="studio-capsule-2col">
     <label>{fr?"STYLE":"STYLE"}<select value={chosen.style} onChange={e=>change(chosen.id,{style:e.target.value as Capsule["style"]})}>
       {(Object.keys(variants) as Capsule["style"][]).map(v=><option key={v} value={v}>{variants[v]}</option>)}</select></label>
     <label>{fr?"ARRIÈRE-PLAN":"BACKGROUND"}<select value={chosen.background} onChange={e=>change(chosen.id,{background:e.target.value as Capsule["background"]})}>
       {(Object.keys(backdrops) as Capsule["background"][]).map(v=><option key={v} value={v}>{backdrops[v]}</option>)}</select></label>
     <label>{fr?"FORMAT":"FORMAT"}<select value={chosen.format} onChange={e=>change(chosen.id,{format:e.target.value as Capsule["format"]})}>
       {(["9:16","16:9","1:1"] as const).map(v=><option key={v} value={v}>{v}</option>)}</select></label>
     <label>{fr?"POSITION DES TEXTES":"TEXT POSITION"}<select value={chosen.textPosition} onChange={e=>change(chosen.id,{textPosition:e.target.value as Capsule["textPosition"]})}>
       <option value="bottom">{fr?"EN BAS":"BOTTOM"}</option><option value="center">{fr?"AU CENTRE":"CENTER"}</option><option value="top">{fr?"EN HAUT":"TOP"}</option></select></label>
    </div>
    <div className="studio-keying-controls">
      <div className="studio-keying-heading">
        <strong>{fr?"08 · DÉTOURAGE ET DÉCOR":"08 · BACKGROUND REMOVAL & SET"}</strong>
        <span>{fr?"CHROMA KEY · BÊTA":"CHROMA KEY · BETA"}</span>
      </div>
      <p>{fr
        ?"Supprime la couleur turquoise du mur, conserve le sujet à l’avant-plan et affiche le mur signature DOM SOUCY MEDIA derrière toi. Ce traitement s’applique à chaque caméra pendant l’export."
        :"Remove the turquoise wall while keeping the presenter and show the DOM SOUCY MEDIA branded wall behind every camera shot during export."}</p>
      <label className="studio-keying-toggle">
        <input type="checkbox" checked={chosen.keying.enabled} onChange={e=>{
          change(chosen.id,{keying:{...chosen.keying,enabled:e.target.checked},
            background:e.target.checked?"signature":chosen.background});
        }}/>
        {fr?"DÉTOURER LE MUR TURQUOISE":"REMOVE TURQUOISE BACKGROUND"}
      </label>
      {chosen.keying.enabled&&<>
        <div className="studio-keying-control-grid">
          <label>{fr?"COULEUR À SUPPRIMER":"KEY COLOR"}
            <input type="color" value={chosen.keying.color} onChange={e=>change(chosen.id,{keying:{...chosen.keying,color:e.target.value}})}/>
          </label>
          <label>{fr?"TOLÉRANCE DE COULEUR":"COLOR TOLERANCE"}
            <input type="range" min={0.03} max={0.45} step={0.01} value={chosen.keying.tolerance}
              onChange={e=>change(chosen.id,{keying:{...chosen.keying,tolerance:Number(e.target.value)}})}/>
            <span>{Math.round(chosen.keying.tolerance*100)}%</span>
          </label>
          <label>{fr?"DOUCEUR DES CONTOURS":"EDGE SOFTNESS"}
            <input type="range" min={0.01} max={0.35} step={0.01} value={chosen.keying.softness}
              onChange={e=>change(chosen.id,{keying:{...chosen.keying,softness:Number(e.target.value)}})}/>
            <span>{Math.round(chosen.keying.softness*100)}%</span>
          </label>
          <label>{fr?"REFLETS TURQUOISE":"COLOR SPILL"}
            <input type="range" min={0} max={1} step={0.05} value={chosen.keying.spill}
              onChange={e=>change(chosen.id,{keying:{...chosen.keying,spill:Number(e.target.value)}})}/>
            <span>{Math.round(chosen.keying.spill*100)}%</span>
          </label>
        </div>
        <button type="button" className="analysis-secondary" onClick={()=>change(chosen.id,{
          keying:{...defaultChroma,enabled:true},background:"signature",
        })}>{fr?"RÉINITIALISER LE DÉTOURAGE":"RESET CHROMA SETTINGS"}</button>
      </>}
      <p className="analysis-note">{fr
        ?"Prévisualise le résultat avec une vraie image vidéo dans la section export plus bas. Si la peau, les vêtements ou les cheveux disparaissent, diminue la tolérance; ce procédé par couleur n’est pas une segmentation IA. Sur une lumière inégale, le rendu peut nécessiter un traitement professionnel."
        :"Preview your actual camera frame in the export panel below. Lower tolerance if clothing or skin disappears. Color keying is not AI person segmentation and uneven lighting may require professional processing."}</p>
    </div>
    {(chosen.style==="conversation"||chosen.style==="rafale")&&<div className="studio-keying-controls">
      <div className="studio-keying-heading"><strong>{fr?"QUESTION(S) JOURNALISTIQUE(S)":"JOURNALIST QUESTION(S)"}</strong></div>
      <label>{fr?"NOM RÉEL DU JOURNALISTE (OPTIONNEL)":"REAL JOURNALIST NAME (OPTIONAL)"}
        <input value={chosen.journalistName||""} maxLength={100} placeholder={fr?"Ne pas inventer de nom":"Do not invent a name"}
          onChange={e=>change(chosen.id,{journalistName:e.target.value})}/></label>
      <label>{fr?"MÉDIA / ORGANISATION (OPTIONNEL)":"MEDIA OUTLET (OPTIONAL)"}
        <input value={chosen.journalistOutlet||""} maxLength={100}
          onChange={e=>change(chosen.id,{journalistOutlet:e.target.value})}/></label>
      <label>{fr?"ORIGINE DE LA QUESTION":"QUESTION SOURCE"}
        <select value={chosen.questionAttribution||"reconstructed"}
          onChange={e=>change(chosen.id,{questionAttribution:e.target.value as "verified"|"reconstructed"})}>
          <option value="reconstructed">{fr?"Question proposée par l’IA (non originale)":"AI-proposed question (not original)"}</option>
          <option value="verified">{fr?"Question originale vérifiée":"Verified original question"}</option>
        </select>
      </label>
      <p className="analysis-note">{fr?"Une question proposée par l’IA sera identifiée comme reconstitution dans le rendu, pas comme question réellement prononcée. Pour la rafale, écris une question par ligne dans le champ Bulle.":"AI-proposed questions are labeled as reconstructions, not actual spoken words. For question bursts, enter one question per line in the bubble field."}</p>
    </div>}
    <label>{fr?"TEXTE ANIMÉ / CITATION":"ANIMATED TEXT / QUOTE"}<textarea rows={3} maxLength={500}
      value={chosen.caption} onChange={e=>change(chosen.id,{caption:e.target.value})}/></label>
    <label>{fr?"BULLE DE CONVERSATION":"CONVERSATION BUBBLE"}<textarea rows={2} maxLength={500}
      value={chosen.bubble} onChange={e=>change(chosen.id,{bubble:e.target.value})}/></label>
    <div className={`studio-capsule-mock studio-capsule-bg-${chosen.background}`}>
     <span className="studio-capsule-mock-top">DOM SOUCY MEDIA · {chosen.format}</span>
     {chosen.style==="conversation"&&chosen.bubble&&<div className="studio-capsule-bubble">{chosen.bubble.slice(0,160)}</div>}
     <blockquote>{chosen.caption.slice(0,200)||chosen.title}</blockquote>
     <span>● {fr?"APERÇU GRAPHIQUE — SANS VIDÉO":"GRAPHIC PREVIEW — NO VIDEO"}</span>
    </div>
    <p className="analysis-note">{fr
      ?"Les textes bougent visuellement pendant l’export, mais ne sont pas encore synchronisés mot à mot avec les paroles. Le détourage par couleur est disponible en bêta pour un mur turquoise uniforme; une segmentation IA restera nécessaire pour les décors difficiles."
      :"Text animates visually during export but is not word-synced. Turquoise color keying is available in beta for a uniform wall; challenging scenes still require AI segmentation."}</p>
    <div className="studio-auto-edit-panel">
      <strong>{fr?"EXPORTER CETTE CAPSULE EN HD — MOTEUR LOCAL":"EXPORT THIS CAPSULE IN HD — LOCAL RENDERER"}</strong>
      <p className="analysis-note">{fr?
        "Cette sortie remplace le MP4 navigateur saccadé : le Studio crée un petit plan JSON, puis le moteur Remotion installé sur ton Mac traite ton master synchronisé en 1080p. Aucune vidéo n’est envoyée sur Vercel.":
        "This replaces the choppy browser MP4: Studio downloads a JSON production plan; Remotion on your Mac renders the synced master at 1080p. No video is uploaded to Vercel."}</p>
      <label className="studio-keying-toggle">
        <input type="checkbox" checked={transparentForeground}
          onChange={e=>setTransparentForeground(e.target.checked)}/>
        {fr?"J’ai une vidéo détourée foreground.mov + audio.wav et un fond background.png":
          "I have a keyed foreground.mov + audio.wav and background.png"}
      </label>
      <label className="studio-keying-toggle">
        <input type="checkbox" checked={reporterPortrait}
          onChange={e=>setReporterPortrait(e.target.checked)}/>
        {fr?"J’ai la vraie photo reporter.png du journaliste, autorisée pour diffusion":
          "I have an approved real reporter.png portrait"}
      </label>
      {!validRange&&<p role="alert" className="analysis-error">
        {fr?"Corrige d’abord Début et Fin : la capsule ne doit pas être vide.":
          "Fix Start and End first; the capsule cannot be empty."}
      </p>}
      <button type="button" className="analysis-primary" disabled={!validRange||chosen.end-chosen.start>600}
        onClick={()=>exportHdManifest(chosen)}>
        {fr?"↓ EXPORTER LE MANIFESTE HD (.JSON)":"↓ EXPORT HD RENDER MANIFEST (.JSON)"}
      </button>
      <p className="analysis-note">{fr?
        "Étape suivante sur Mac : installe le moteur depuis GitHub → render-engine, copie master.mp4 dans public/, puis lance npm run render -- «/chemin/capsule.json». Instructions détaillées : render-engine/README.md.":
        "Next on Mac: install the engine from GitHub → render-engine, copy master.mp4 to public/, run npm run render -- \"/path/capsule.json\". Read render-engine/README.md."}</p>
      <a href="https://github.com/dominique-source/dominiquesoucy/tree/main/render-engine"
        target="_blank" rel="noopener noreferrer" className="analysis-secondary">
        {fr?"OUVRIR LES INSTRUCTIONS DU MOTEUR HD ↗":"OPEN HD RENDERER INSTRUCTIONS ↗"}
      </a>
      {manifestNotice&&<p role="status" className="analysis-note">{manifestNotice}</p>}
    </div>
    <button type="button" className="analysis-secondary" onClick={()=>remove(chosen.id)}>
      {fr?"RETIRER CETTE CAPSULE":"REMOVE CAPSULE"}</button>
   </div>}
  </div>}
 </section>;
}
