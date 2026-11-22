export const capsuleModels = [
  { id: 1, title: "La question du journaliste", en: "Journalist question", type: "journalist" },
  { id: 2, title: "La réponse percutante", en: "Strong answer", type: "statement" },
  { id: 3, title: "Le face-à-face", en: "Face to face", type: "journalist" },
  { id: 4, title: "La citation choc", en: "Powerful quote", type: "statement" },
  { id: 5, title: "L’argument visuel", en: "Visual argument", type: "analysis" },
  { id: 6, title: "La question de la communauté", en: "Community question", type: "community" },
  { id: 7, title: "La rafale de questions", en: "Rapid-fire questions", type: "journalist" },
  { id: 8, title: "Les trois arguments", en: "Three arguments", type: "analysis" },
  { id: 9, title: "Le teaser d’épisode", en: "Episode teaser", type: "teaser" },
  { id: 10, title: "Le débat : deux perspectives", en: "Debate: two perspectives", type: "debate" },
  { id: 11, title: "La réflexion personnelle", en: "Personal reflection", type: "reflection" },
  { id: 12, title: "La couverture signature", en: "Signature cover", type: "cover" },
] as const;
export type CapsuleId = (typeof capsuleModels)[number]["id"];
export const formats = ["16:9", "9:16", "1:1"] as const;
export function capsuleById(id: number) {
  return capsuleModels.find((item) => item.id === id);
}
