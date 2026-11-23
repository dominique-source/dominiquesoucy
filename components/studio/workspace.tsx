"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { StudioDashboard } from "./dashboard";

type Props = { lang: "fr" | "en"; provider: boolean; expires: number };
type ProjectRow={id:string;name:string;season:number;episode:number;stage:string;updatedAt:number;capsuleCount:number;mediaCount:number};
const stageNames:Record<string,[string,string]>={
  recording:["À importer","Import"],transcription:["Transcrit","Transcribed"],
  analysis:["Analysé","Analyzed"],editing:["Montage","Editing"],ready:["Prêt","Ready"],
};
export function StudioWorkspace({lang,provider,expires}:Props){
  const fr=lang==="fr";
  const [opened,setOpened]=useState(false);
  const [projects,setProjects]=useState<ProjectRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/analysis/projects",{cache:"no-store",signal:controller.signal})
      .then(async r=>{
        if(!r.ok)throw Error("PROJECT_LIST_UNAVAILABLE");
        const d=await r.json() as {projects?:ProjectRow[]};
        setProjects((d.projects||[]).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,4));
      }).catch(()=>{if(!controller.signal.aborted)setError(true)})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return()=>controller.abort();
  },[]);
  return <div className="studio-workspace">
    <nav className="studio-workspace-nav" aria-label={fr?"Navigation du Studio":"Studio navigation"}>
      <Link href={`/${lang}/studio-live`} className="studio-workspace-brand" onClick={()=>setOpened(false)}>
        DOM SOUCY <b>STUDIO.</b>
      </Link>
      <div className="studio-workspace-nav-right">
        <span className="studio-workspace-private"><i aria-hidden="true"/> PRIVATE WORKSPACE</span>
        {opened&&<button type="button" onClick={()=>setOpened(false)}>
          {fr?"← ACCUEIL":"← HOME"}</button>}
        <Link href={`/${lang}/studio-analyse`} className="studio-workspace-nav-link">
          {fr?"PRODUCTION":"PRODUCTION"} ↗</Link>
      </div>
    </nav>
    {!opened?<main className="studio-workspace-home">
      <div className="studio-workspace-hero">
        <p className="studio-workspace-eyebrow">DOM SOUCY MEDIA <span>/</span> STUDIO CONTROL</p>
        <div className="studio-workspace-version">05 — WORKSPACE</div>
        <h1>{fr?"QU’EST-CE QU’ON":"WHAT ARE WE"}<br/>
          <em>{fr?"CRÉE AUJOURD’HUI ?":"CREATING TODAY?"}</em></h1>
        <p className="studio-workspace-intro">{fr?
          "De l’enregistrement aux capsules, tous tes projets réunis au même endroit. Choisis ton prochain geste.":
          "From recording to finished clips. Your production projects, in one workspace."}</p>
      </div>
      <div className="studio-workspace-actions">
        <Link className="studio-workspace-primary" href={`/${lang}/studio-analyse?mode=new`}>
          <span className="studio-workspace-action-top">01 <span aria-hidden="true">↗</span></span>
          <strong>{fr?"NOUVEAU PROJET":"NEW PROJECT"}</strong>
          <small>{fr?"Importer et préparer une émission":"Import and prepare an episode"}</small>
        </Link>
        <button type="button" className="studio-workspace-tile" onClick={()=>setOpened(true)}>
          <span className="studio-workspace-action-top">02 <span aria-hidden="true">↗</span></span>
          <strong>{fr?"STUDIO LIVE":"LIVE STUDIO"}</strong>
          <small>{fr?"Conférence de presse, micro et commandes vocales":"Press conference, microphone and voice commands"}</small>
        </button>
        <Link className="studio-workspace-tile" href={`/${lang}/studio-analyse?mode=library`}>
          <span className="studio-workspace-action-top">03 <span aria-hidden="true">↗</span></span>
          <strong>{fr?"REPRENDRE":"RESUME WORK"}</strong>
          <small>{fr?"Bibliothèque, capsules et archives MP4":"Projects, capsules and MP4 archives"}</small>
        </Link>
      </div>
      <section className="studio-workspace-recent" aria-label={fr?"Projets récents":"Recent projects"}>
        <div className="studio-workspace-recent-heading">
          <div><span className="studio-workspace-eyebrow">{fr?"REPRISE RAPIDE":"QUICK RESUME"}</span>
            <h2>{fr?"MES PRODUCTIONS":"MY PRODUCTIONS"}</h2></div>
          <Link href={`/${lang}/studio-analyse?mode=library`}>{fr?"TOUT VOIR":"VIEW ALL"} ↗</Link>
        </div>
        {loading?<p className="studio-workspace-loading" role="status">{fr?"Chargement des projets…":"Loading projects…"}</p>:
          error?<p className="studio-workspace-loading" role="alert">{fr?
            "La bibliothèque est momentanément indisponible. Ouvre le Studio de production pour réessayer.":
            "Project library is temporarily unavailable. Open production to retry."}</p>:
          projects.length?<div className="studio-workspace-projects">{projects.map(p=>
            <Link className="studio-workspace-project" key={p.id} href={`/${lang}/studio-analyse?project=${encodeURIComponent(p.id)}`}>
              <span>{`S${String(p.season).padStart(3,"0")} · E${String(p.episode).padStart(3,"0")}`}</span>
              <strong>{p.name}</strong>
              <small>{p.mediaCount} {fr?"médias":"media"} · {p.capsuleCount} capsules · {(stageNames[p.stage]||["En cours","In progress"])[fr?0:1]}</small>
              <b aria-hidden="true">↗</b>
            </Link>)}</div>:
          <p className="studio-workspace-loading">{fr?
            "Aucun épisode enregistré. Commence avec Nouveau projet.":
            "No saved episodes yet. Start with New project."}</p>}
      </section>
      <p className="studio-workspace-note">{fr?
        "Tes projets et les médias archivés restent privés. Rien ne démarre sans ton action.":
        "Your projects and archived media stay private. Nothing starts until you choose it."}</p>
    </main>:<div className="studio-workspace-live">
      <div className="studio-workspace-live-head">
        <span>● {fr?"CONSOLE D’ENREGISTREMENT":"RECORDING CONSOLE"}</span>
        <Link href={`/${lang}/studio-analyse`}>{fr?"PASSER EN PRODUCTION":"GO TO PRODUCTION"} ↗</Link>
      </div>
      <StudioDashboard lang={lang} provider={provider} expires={expires}/>
    </div>}
  </div>;
}