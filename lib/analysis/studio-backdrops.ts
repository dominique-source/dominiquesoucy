/** Approved DOM SOUCY MEDIA cinematic studio wall catalogue.
 * The image paths are assets from the existing original designs.
 * Only list a background once the matching file is checked into public/.
 */
export const studioBackgrounds=[
 {id:"basketball",label:"Basketball",sport:"basketball",file:"/assets/studio/backdrops/basketball.webp",words:["basket","nba","basketball","ballers","panier","duke"]},
 {id:"athletisme",label:"Athlétisme",sport:"athletics",file:"/assets/studio/backdrops/athletisme.webp",words:["athlétisme","athlete","athlète","course","sprinter","sprint","running","olympique","olympics","piste"]},
 {id:"hockey",label:"Hockey",sport:"hockey",file:"/assets/studio/backdrops/hockey.webp",words:["hockey","nhl","lnh","patin","glace","canadien","puck"]},
 {id:"soccer",label:"Soccer",sport:"soccer",file:"/assets/studio/backdrops/soccer.webp",words:["soccer","football européen","fifa","futbol","soccer ball","mbappé","coupe du monde"]},
 {id:"tennis",label:"Tennis",sport:"tennis",file:"/assets/studio/backdrops/tennis.webp",words:["tennis","atp","wta","raquette","roland garros","wimbledon"]},
 {id:"football",label:"Football américain",sport:"football",file:"/assets/studio/backdrops/football.webp",words:["football américain","football americain","nfl","cfl","lcf","touchdown","rouge et or"]},
] as const;
export type BackdropId=(typeof studioBackgrounds)[number]["id"];
export type BackdropMode="random"|"manual"|"topic";
export const studioBackdropIds=studioBackgrounds.map(x=>x.id) as [BackdropId,...BackdropId[]];
export function backdropById(id:string){return studioBackgrounds.find(x=>x.id===id)||studioBackgrounds[0]}
const hash=(s:string)=>{let h=2166136261;for(const c of s){h=Math.imul(h^c.charCodeAt(0),16777619)}return h>>>0};
/** Deterministic randomness: switching between editor, browser and export never changes the selected background. */
export function randomBackdrop(seed:string){return studioBackgrounds[hash(seed)%studioBackgrounds.length]}
export function detectSportsBackdrop(text:string){
 const lower=text.toLocaleLowerCase("fr-CA");
 let winner:{id:BackdropId;score:number}|null=null;
 for(const item of studioBackgrounds){
  let score=0;
  for(const word of item.words){
   const needle=word.toLocaleLowerCase("fr-CA");
   if(lower.includes(needle))score+=needle.length>=8?3:2;
  }
  if(score>0&&(!winner||score>winner.score))winner={id:item.id,score};
 }
 return winner?.id||null;
}
export function resolveBackdrop(settings:{mode:BackdropMode;selectedId:BackdropId},seed:string,text:string){
 if(settings.mode==="manual")return backdropById(settings.selectedId);
 if(settings.mode==="topic"){
  const found=detectSportsBackdrop(text);
  return found?backdropById(found):randomBackdrop(seed);
 }
 return randomBackdrop(seed);
}
