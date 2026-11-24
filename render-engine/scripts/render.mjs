#!/usr/bin/env node
import {readFileSync,existsSync,mkdirSync} from "node:fs";
import {resolve,basename,join,dirname} from "node:path";
import {spawnSync} from "node:child_process";

const root=resolve(import.meta.dirname,"..");
const manifestFile=resolve(process.argv[2]||join(root,"capsule.json"));
function abort(message){console.error("\nERREUR : "+message+"\n");process.exit(1)}
if(!existsSync(manifestFile))abort("Fichier manifeste introuvable : "+manifestFile);
let props;
try{props=JSON.parse(readFileSync(manifestFile,"utf8"))}
catch{abort("Le manifeste n'est pas un JSON valide")}
const formats=["16:9","9:16","1:1"],styles=["journalist","rafale","quote","editorial","classic"];
if(props.schemaVersion!==1||!formats.includes(props.format)||!styles.includes(props.style)||
  !Number.isFinite(props.start)||!Number.isFinite(props.end)||props.start<0||
  props.end<=props.start||props.end-props.start>600)
  abort("Manifest invalid: schemaVersion, format, style or timecodes. Max 10 minutes per capsule.");
const optional=["foregroundAsset","audioAsset","backgroundAsset","portraitAsset","outroAsset"];
for(const key of ["masterAsset",...optional]){
  const value=props[key];
  if(typeof value!=="string"||value&&(!/^[a-zA-Z0-9_.-]{1,120}$/.test(value)||basename(value)!==value))
    abort(key+" doit contenir uniquement un nom de fichier local simple (pas de chemin)");
}
if(!props.masterAsset)abort("masterAsset requis (ex. master.mp4)");
if(props.outroAsset!==undefined&&props.outroAsset!==""&&
  (!Number.isFinite(props.outroDurationSeconds)||props.outroDurationSeconds<=0||props.outroDurationSeconds>15))
  abort("outroDurationSeconds doit être une durée positive de 15 secondes maximum.");

for(const key of ["title","caption","bubble","journalistName","journalistOutlet","episodeLabel"]){
  if(typeof props[key]!=="string")abort(key+" doit être du texte");
}
if(props.questionAttribution!=="verified"&&props.questionAttribution!=="reconstructed")
  abort("questionAttribution doit être verified ou reconstructed");
const publicDir=join(root,"public");
for(const key of ["masterAsset","foregroundAsset","audioAsset","backgroundAsset","portraitAsset","outroAsset"]){
  if(props[key]&&!existsSync(join(publicDir,props[key])))
    abort("Fichier "+props[key]+" absent du dossier render-engine/public. Pour la signature, choisis les MP4 originaux dans RENDU-HD.command ou copie-les sous le nom attendu.");
}
if(props.foregroundAsset&&!props.audioAsset&&!existsSync(join(publicDir,"audio.wav")))
  abort("Avec une vidéo détourée, ajoute audio.wav ou renseigne audioAsset dans le manifeste");
if(!props.foregroundAsset&&props.backgroundAsset)
  console.log("Note : backgroundAsset sera utilisé seulement avec foregroundAsset transparent.");
if(!props.foregroundAsset&&props.audioAsset)
  console.log("Note : l'audio provient du master MP4. audioAsset est utilisé pour la vidéo détourée.");
const safeName=String(props.title||props.capsuleId||"capsule").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"-").slice(0,50)||"capsule";
const output=join(root,"out",safeName+"-"+props.format.replace(":","x")+".mp4");
mkdirSync(dirname(output),{recursive:true});
console.log("DOM SOUCY HD — ",props.format,props.start,"à",props.end,"s");
console.log("Sources locales uniquement : aucune vidéo transmise à Vercel.");
if(props.outroAsset)console.log("Signature finale automatique : "+props.outroAsset+" ("+props.outroDurationSeconds+" s)");
const result=spawnSync("npx",[
  "--no-install","remotion","render","src/index.tsx","DomSoucyCapsuleHD",output,
  "--props="+manifestFile,"--codec=h264","--crf=18","--concurrency=2",
],{cwd:root,stdio:"inherit"});
if(result.error)abort("Impossible d'exécuter Remotion : "+result.error.message);
if(result.status!==0)abort("Le rendu Remotion a échoué (code "+result.status+").");
console.log("\nCAPSULE TERMINÉE : "+output);
