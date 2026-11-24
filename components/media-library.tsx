"use client";
import {useEffect,useState,useRef} from "react";
import {youtubeId,type Conference,type Clip} from "@/lib/media-catalog";
import "./media-library.css";
const previews=[
 ["Le sport et la société","Sport and society","03_moment_communautaire"],
 ["Les enjeux du sport","The challenges of sport","01_basket_action_archive"],
 ["L’éducation par le sport","Education through sport","04_equipe_purathlete"],
 ["La suite du projet","What's next","02_portrait_chemise_bleue"],
 ["Changer les règles du jeu","Changing the rules","07_archive_rouge_et_or"]
];
function Thumbnail({clip,short=false}:{clip:Clip;short?:boolean}){
 const id=youtubeId(clip.url);
 return <img loading="lazy" src={`https://i.ytimg.com/vi/${id}/${short?"hqdefault":"maxresdefault"}.jpg`} alt="" onLoad={e=>{const im=e.currentTarget;if(im.naturalWidth<=120&&!im.src.endsWith("/hqdefault.jpg"))im.src=`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}} onError={e=>{const im=e.currentTarget;if(!im.src.endsWith("/hqdefault.jpg"))im.src=`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}}/>;
}
export function MediaLibrary({lang}:{lang:"fr"|"en"}){
 const rail=useRef<HTMLDivElement>(null);const fr=lang==="fr";const [items,setItems]=useState<Conference[]>([]);const [selected,setSelected]=useState(0);const [playing,setPlaying]=useState<Clip|null>(null);
 useEffect(()=>{fetch("/api/media-catalog").then(r=>r.ok?r.json():[]).then(setItems).catch(()=>{})},[]);
 useEffect(()=>{if(!playing)return;const close=(e:KeyboardEvent)=>{if(e.key==="Escape")setPlaying(null)};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[playing]);
 const active=items[selected];if(!active)return null;
 const tile=(c:Clip,short=false,choose?:()=>void)=><button key={c.id} className={"ml-tile "+(short?"ml-short":"")} aria-label={(fr?"Regarder ":"Watch ")+c.title} onClick={choose||(()=>setPlaying(c))}><div className="ml-poster"><Thumbnail clip={c} short={short}/><div className="ml-play" aria-hidden="true">▶</div></div><span className="ml-title">{c.title}</span></button>;
 return <section className="ml-shell" id="conferences"><p className="ml-kicker">DOM SOUCY MÉDIA / {fr?"CONFÉRENCES DE PRESSE":"PRESS CONFERENCES"}</p><h2>{active.title}</h2><div className="ml-main"><button className="ml-feature" onClick={()=>setPlaying(active)} aria-label={(fr?"Regarder ":"Watch ")+active.title}><Thumbnail clip={active}/><div className="ml-feature-shade"/><div className="ml-feature-cta"><b aria-hidden="true">▶</b>{fr?"REGARDER L’ÉPISODE":"WATCH EPISODE"}</div></button></div><div className="ml-rail-heading"><h3>{fr?"LES EXTRAITS DE CET ÉPISODE":"EPISODE HIGHLIGHTS"}</h3><div className="ml-arrows"><button aria-label={fr?"Précédent":"Previous"} onClick={()=>rail.current?.scrollBy({left:-rail.current.clientWidth*.8,behavior:"smooth"})}>‹</button><button aria-label={fr?"Suivant":"Next"} onClick={()=>rail.current?.scrollBy({left:rail.current.clientWidth*.8,behavior:"smooth"})}>›</button></div></div><div className="ml-rail" ref={rail}>{active.shorts.map(c=>tile(c,true))}{previews.slice(0,Math.max(0,6-active.shorts.length)).map(([f,en,img])=><div key={img} className="ml-tile ml-short ml-preview"><div className="ml-poster"><img src={`/assets/dominique/originals/${img}.jpg`} alt=""/><span className="ml-soon">{fr?"À VENIR":"COMING SOON"}</span><strong>{fr?f:en}</strong></div></div>)}</div>{items.length>1&&<><h3>{fr?"TOUTES LES CONFÉRENCES DE PRESSE":"ALL PRESS CONFERENCES"}</h3><div className="ml-rail">{items.map((c,i)=>tile(c,false,()=>{setSelected(i);setPlaying(c)}))}</div></>}{playing&&<div className="ml-modal" role="dialog" aria-modal="true" aria-label={playing.title}><button autoFocus onClick={()=>setPlaying(null)}>{fr?"FERMER ✕":"CLOSE ✕"}</button><iframe className={active.shorts.some(c=>c.id===playing.id)?"ml-vertical":""} title={playing.title} src={`https://www.youtube-nocookie.com/embed/${youtubeId(playing.url)}?autoplay=1`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen/><a href={playing.url} target="_blank" rel="noreferrer">YouTube ↗</a></div>}</section>
}
