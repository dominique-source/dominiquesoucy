/** Local-only multicamera edit decision list (EDL). No remote file storage. */
export type SourceKey = "audio" | "enhanced" | "main" | "vertical" | "secondary";
export type SourceFiles = Partial<Record<SourceKey, File>>;
export type CameraKey = Exclude<SourceKey, "audio" | "enhanced">;
export const cameraKeys: CameraKey[] = ["main", "vertical", "secondary"];
export const labels: Record<SourceKey, string> = {
  audio: "Audio original", enhanced: "Audio optimisé / voix", main: "Canon / principale",
  vertical: "iPhone / verticale", secondary: "Samsung / secondaire",
};
export type Cut = { id: string; at: number; camera: CameraKey };
export function sourceTime(projectTime: number, offset: number) {
  return Math.max(0, projectTime + offset);
}
export function offsetFromClap(referenceTime: number, sourceClap: number) {
  return sourceClap - referenceTime;
}
export function timeCode(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`;
}
export function activeCamera(cuts: Cut[], time: number, fallback: CameraKey): CameraKey {
  return cuts.filter(c => c.at <= time).sort((a,b) => b.at - a.at)[0]?.camera || fallback;
}
export function safeCutTime(value: number, duration: number) {
  return Math.round(Math.min(Math.max(value,0),Math.max(0,duration))*10)/10;
}
export function edl({
  projectName, duration, offsets, cuts, sourceNames, audioSource
}: {
  projectName: string; duration: number;
  offsets: Record<SourceKey,number>;
  cuts: Cut[]; sourceNames: Partial<Record<SourceKey,string>>;
  audioSource: SourceKey;
}) {
  return {
    format: "DOM_SOUCY_LOCAL_MULTICAM_EDL_V1",
    status: "PREVIEW_ONLY_NOT_RENDERED",
    projectName: projectName.slice(0,100),
    durationSeconds: duration,
    offsetsSeconds: offsets,
    audioSource,
    sources: sourceNames,
    cuts: [...cuts].sort((a,b)=>a.at-b.at).map(c=>({atSeconds:c.at,camera:c.camera})),
    notes: "Offsets are manually aligned by clap; files stay on the operator's computer. This JSON does not contain media and is not a video.",
  };
}
