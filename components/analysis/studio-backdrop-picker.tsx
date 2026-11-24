"use client";
import type { StudioProject } from "@/lib/analysis/project";
import { backdropLabel,resolveBackdrop,studioBackgrounds,type BackdropId,type BackdropMode } from "@/lib/analysis/studio-backdrops";
import { defaultChroma } from "@/lib/analysis/chroma-key";
type Props={lang:"fr"|"en";project:StudioProject;onChange:(patch:Partial<StudioProject>)=>void};
export function StudioBackdropPicker({lang,project,onChange}:Props){
 const fr=lang==="fr";
 const mode=project.studioBackdrop.mode;
 const selected=resolveBackdrop(project.studioBackdrop,project.id,
   [project.name,project.transcript,project.capsules.find(c=>c.id===project.selectedCapsuleId)?.title].join(" "));
 function update(mode:BackdropMode,id:BackdropId=project.studioBackdrop.selectedId){
   onChange({studioBackdrop:{mode,selectedId:id}});
 }
 function applyToAll(){
   onChange({capsules:project.capsules.map(c=>({
     ...c,background:"signature",keying:{...defaultChroma,...c.keying,enabled:true},status:"draft",
   }))});
 }
 return <section className="studio-sport-wall-picker">
  <div className="studio-sport-wall-heading">
    <div><strong>{fr?"MUR SIGNATURE DE L’ÉMISSION":"EPISODE SIGNATURE BACKDROP"}</strong>
      <p>{fr?"Choisis un sport, laisse le Studio décider selon le sujet, ou demande un choix aléatoire stable pour cet épisode.":"Select a sport, let the Studio match the episode topic, or pick a stable random background."}</p></div>
    <span>{fr?"DÉCORS OFFICIELS":"OFFICIAL BACKDROPS"}</span>
  </div>
  <div className="studio-sport-wall-modes" role="group" aria-label={fr?"Sélection du décor":"Backdrop selection"}>
    <button type="button" className={mode==="manual"?"is-selected":""} onClick={()=>update("manual")}>{fr?"CHOIX MANUEL":"MANUAL"}</button>
    <button type="button" className={mode==="random"?"is-selected":""} onClick={()=>update("random")}>{fr?"ALÉATOIRE":"RANDOM"}</button>
    <button type="button" className={mode==="topic"?"is-selected":""} onClick={()=>update("topic")}>{fr?"SELON LE SUJET":"BY TOPIC"}</button>
  </div>
  <p className="studio-sport-wall-current" role="status">
    {fr?"DÉCOR ACTUEL":"CURRENT BACKDROP"} : <strong>{backdropLabel(selected,lang)}</strong>
    {mode==="random"&&(fr?" · Le choix reste identique pour cet épisode.":" · Fixed for this episode.")}
    {mode==="topic"&&(fr?" · Si aucun sport n’est détecté, choix aléatoire.":" · Random fallback if no sport detected.")}
  </p>
  <div className="studio-sport-wall-gallery">
    {studioBackgrounds.map(item=><button key={item.id} type="button"
      onClick={()=>update("manual",item.id)}
      className={`studio-sport-wall-tile ${selected.id===item.id?"is-current":""}`}
      aria-pressed={selected.id===item.id}>
      <div className="studio-sport-wall-image">
        {/* Same-origin repo assets; no external URL or invented image is substituted. */}
        <img src={item.file} alt="" loading="lazy"/>
      </div>
      <span>{backdropLabel(item,lang)}{selected.id===item.id?" ✓":""}</span>
    </button>)}
  </div>
  <p className="analysis-note">{fr
   ?"Le choix est mémorisé dans l’épisode et utilisé lors du rendu des capsules avec « Mur signature ». Tu peux remplacer le choix automatique en cliquant simplement sur un sport."
   :"The selected wall is saved with the episode and used by capsules using Signature Wall. Click any sport to override the automatic choice."}</p>
  <button type="button" className="analysis-secondary studio-sport-wall-apply" disabled={!project.capsules.length}
    onClick={applyToAll}>{fr?"APPLIQUER LE DÉCOR AUX CAPSULES DE CET ÉPISODE":"APPLY WALL TO ALL EPISODE CAPSULES"}</button>
  <p className="analysis-note">{fr
   ?"Golf : aucun décor original n’a encore été ajouté. Il sera proposé après création de son visuel."
   :"Golf: an original approved wall is not yet available. It can be added to the gallery when created."}</p>
 </section>;
}
