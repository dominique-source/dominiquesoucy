"use client";

import { useEffect, useRef, useState } from "react";
import type { StudioProject } from "@/lib/analysis/project";
import { defaultChroma } from "@/lib/analysis/chroma-key";
import { createDraftsFromAnalysis } from "@/lib/analysis/capsule-drafts";
import { buildHdRenderManifest, hdManifestFilename } from "@/lib/analysis/hd-render-manifest";

type Capsule = StudioProject["capsules"][number];
type Style = "conversation" | "quote" | "rafale";
type Format = Capsule["format"];
type Props = {
  lang: "fr" | "en";
  project: StudioProject;
  master?: File;
  onChange: (patch: Partial<StudioProject>) => void;
  onEvent: (type: StudioProject["events"][number]["type"], message: string,
    status?: StudioProject["events"][number]["status"]) => void;
};

const options: {style:Style;number:string;fr:string;en:string}[] = [
  {style:"conversation",number:"01",fr:"QUESTION JOURNALISTE",en:"JOURNALIST QUESTION"},
  {style:"quote",number:"02",fr:"CITATION PERCUTANTE",en:"POWERFUL QUOTE"},
  {style:"rafale",number:"03",fr:"RAFALE DE QUESTIONS",en:"QUESTION BURST"},
];

function BubbleVisual({style,question,caption,mini=false,attribution="reconstructed",journalistName="",journalistOutlet="",portraitUrl=""}:{style:Style;question:string;caption:string;mini?:boolean;attribution?:"verified"|"reconstructed";journalistName?:string;journalistOutlet?:string;portraitUrl?:string}){
  const lines = question.split("\n").map(v=>v.trim()).filter(Boolean).slice(0,3);
  const previewQuestion = question.trim() || "Votre question apparaîtra ici";
  const previewQuote = caption.trim() || "Votre citation apparaîtra ici";
  return <div className={"ds-bubble-graphic ds-bubble-"+style+(mini?" mini":"")}>
    {style==="conversation"?<div className="ds-bubble-glass ds-bubble-journalist-glass">
      <div className="ds-bubble-journalist-layout">
        <div className="ds-bubble-journalist-body">
          <div className="ds-bubble-ribbon"><span aria-hidden="true">◉</span> {attribution==="verified"?"QUESTION — JOURNALISTE":"QUESTION — PROPOSÉE"}</div>
          {(journalistName||journalistOutlet)&&<div className="ds-bubble-attribution">
            {journalistName||"Journaliste"}{journalistOutlet&&<span> / {journalistOutlet}</span>}
          </div>}
          <strong>« {previewQuestion.slice(0,175)} »</strong>
          {attribution==="reconstructed"&&<small>RECONSTITUTION ÉDITORIALE</small>}
        </div>
        <div className="ds-bubble-journalist-portrait" aria-hidden="true">
          {portraitUrl?<img src={portraitUrl} alt=""/>:<span className="ds-bubble-portrait-icon">◉</span>}
        </div>
      </div>    </div>:style==="quote"?<div className="ds-bubble-glass">
      <div className="ds-bubble-ribbon">{mini?"CITATION CHOC":"LA RÉPONSE"}</div>
      <strong className="ds-bubble-quote-text">« {previewQuote.slice(0,200)} »</strong>
    </div>:<div className="ds-bubble-rafale">
      {(lines.length?lines:["Votre première question","Votre deuxième question","Votre troisième question"])
        .map((line,i)=><div className="ds-bubble-glass" key={i}>
          <b>{String(i+1).padStart(2,"0")}</b><strong>{line.slice(0,130)}</strong>
        </div>)}
    </div>}
  </div>;
}

