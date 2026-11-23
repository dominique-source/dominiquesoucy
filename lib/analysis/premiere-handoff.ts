import type {StudioProject} from "./project";

export type PremiereCutRow={
  index:number;id:string;title:string;
  startSeconds:number;endSeconds:number;durationSeconds:number;
  startClock:string;endClock:string;lengthClock:string;
  style:string;caption:string;question:string;questionSource:string;
  timingStatus:"VERIFIED_RANGE"|"REVIEW";
};
const ms=(secs:number)=>Math.round(secs*1000);
export function clockFromSeconds(secs:number):string{
  if(!Number.isFinite(secs)||secs<0)throw Error("INVALID_TIMESTAMP");
  const total=ms(secs);
  const hh=Math.floor(total/3600000);
  const mm=Math.floor((total%3600000)/60000);
  const ss=Math.floor((total%60000)/1000);
  const millis=total%1000;
  return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}.${String(millis).padStart(3,"0")}`;
}
/**
 * Cuts are referenced to an uninterrupted 00:00 episode master exported from
 * Premiere. No inferred frame-rate or drop-frame timecode: use exact elapsed
 * seconds and clock HH:MM:SS.mmm, safe even when source FPS is 29.97.
 */
export function buildPremiereCutRows(project:StudioProject):PremiereCutRow[]{
  return project.capsules.map((capsule,index)=>{
    const good=Number.isFinite(capsule.start)&&Number.isFinite(capsule.end)&&
      capsule.start>=0&&capsule.end>capsule.start&&
      capsule.end<=project.timeline.duration+0.01;
    return {
      index:index+1,id:capsule.id,title:capsule.title.slice(0,100),
      startSeconds:capsule.start,endSeconds:capsule.end,
      durationSeconds:good?Math.round((capsule.end-capsule.start)*1000)/1000:0,
      startClock:good?clockFromSeconds(capsule.start):"",
      endClock:good?clockFromSeconds(capsule.end):"",
      lengthClock:good?clockFromSeconds(capsule.end-capsule.start):"",
      style:capsule.style,caption:capsule.caption,question:capsule.bubble,
      questionSource:capsule.questionAttribution||"reconstructed",
      timingStatus:good?"VERIFIED_RANGE":"REVIEW",
    };
  });
}
function csvCell(value:unknown):string{
  let v=String(value??"");
  // CSV spreadsheet clients may interpret text from transcripts as formulas.
  if(/^[\s]*[=+@-]/.test(v))v="'"+v;
  return '"'+v.replace(/"/g,'""').replace(/\r\n|\r|\n/g," ")+'"';
}
export function buildPremiereCutCsv(project:StudioProject):string{
  const columns=["#","Capsule ID","Titre","Début (s)","Fin (s)","Durée (s)",
    "Début HH:MM:SS.mmm","Fin HH:MM:SS.mmm","Durée HH:MM:SS.mmm",
    "Vérification","Modèle de bulle","Citation","Question","Origine question"];
  const rows=buildPremiereCutRows(project);
  const body=rows.map(r=>[
    r.index,r.id,r.title,r.startSeconds,r.endSeconds,r.durationSeconds,
    r.startClock,r.endClock,r.lengthClock,r.timingStatus,r.style,
    r.caption,r.question,r.questionSource,
  ].map(csvCell).join(","));
  // Excel-compatible UTF-8 BOM; CSV is a reference list, not a project importer.
  return "\uFEFF"+[columns.map(csvCell).join(","),...body].join("\r\n")+"\r\n";
}
export function buildPremiereEditBrief(project:StudioProject,lang:"fr"|"en"="fr"):string{
  const rows=buildPremiereCutRows(project);
  const total=rows.length;
  const ready=rows.filter(r=>r.timingStatus==="VERIFIED_RANGE").length;
  const fr=lang==="fr";
  const lead=fr?[
    "DOM SOUCY MEDIA — BRIEF DE MONTAGE PREMIERE PRO",
    `Projet : ${project.name}`,
    `Épisode : S${project.season} E${project.episode}`,
    `Durée de référence : ${clockFromSeconds(project.timeline.duration)}`,
    `Capsules : ${ready}/${total} plages temporelles valides`,
    "",
    "ORDRE DE PRODUCTION",
    "1. Synchroniser les 3 caméras et le son final dans Premiere Pro.",
    "2. Créer une séquence multicaméra sans modifier le départ ni la durée de l'épisode.",
    "3. Exporter un master continu nommé master.mp4 avec audio définitif.",
    "4. Analyser EXACTEMENT ce master dans DOM SOUCY STUDIO; ne pas utiliser un autre montage audio.",
    "5. Vérifier les plages ci-dessous puis choisir les bulles, les citations et les formats.",
    "6. Exporter le manifeste HD de chaque capsule et produire les habillages avec le moteur local.",
    "",
    "ATTENTION : si tu coupes les silences en ripple dans Premiere, les timecodes calculés avant le nouveau master deviennent invalides.",
    "Les questions proposées par IA doivent rester identifiées comme reconstitutions.",
    "Le CSV est une liste de montage, PAS un fichier de séquence Premiere importable automatiquement.",
    "Pour créer un véritable montage Premiere automatiquement, il faudra une intégration spécifique et des essais de compatibilité.",
  ]:[
    "DOM SOUCY MEDIA — PREMIERE PRO EDIT BRIEF",
    `Project: ${project.name}`,`Episode: S${project.season} E${project.episode}`,
    `Reference duration: ${clockFromSeconds(project.timeline.duration)}`,
    `Capsules: ${ready}/${total} valid ranges`,"",
    "1. Synchronize 3 cameras and final audio in Premiere.",
    "2. Create a continuous multicamera episode master, with no timeline ripple edits.",
    "3. Export master.mp4 with its final audio; analyze exactly that master in Studio.",
    "4. Approve excerpts and graphics; export the HD manifest for each capsule.",
    "5. Render overlays with the local renderer.","",
    "WARNING: ripple-editing the episode later invalidates previously analyzed timecodes.",
    "Reconstructed journalist questions must never be presented as verified originals.",
    "CSV is a reference cut list, NOT a natively importable Premiere sequence.",
  ];
  const details=rows.map(r=>
    `${String(r.index).padStart(2,"0")} · ${r.startClock||"À VÉRIFIER"} → ${r.endClock||"À VÉRIFIER"} · ${r.title} · ${r.style} · ${r.timingStatus}`);
  return [...lead,"",...(fr?["LISTE DES CAPSULES"]:["CAPSULE CUT LIST"]),...details,""].join("\n");
}
