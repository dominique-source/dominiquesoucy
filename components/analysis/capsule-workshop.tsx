"use client";
import { episodeCode, type StudioProject } from "@/lib/analysis/project";
type Capsule=StudioProject["capsules"][number];
type EventKind=StudioProject["events"][number]["type"];
type EventStatus=StudioProject["events"][number]["status"];

const variants:Record<Capsule["style"],string>={
 classic:"PORTRAIT / CLASSIQUE",quote:"CITATION PERCUTANTE",
 conversation:"BULLES DE CONVERSATION",editorial:"ANALYSE / ÉDITORIAL",
};
const backdrops:Record<Capsule["background"],string>={
 original:"VIDÉO PLEIN ÉCRAN",dark:"STUDIO NOIR",lime:"FOND LIME",
 gradient:"DÉGRADÉ NOIR / LIME",
};
export function CapsuleWorkshop({lang,project,onChange,onEvent}:{
 lang:"fr"|"en";project:StudioProject;
 onChange:(patch:Partial<StudioProject>)=>void;
 onEvent:(type:EventKind,message:string,status?:EventStatus)=>void;
}){
 const fr=lang==="fr";
 const capsules=project.capsules;
 const chosen=capsules.find(c=>c.id===project.selectedCapsuleId)||capsules[0];
 function select(id:string){onChange({selectedCapsuleId:id})}
 function change(capsuleId:string,patch:Partial<Capsule>){
  onChange({capsules:capsules.map(c=>c.id===capsuleId?{...c,...patch,status:"draft"}:c)});
 }
 function addDraft(){
  if(capsules.length>=40)return;
  const id=crypto.randomUUID();
  const draft:Capsule={
   id,title:`Capsule ${String(capsules.length+1).padStart(2,"0")}`,
   start:project.timeline.clipStart,end:project.timeline.clipEnd,
   format:project.format,style:"classic",caption:"",bubble:"",
   background:"original",textPosition:"bottom",status:"draft",
  };
  onChange({capsules:[...capsules,draft],selectedCapsuleId:id,stage:"editing"});
 }
 function generateDrafts(){
  const moments=project.analysis?.moments||[];
  const openSlots=40-capsules.length;
  if(!moments.length||openSlots<=0)return;
  const newDrafts:Capsule[]=moments.slice(0,openSlots).map((m,i)=>({
   id:crypto.randomUUID(),
   title:m.title.slice(0,100),
   start:0,end:0,
   format:project.format,
   style:m.model_id===11?"editorial":m.model_id===4?"quote":"conversation",
   caption:m.excerpt.slice(0,500),
   bubble:m.model_id===1?"QUESTION DU JOURNALISTE":m.title.slice(0,80),
   background:"dark",textPosition:"bottom",status:"draft",
  }));
  onChange({capsules:[...capsules,...newDrafts],
    selectedCapsuleId:newDrafts[0].id,stage:"editing"});
  onEvent("analysis",`${newDrafts.length} propositions de capsules créées (timecodes à confirmer)`,"success");
 }
 function remove(id:string){
  onChange({capsules:capsules.filter(c=>c.id!==id),
   selectedCapsuleId:chosen?.id===id?(capsules.find(c=>c.id!==id)?.id||""):project.selectedCapsuleId});
 }
 const validRange=chosen&&chosen.end>chosen.start&&chosen.end<=project.timeline.duration;
 return <section className="analysis-panel studio-step studio-workshop">
  <div className="analysis-panel-head"><h2>07B / {fr?"ATELIER DES CAPSULES":"CAPSULE WORKSHOP"}</h2>
   <span>{capsules.length} / 40 {fr?"PROJETS DE CAPSULES":"CAPSULE DRAFTS"}</span></div>
  <p>{fr?"Un seul épisode peut produire une série de capsules. Prépare les textes, les bulles, les couleurs et les versions. Chaque capsule garde ses propres réglages.":"One episode can produce multiple capsule versions. Each saves its own text, bubbles and graphics."}</p>
  <div className="studio-workshop-actions">
   <button type="button" className="analysis-secondary" onClick={addDraft}>
     {fr?"+ NOUVELLE CAPSULE":"+ NEW CAPSULE"}</button>
   <button type="button" className="analysis-primary" disabled={!project.analysis?.moments.length||capsules.length>=40} onClick={generateDrafts}>
     {fr?"✦ CRÉER LES PROPOSITIONS À PARTIR DE L’ANALYSE":"✦ GENERATE DRAFTS FROM ANALYSIS"}
   </button>
  </div>
  <p className="analysis-note">{fr
   ?"L’IA a identifié les citations, mais pas encore leur position exacte dans la vidéo. Les propositions générées ont volontairement des timecodes vides (0–0) : indique leur début et leur fin avant l’export."
   :"AI found the quotes but not their exact video timestamps. Generated drafts deliberately have no timecodes (0–0); set their range before exporting."}</p>
  {!!capsules.length&&<div className="studio-workshop-layout">
   <div className="studio-capsule-list">{capsules.map((c,i)=><button
    type="button" key={c.id} onClick={()=>select(c.id)}
    className={`studio-capsule-row ${chosen?.id===c.id?"is-current":""}`}>
      <small>{String(i+1).padStart(2,"0")} · {c.status.toUpperCase()}</small>
      <strong>{c.title}</strong>
      <span>{c.start.toFixed(1)}–{c.end.toFixed(1)} s · {c.format}</span>
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
      ?"Les textes bougent visuellement pendant l’export, mais ne sont pas encore synchronisés mot à mot avec les paroles. Le détourage de personne et le remplacement du décor filmé nécessitent encore un moteur de segmentation."
      :"Text animates visually during export but is not word-synced. Human segmentation and replacing the filmed background still require a segmentation engine."}</p>
    <button type="button" className="analysis-secondary" onClick={()=>remove(chosen.id)}>
      {fr?"RETIRER CETTE CAPSULE":"REMOVE CAPSULE"}</button>
   </div>}
  </div>}
 </section>;
}
