import {defaultChroma} from "./chroma-key";
import {cameraKeys,proposeMulticamCuts} from "./multicam";
import {findQuotedRange,toProjectRange} from "./timed-excerpts";
import type {StudioProject} from "./project";

type Capsule=StudioProject["capsules"][number];

/** Build only unmatched proposals from genuine AI analysis excerpts.
 * Excerpts with no reliable timestamps remain invalid and require manual review.
 * Repeat clicks never duplicate a proposed capsule.
 */
export function createDraftsFromAnalysis(project:StudioProject):Capsule[]{
  const moments=project.analysis?.moments||[];
  const existing=new Set(project.capsules.map(c=>c.title.trim().toLocaleLowerCase("fr-CA")));
  const slots=Math.max(0,40-project.capsules.length);
  if(!slots||!moments.length)return [];
  const available=cameraKeys.filter(k=>!!project.localMedia?.[k]||!!project.media[k]);
  const primary=available.includes("main")?"main":available[0];
  return moments
    .filter(m=>!existing.has(m.title.trim().toLocaleLowerCase("fr-CA")))
    .slice(0,slots)
    .map(m=>{
      const audioRange=findQuotedRange(m.excerpt,project.timedWords);
      const range=audioRange?toProjectRange(audioRange,project.timeline.offsets.audio,
        Math.max(project.timeline.duration,project.timedWords.at(-1)?.end||0)):null;
      const cameraCuts=range&&available.length?proposeMulticamCuts({
        start:range.start,end:range.end,available,primary,
      }):undefined;
      return {
        id:crypto.randomUUID(),title:m.title.slice(0,100),
        start:range?.start??0,end:range?.end??0,
        timingSource:range?"automatic" as const:"unmatched" as const,
        cameraCuts,cameraEditSource:cameraCuts?"automatic" as const:undefined,
        format:project.format,
        style:m.model_id===11?"editorial" as const:m.model_id===4?"quote" as const:"conversation" as const,
        caption:m.excerpt.slice(0,500),bubble:m.model_id===1?m.excerpt.slice(0,160):"",
        journalistName:"",journalistOutlet:"",questionAttribution:"reconstructed" as const,
        background:"dark" as const,keying:{...defaultChroma},
        textPosition:"bottom" as const,status:"draft" as const,review:"pending" as const,
      };
    });
}