export function BubbleWorkshopSimple({lang,project,master,onChange,onEvent}:Props){
  const fr=lang==="fr";
  const capsules=project.capsules;
  const current=capsules.find(c=>c.id===project.selectedCapsuleId)||capsules[0];
  const [previewUrl,setPreviewUrl]=useState("");
  const [info,setInfo]=useState("");
  const [journalistPhoto,setJournalistPhoto]=useState<File|null>(null);
  const [journalistPhotoUrl,setJournalistPhotoUrl]=useState("");
  const editorRef=useRef<HTMLTextAreaElement|null>(null);
  const videoRef=useRef<HTMLVideoElement|null>(null);
  useEffect(()=>{setJournalistPhoto(null)},[current?.id]);
  useEffect(()=>{
    if(!journalistPhoto){setJournalistPhotoUrl("");return}
    const url=URL.createObjectURL(journalistPhoto);
    setJournalistPhotoUrl(url);
    return()=>URL.revokeObjectURL(url);
  },[journalistPhoto]);
  const editBubble=()=>{
    editorRef.current?.scrollIntoView({behavior:"smooth",block:"center"});
    editorRef.current?.focus();
  };

  useEffect(()=>{
    if(!master)return;
    const url=URL.createObjectURL(master);
    setPreviewUrl(url);
    return()=>{URL.revokeObjectURL(url);setPreviewUrl("")};
  },[master]);

  useEffect(()=>{
    const player=videoRef.current;
    if(player&&current&&current.end>current.start){
      player.pause();
      const seek=()=>{try{player.currentTime=current.start}catch{}};
      if(player.readyState>=1)seek();
      else player.addEventListener("loadedmetadata",seek,{once:true});
      return()=>player.removeEventListener("loadedmetadata",seek);
    }
  },[current?.id,current?.start,previewUrl]);

  function update(patch:Partial<Capsule>){
    if(!current)return;
    onChange({capsules:capsules.map(c=>c.id===current.id?{
      ...c,...patch,status:"draft" as const,
      timingSource:("start" in patch||"end" in patch)?"manual" as const:c.timingSource,
      keying:{...defaultChroma,enabled:false},background:"original" as const,
    }:c)});
    setInfo("");
  }

  function generate(){
    const drafts=createDraftsFromAnalysis(project);
    if(!drafts.length){
      setInfo(fr?"Toutes les propositions disponibles sont déjà créées.":"All available proposals already exist.");
      return;
    }
    onChange({capsules:[...capsules,...drafts.map(c=>({
      ...c,keying:{...defaultChroma,enabled:false},background:"original" as const,
    }))],selectedCapsuleId:drafts[0].id,stage:"editing"});
    onEvent("analysis",String(drafts.length)+" capsules préparées pour les bulles","success");
    setInfo(fr?"Les extraits sont prêts. Choisis maintenant une bulle.":"Clips are ready. Choose your bubbles.");
  }

  function createManual(){
    if(capsules.length>=40)return;
    const c:Capsule={
      id:crypto.randomUUID(),title:"Capsule "+String(capsules.length+1).padStart(2,"0"),
      start:0,end:0,format:project.format,style:"quote",caption:"",bubble:"",
      background:"original",keying:{...defaultChroma,enabled:false},
      textPosition:"bottom",status:"draft",timingSource:"unmatched",
    };
    onChange({capsules:[...capsules,c],selectedCapsuleId:c.id,stage:"editing"});
  }

  const selectedStyle:Style=current&&["conversation","quote","rafale"].includes(current.style)?
    current.style as Style:"quote";
  const format:Format=current?.format||"16:9";
  const timeValid=!!current&&current.end>current.start&&current.start>=0&&
    current.end<=project.timeline.duration&&current.end-current.start<=600;
  const textValid=!!current&&(selectedStyle==="quote"?
    current.caption.trim().length>0:current.bubble.trim().length>0);

  function exportPlan(){
    if(!current||!timeValid||!textValid)return;
    try{
      const manifest=buildHdRenderManifest(project,{
        ...current,
        style:selectedStyle,
        keying:{...defaultChroma,enabled:false},background:"original",
      },{transparentForeground:false,reporterPortrait:!!journalistPhoto&&selectedStyle==="conversation"});
      const url=URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)],{type:"application/json"}));
      const link=document.createElement("a");link.href=url;link.download=hdManifestFilename(current);
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),1500);
      setInfo(journalistPhoto&&selectedStyle==="conversation"?
        (fr?"Instructions téléchargées. Pour conserver la photo au rendu HD, copie également son fichier sous le nom reporter.png dans le moteur local.":"Instructions downloaded. To keep the journalist photo in the HD render, copy it as reporter.png into the local render folder."):
        (fr?"Instructions HD téléchargées. Le moteur local sur ton Mac les appliquera à master.mp4.":"HD render instructions downloaded. The local Mac renderer applies them to master.mp4."));
    }catch{
      setInfo(fr?"Cette capsule n'a pas encore de repères temporels valides.":"This clip has no valid time range yet.");
    }
  }

  const validList=capsules.filter(c=>c.end>c.start&&c.end<=project.timeline.duration);
  return <section id="studio-capsule-workshop" className="analysis-panel studio-bubble-lab">
    <div className="studio-bubble-lab-heading">
      <div>
        <p className="analysis-kicker">DOM SOUCY MEDIA / GRAPHIC LAB</p>
        <h2>{fr?"CRÉER MES BULLES.":"BUILD MY BUBBLES."}</h2>
        <p>{fr?"Ta vidéo est déjà montée dans Premiere. Ici, on ajoute seulement nos bulles.":"Your video is already edited in Premiere. Here, we only add our bubbles."}</p>
      </div>
      <span>{capsules.length} / 40 {fr?"CAPSULES":"CLIPS"}</span>
    </div>
    {!capsules.length&&<div className="studio-bubble-lab-empty">
      <strong>{fr?"LES BULLES SONT PRÊTES À ESSAYER":"BUBBLES READY TO TRY"}</strong>
      <p>{fr?"Voici nos trois premières animations disponibles. Après l'analyse IA, choisis ton extrait et clique sur le visuel que tu préfères.":"Here are our three available animations. After AI analysis, choose a clip and click the visual you like."}</p>
      {!!project.analysis?.moments.length&&<button type="button" className="analysis-primary studio-bubble-lab-big" onClick={generate}>
        {fr?"✦ CRÉER MES CAPSULES AVEC L’IA":"✦ CREATE MY CLIPS WITH AI"}
      </button>}
      {!project.analysis?.moments.length&&<p className="analysis-note">{fr?"Lance d'abord l'analyse pour obtenir les extraits réels. Tu peux quand même regarder les modèles ci-dessous.":"First run analysis for real clips. You can still look at the templates below."}</p>}
    </div>}

    {!!capsules.length&&<div className="studio-bubble-strip">
      <strong>{fr?"1. CHOISIS TON EXTRAIT":"1. CHOOSE YOUR CLIP"}</strong>
      <div className="studio-bubble-strip-scroll">
        {capsules.map((c,i)=><button type="button" key={c.id}
          className={c.id===current?.id?"active":""}
          aria-pressed={c.id===current?.id}
          onClick={()=>onChange({selectedCapsuleId:c.id})}>
          <span>{String(i+1).padStart(2,"0")}</span>
          <strong>{c.title}</strong>
          <small>{c.end>c.start?(fr?"✓ EXTRAIT REPÉRÉ":"✓ CLIP FOUND"):(fr?"REPÈRE À VÉRIFIER":"REVIEW TIMING")}</small>
        </button>)}
      </div>
      {!!project.analysis?.moments.length&&capsules.length<40&&<button type="button" className="analysis-secondary"
        onClick={generate}>{fr?"+ AJOUTER LES PROPOSITIONS MANQUANTES":"+ ADD MISSING SUGGESTIONS"}</button>}
    </div>}

    <div className="studio-bubble-lab-grid">
      <div className="studio-bubble-video-side">
        <strong>{fr?"2. APERÇU SUR TA VIDÉO":"2. PREVIEW ON YOUR VIDEO"}</strong>
        <div className={"studio-bubble-preview format-"+format.replace(":","-")}>
          {previewUrl?<video ref={videoRef} src={previewUrl} controls playsInline preload="metadata"
            onTimeUpdate={e=>{
              if(current?.end&&e.currentTarget.currentTime>=current.end)e.currentTarget.pause();
            }}/>:<div className="studio-bubble-no-video">
            <span>▶</span>
            <strong>{fr?"TA VIDÉO PREMIERE ICI":"YOUR PREMIERE VIDEO HERE"}</strong>
            <small>{fr?"Importe ton MP4 pour voir les bulles par-dessus.":"Import your MP4 to see the bubbles on top."}</small>
          </div>}
          <div className="studio-bubble-video-top" aria-hidden="true">
            <b>DOM SOUCY <em>MEDIA.</em></b><span>● EN DIRECT</span>
          </div>
          <button type="button" className="studio-bubble-video-graphics studio-bubble-click-to-edit"
            key={current?.id||"demo"} onClick={editBubble}
            title={fr?"Cliquer pour modifier le texte de cette bulle":"Click to edit this bubble's text"}
            aria-label={fr?"Modifier le texte de la bulle affichée":"Edit the displayed bubble text"}>
            <BubbleVisual style={selectedStyle} question={current?.bubble||""}
              caption={current?.caption||""} attribution={current?.questionAttribution}
              journalistName={current?.journalistName||""}
              journalistOutlet={current?.journalistOutlet||""}
              portraitUrl={journalistPhotoUrl}/>
          </button>
          <div className="studio-bubble-video-bottom" aria-hidden="true"><b> / </b> DOMINIQUE SOUCY</div>
        </div>
        <p className="analysis-note">{fr?
          "Clique directement sur la bulle pour modifier son texte. Cet aperçu reprend les dégradés, reflets et contours lime de nos maquettes. Le moteur HD produit les mouvements définitifs.":
          "Interactive graphic preview. Final animation is generated by the local HD renderer and may differ slightly."}</p>
      </div>

      <div className="studio-bubble-choice-side">
        <strong>{fr?"3. CHOISIS TA BULLE":"3. CHOOSE YOUR BUBBLE"}</strong>
        <div className="studio-bubble-gallery">
          {options.map(item=><button type="button" key={item.style}
            className={current&&selectedStyle===item.style?"selected":""}
            aria-pressed={!!current&&selectedStyle===item.style}
            onClick={()=>current?update({style:item.style}):setInfo(fr?
              "Lance d'abord l'analyse pour choisir un modèle sur un extrait.":"Analyze your video first to select a model for a clip.")}>
            <div className="studio-bubble-gallery-art">
              <BubbleVisual style={item.style}
                question={item.style==="rafale"?"Pourquoi maintenant?\nQu'est-ce qui doit changer?\nEt après?":"Pourquoi remettre le sport en question?"}
                caption="Il faut commencer par la base." mini/>
            </div>
            <span><b>{item.number}</b> {fr?item.fr:item.en}</span>
            {current&&selectedStyle===item.style&&<small>✓ {fr?"CHOISIE":"SELECTED"}</small>}
          </button>)}
        </div>
      </div>
    </div>

    {current&&<div className="studio-bubble-editor-simple">
      <strong>{fr?"4. PERSONNALISE LE MESSAGE":"4. CUSTOMIZE THE MESSAGE"}</strong>
      <label>{selectedStyle==="quote"?(fr?"LA CITATION AFFICHÉE":"DISPLAYED QUOTE"):
        selectedStyle==="rafale"?(fr?"UNE QUESTION PAR LIGNE (MAX. 3)":"ONE QUESTION PER LINE (MAX 3)"):
        fr?"LA QUESTION AFFICHÉE":"DISPLAYED QUESTION"}
        <textarea ref={editorRef} rows={selectedStyle==="rafale"?4:2} maxLength={500}
          value={selectedStyle==="quote"?current.caption:current.bubble}
          placeholder={selectedStyle==="quote"?(fr?"Choisis la phrase à mettre en valeur…":"Choose the quote…"):
            fr?"Écris la question qui apparaît dans la bulle…":"Type the question for this bubble…"}
          onChange={e=>update(selectedStyle==="quote"?{caption:e.target.value}:{bubble:e.target.value})}/>
      </label>
      {selectedStyle==="conversation"&&<div className="studio-bubble-journalist-editor">
        <strong>{fr?"PHOTO ET IDENTIFICATION DU JOURNALISTE (FACULTATIF)":"JOURNALIST PHOTO AND DETAILS (OPTIONAL)"}</strong>
        <div className="studio-bubble-journalist-identity">
          <label>{fr?"Nom du journaliste":"Journalist name"}
            <input value={current.journalistName||""} maxLength={100}
              placeholder={fr?"Nom réel, si vérifié":"Real name, if verified"}
              onChange={e=>update({journalistName:e.target.value})}/>
          </label>
          <label>{fr?"Média":"Outlet"}
            <input value={current.journalistOutlet||""} maxLength={100}
              placeholder={fr?"Organisation, si vérifiée":"Organization, if verified"}
              onChange={e=>update({journalistOutlet:e.target.value})}/>
          </label>
        </div>
        <label className="studio-bubble-portrait-upload">
          <span>{fr?"AJOUTER UNE PHOTO (PNG)":"ADD PHOTO (PNG)"}</span>
          <input type="file" accept="image/png" onChange={e=>{
            const file=e.currentTarget.files?.[0];
            if(!file)return;
            if(file.type!=="image/png"||file.size>8_000_000){
              setInfo(fr?"Photo PNG de 8 Mo maximum.":"PNG photo up to 8 MB.");
              return;
            }
            setJournalistPhoto(file);
          }}/>
        </label>
        {journalistPhoto&&<p className="analysis-note">{fr?
          "La photo apparaît ici. Pour l'export HD local, il faudra aussi fournir son fichier sous le nom reporter.png. Les portraits ne sont pas envoyés sur Vercel.":
          "Photo previews here. The local HD renderer also needs the file named reporter.png. Portraits are not uploaded to Vercel."}</p>}
      </div>}
            {selectedStyle!=="quote"&&<p className="analysis-note">
        {fr?"Les questions imaginées par l’IA restent identifiées comme des reconstitutions. Ne présente jamais une question inventée comme une vraie intervention journalistique.":"AI-generated questions are marked as reconstructions and must not be presented as real journalist statements."}
      </p>}
      <div className="studio-bubble-format-controls" role="group" aria-label={fr?"Format vidéo":"Video format"}>
        {(["16:9","9:16","1:1"] as Format[]).map(v=><button type="button" key={v}
          aria-pressed={format===v} className={format===v?"active":""}
          onClick={()=>update({format:v})}>{v}</button>)}
      </div>
      <details className="studio-simple-details">
        <summary>{fr?"OPTIONS AVANCÉES (SEULEMENT SI NÉCESSAIRE)":"ADVANCED OPTIONS (ONLY IF NEEDED)"}</summary>
        <p className="analysis-note">{fr?"Les repères viennent normalement de la transcription. Ne change les secondes que si l’extrait n’a pas été reconnu.":"Timing normally comes from transcription. Only adjust seconds if the clip wasn't matched."}</p>
        <div className="studio-bubble-timing">
          <label>{fr?"Début (secondes)":"Start (seconds)"}<input type="number" min={0} max={7200} step={.1}
            value={current.start} onChange={e=>update({start:Number(e.target.value)||0})}/></label>
          <label>{fr?"Fin (secondes)":"End (seconds)"}<input type="number" min={0} max={7200} step={.1}
            value={current.end} onChange={e=>update({end:Number(e.target.value)||0})}/></label>
        </div>
        {selectedStyle!=="quote"&&<label>{fr?"Origine de la question":"Question source"}
          <select value={current.questionAttribution||"reconstructed"}
            onChange={e=>update({questionAttribution:e.target.value as "reconstructed"|"verified"})}>
            <option value="reconstructed">{fr?"Question reconstituée (IA)":"Reconstructed question (AI)"}</option>
            <option value="verified">{fr?"Question enregistrée et vérifiée":"Recorded, verified question"}</option>
          </select>
        </label>}
      </details>
      {!timeValid&&<p className="studio-bubble-warning">{fr?
        "L’IA n’a pas trouvé un début et une fin fiables. Tu peux voir la bulle, mais le rendu sera bloqué jusqu’à correction des repères dans « Options avancées ».":
        "AI has not found reliable start/end points. You can preview the bubble, but rendering is blocked until timestamps are fixed in Advanced options."}</p>}
      {!textValid&&<p className="studio-bubble-warning">{fr?"Ajoute le texte de la bulle avant de préparer le rendu.":"Add bubble text before preparing rendering."}</p>}
      <button type="button" className="analysis-primary studio-bubble-lab-big"
        disabled={!timeValid||!textValid} onClick={exportPlan}>
        {fr?"✓ APPROUVER LA BULLE ET PRÉPARER LE HD":"✓ APPROVE BUBBLE AND PREPARE HD"}
      </button>
      <p className="analysis-note">{fr?
        "Ce bouton télécharge les instructions du moteur HD (.JSON), pas encore le MP4 final. L’assemblage avec la vidéo se fait sur ton Mac, sans retoucher Premiere.":
        "This button downloads HD rendering instructions (.JSON), not the final MP4. Your Mac assembles the video without editing in Premiere."}</p>
    </div>}
    {!capsules.length&&<button type="button" className="analysis-secondary" onClick={createManual}>
      {fr?"+ CRÉER UNE CAPSULE MANUELLE (AVANCÉ)":"+ CREATE A MANUAL CLIP (ADVANCED)"}
    </button>}
    {!!info&&<p role="status" className="studio-bubble-notice">{info}</p>}
    {!!capsules.length&&<p className="analysis-note">{fr?
      String(validList.length)+" capsule(s) avec des repères valides. Aucun détourage, arrière-plan ou choix de caméra supplémentaire n'est demandé.":
      String(validList.length)+" clips with valid timing. No keying, background or camera controls are required."}</p>}
  </section>;
}
