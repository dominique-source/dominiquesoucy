"use client";
import { useState } from "react";
import { StudioDashboard } from "./dashboard";

type Props = { lang: "fr" | "en"; provider: boolean; expires: number };
export function StudioWorkspace(props: Props) {
  const [opened, setOpened] = useState(false);
  const fr = props.lang === "fr";
  return (
    <div className="studio-workspace">
      <nav className="studio-workspace-nav" aria-label={fr ? "Navigation du studio" : "Studio navigation"}>
        <span className="studio-workspace-brand">DOM SOUCY <b>STUDIO</b></span>
        {opened && <button type="button" onClick={() => setOpened(false)}>{fr ? "Accueil du Studio" : "Studio home"}</button>}
      </nav>
      {!opened ? (
        <main className="studio-workspace-home">
          <p className="studio-workspace-eyebrow">STUDIO / 05</p>
          <h1>{fr ? "QU’EST-CE QU’ON CRÉE AUJOURD’HUI ?" : "WHAT ARE WE CREATING TODAY?"}</h1>
          <p className="studio-workspace-intro">{fr ? "Un espace pour préparer, enregistrer et reprendre tes productions. Les outils de conférence et de montage existants restent accessibles." : "A space to prepare, record and resume your productions. Existing conference and editing tools remain available."}</p>
          <div className="studio-workspace-actions">
            <button type="button" className="studio-workspace-primary" onClick={() => setOpened(true)}>
              <span>01</span><strong>{fr ? "OUVRIR LE STUDIO" : "OPEN STUDIO"}</strong>
              <small>{fr ? "Enregistrement, conférence et production" : "Recording, conference and production"}</small>
            </button>
            <button type="button" onClick={() => setOpened(true)}>
              <span>02</span><strong>{fr ? "REPRENDRE UNE SÉANCE" : "RESUME A SESSION"}</strong>
              <small>{fr ? "Retrouver les données récupérables dans les outils existants" : "Find recoverable data in existing tools"}</small>
            </button>
          </div>
          <p className="studio-workspace-note">{fr ? "Les fonctions avancées restent dans le Studio. Aucun nouveau traitement n’est lancé depuis cet accueil." : "Advanced functions remain in the Studio. This home screen does not start processing."}</p>
        </main>
      ) : <StudioDashboard {...props} />}
    </div>
  );
}
