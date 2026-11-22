import { notFound } from "next/navigation";
export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export function locale(value: string): Locale {
  if (value !== "fr" && value !== "en") notFound();
  return value;
}
export const sections = [
  "reflexions",
  "observations",
  "sport-culture",
  "societe",
] as const;
export type Section = (typeof sections)[number];
export const dictionaries = {
  fr: {
    nav: {
      reflexions: "Réflexions",
      observations: "Observations",
      "sport-culture": "Sport & culture",
      societe: "Société",
      questions: "Boîte à questions",
      "a-propos": "À propos",
    },
    eyebrow: "Sport / Société / Humain",
    positioning: "Le sport comme miroir de la société.",
    mission: "Faire réfléchir avant de faire réagir.",
    explore: "Explorer les réflexions",
    discover: "Découvrir Dominique",
    latest: "Dernière réflexion",
    all: "Tout explorer",
    soon: "La suite s’écrit ici.",
    empty:
      "Les premières publications arrivent bientôt. Un espace pour prendre du recul, regarder autrement et ouvrir la discussion.",
    noTranslation: "Ce contenu n’est pas encore disponible en français.",
    original: "Lire la version originale",
    read: "Lire la réflexion",
    watch: "Voir la vidéo",
    photo: "Photographie",
    text: "Texte",
    video: "Vidéo",
    thought: "The Thought",
    menu: "Ouvrir le menu",
    close: "Fermer le menu",
    skip: "Aller au contenu",
    home: "Accueil",
    back: "Retour aux publications",
    about: "Le parcours. Le regard.",
    person: "Derrière le regard, un parcours.",
    bio: "Ancien joueur canadien de basketball de haut niveau, entrepreneur et créateur de PürInstinct, Dominique Soucy s’intéresse au sport comme force culturelle et sociale.",
    bio2: "Cet espace réunit ses réflexions sur le sport, la société et les comportements humains. Un lieu pour questionner les évidences et faire une place à la discussion.",
    bridge: "Le jeu dépasse le terrain.",
    bridgeBody:
      "PürInstinct explore le sport, l’expression humaine, la communauté et de nouvelles expériences. Un projet fondé par Dominique Soucy, dans le prolongement de son regard sur le monde.",
    project: "Découvrir PürInstinct",
    relationship: "Créateur de PürInstinct Worldwide",
    legal: "Avis légaux et confidentialité : textes en préparation.",
    unavailable: "Cette page n’existe pas ou n’est plus disponible.",
    notFound: "Hors du terrain.",
    allCategories: "Tous les sujets",
    categories: {
      sport: "Sport & culture",
      societe: "Société",
      humain: "Humain",
    },
    descriptions: {
      reflexions: "Prendre le temps. Aller au fond des choses.",
      observations: "Sur le vif. Sans détour.",
      "sport-culture": "Ce que le sport raconte de nous.",
      societe: "Questionner ce qui nous semble évident.",
    },
    subjects:
      "Éducation · Dépenses publiques · Institutions · Infrastructures · Comportements humains · Vie communautaire",
    signature: "Une série d’observations sur la société",
    rights: "Tous droits réservés.",
    portrait: "Espace portrait — photographie à venir",
    formats: "Un regard. Plusieurs formats.",
    formatLong:
      "Des réflexions en profondeur. Le temps de développer une idée.",
    formatShort: "Des images, des réactions et des idées saisies sur le vif.",
    formatThought: "Une idée courte. Une invitation à poursuivre la réflexion.",
    consent: "Charger la vidéo externe",
    privacyVideo:
      "La lecture connecte votre navigateur à l’hébergeur de la vidéo.",
    captions:
      "Les sous-titres sont accessibles dans le lecteur lorsqu’ils sont fournis.",
    signatureUnavailable:
      "La signature de cette série est disponible dans sa version française originale.",
    share: "Formats éditoriaux",
  },
  en: {
    nav: {
      reflexions: "Reflections",
      observations: "Observations",
      "sport-culture": "Sport & culture",
      societe: "Society",
      questions: "Question box",
      "a-propos": "About",
    },
    eyebrow: "Sport / Society / Human",
    positioning: "Sport as a mirror of society.",
    mission: "Inspiring thought before reaction.",
    explore: "Explore reflections",
    discover: "Meet Dominique",
    latest: "Latest reflection",
    all: "Explore all",
    soon: "The next chapter starts here.",
    empty:
      "The first publications are coming soon. A space to step back, see differently and open a conversation.",
    noTranslation: "This content is not yet available in English.",
    original: "Read the original version",
    read: "Read the reflection",
    watch: "Watch the video",
    photo: "Photography",
    text: "Text",
    video: "Video",
    thought: "The Thought",
    menu: "Open menu",
    close: "Close menu",
    skip: "Skip to content",
    home: "Home",
    back: "Back to publications",
    about: "The journey. The perspective.",
    person: "A journey behind the perspective.",
    bio: "A former high-level Canadian basketball player, entrepreneur and creator of PürInstinct, Dominique Soucy explores sport as a cultural and social force.",
    bio2: "This space brings together his reflections on sport, society and human behaviour. A place to question assumptions and make room for conversation.",
    bridge: "The game goes beyond the court.",
    bridgeBody:
      "PürInstinct explores sport, human expression, community and new experiences. Founded by Dominique Soucy, it extends his perspective on the world.",
    project: "Explore PürInstinct",
    relationship: "Creator of PürInstinct Worldwide",
    legal: "Legal and privacy notices: texts in preparation.",
    unavailable: "This page does not exist or is no longer available.",
    notFound: "Out of bounds.",
    allCategories: "All topics",
    categories: {
      sport: "Sport & culture",
      societe: "Society",
      humain: "Human",
    },
    descriptions: {
      reflexions: "Take the time. Go beneath the surface.",
      observations: "In the moment. Straight to the point.",
      "sport-culture": "What sport tells us about ourselves.",
      societe: "Question what we take for granted.",
    },
    subjects:
      "Education · Public spending · Institutions · Infrastructure · Human behaviour · Community life",
    signature: "A series of observations on society",
    rights: "All rights reserved.",
    portrait: "Portrait space — photography to come",
    formats: "One perspective. Many formats.",
    formatLong: "In-depth reflections. The time to develop an idea.",
    formatShort: "Images, reactions and ideas captured in the moment.",
    formatThought: "A short idea. An invitation to keep thinking.",
    consent: "Load external video",
    privacyVideo:
      "Playback connects your browser to the video hosting provider.",
    captions: "Captions are available in the player when provided.",
    signatureUnavailable:
      "This series signature is available in its original French version.",
    share: "Editorial formats",
  },
} as const;
export const dict = (lang: Locale) => dictionaries[lang];
