"use client";
import { episodeCode } from "@/lib/analysis/project";
import type { StudioProject } from "@/lib/analysis/project";

export type EpisodeRow={
 id:string;name:string;season:number;episode:number;stage:StudioProject["stage"];
 recordingDate:string;capsuleCount:number;failedCount:number;updatedAt:number;
 mediaCount:number;hasTranscript:boolean;hasAnalysis:boolean;
};
export function EpisodeDashboard({lang,episodes,currentId,onOpen,onNew,disabled}:{
 lang:"fr"|"en";episodes:EpisodeRow[];currentId:string;
 onOpen:(id:string)=>void;onNew:()=>void;disabled:boolean;
}){
 const fr=lang==="fr";
 const sorted=[...episodes].sort((a,b)=>b.updatedAt-a.updatedAt);
 const [filter,setFilter]=useState("");
 const filtered=sorted.filter(p=>[p.name,episodeCode(p.season,p.episode),p.recordingDate].join(" ").toLowerCase().includes(filter.toLowerCase()));
 return <div className="studio-episodes" aria-label={fr?"Tableau de bord des épisodes":"Episode dashboard"}>
  <div className="studio-episodes-title"><div><strong>{fr?"BIBLIOTHÈQUE DES ÉPISODES":"EPISODE LIBRARY"}</strong>
    <p>{fr?"Retrouve une saison, un épisode, ses médias, ses capsules et ses incidents.":"Find seasons, episodes, media, capsules and incidents."}</p></div>
    <button type="button" className="analysis-secondary" onClick={onNew} disabled={disabled}>
      {fr?"+ NOUVEL ÉPISODE":"+ NEW EPISODE"}
    </button>
  </div>
  <input aria-label={fr?"Rechercher des épisodes":"Find episodes"}
    className="studio-episodes-search" placeholder={fr?"Rechercher par titre, S001, E002…":"Search title, S001, E002…"}
    value={filter} onChange={e=>setFilter(e.target.value)} />
  <div className="studio-episode-grid">
    {filtered.length===0?<p>{fr?"Aucun épisode correspondant.":"No matching episode."}</p>:filtered.map(ep=><button
      type="button" key={ep.id} disabled={disabled} onClick={()=>onOpen(ep.id)}
      className={`studio-episode-card ${currentId===ep.id?"is-current":""}`}>
      <span className="studio-episode-code">{episodeCode(ep.season,ep.episode)}</span>
      <strong>{ep.name}</strong>
      <small>{ep.recordingDate || new Date(ep.updatedAt).toLocaleDateString(fr?"fr-CA":"en-CA")} · {ep.mediaCount} {fr?"médias":"media"} · {ep.capsuleCount} {fr?"capsules":"clips"}</small>
      <span className="studio-episode-status">{ep.failedCount>0?`⚠ ${ep.failedCount} ${fr?"incident(s)":"issue(s)"}`:ep.hasAnalysis?(fr?"ANALYSÉ":"ANALYZED"):ep.hasTranscript?(fr?"TRANSCRIT":"TRANSCRIBED"):(fr?"EN COURS":"IN PROGRESS")}</span>
    </button>)}
  </div>
 </div>;
}
import { useState } from "react";
