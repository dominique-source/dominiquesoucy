"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { capsuleModels, capsuleById, formats } from "@/lib/analysis/catalog";
import type { AnalysisResult } from "@/lib/analysis/schema";
import { MediaImport } from "@/components/analysis/media-import";

type AnalysisResponse = AnalysisResult & { original_count: number; notice: string };
const MAX_TRANSCRIPT = 26000;

export function AnalysisStudio({ lang }: { lang: "fr" | "en" }) {
  const fr = lang === "fr";
  const [transcript, setTranscript] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [selected, setSelected] = useState(0);
  const [format, setFormat] = useState<"16:9" | "9:16" | "1:1">("9:16");
  const inputFile = useRef<HTMLInputElement>(null);
  const [importedLive, setImportedLive] = useState(false);
  const [importWarning, setImportWarning] = useState(false);
  useEffect(() => {
    // Voluntary handoff from the completed live session, within the same tab.
    // Clear immediately after reading; no persistence in the site's backend.
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem("ds-studio-pending-analysis");
      sessionStorage.removeItem("ds-studio-pending-analysis");
    } catch {
      return;
    }
    if (!pending) return;
    setTranscript(pending.slice(0, MAX_TRANSCRIPT));
    setImportedLive(true);
    setImportWarning(pending.length >= MAX_TRANSCRIPT);
  }, []);


  async function loadFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > 150000 || !/\.(txt|srt|vtt)$/i.test(file.name)) {
      setError(fr ? "Importe une transcription .txt, .srt ou .vtt de moins de 150 Ko." : "Import a .txt, .srt or .vtt transcript under 150 KB.");
      return;
    }
    const text = await file.text();
    if (text.length > MAX_TRANSCRIPT) {
      setError(fr ? "La transcription dépasse 26 000 caractères. Réduis-la avant l’analyse." : "Transcript exceeds 26,000 characters.");
      return;
    }
    setTranscript(text);
    setResult(null);
  }

  async function analyze() {
    if (!consent || transcript.trim().length < 100 || transcript.length > MAX_TRANSCRIPT) return;
    setPending(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, lang, transcript }),
      });
      if (!response.ok) {
        setError(response.status === 401 ? (fr ? "Session expirée : reconnecte-toi." : "Session expired: sign in again.") :
          response.status === 429 ? (fr ? "Trop d’analyses rapprochées : réessaie plus tard." : "Rate limit reached: try again later.") :
          fr ? "Analyse indisponible. Vérifie la configuration IA et réessaie." : "Analysis unavailable. Check AI configuration.");
        return;
      }
      const value = (await response.json()) as AnalysisResponse;
      setResult(value);
      setSelected(0);
    } catch {
      setError(fr ? "Connexion interrompue. Aucune analyse sauvegardée." : "Connection lost. No analysis was saved.");
    } finally { setPending(false); }
  }

  const active = result?.moments[selected];
  const model = active ? capsuleById(active.model_id) : null;
  const exportData = result ? JSON.stringify({
    source: "Studio d’analyse — private editorial draft",
    export_date: new Date().toISOString(),
    status: "REQUIRES_REVIEW",
    format_preference: format,
    result,
  }, null, 2) : "";

  function download() {
    if (!result) return;
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dominique-soucy-analyse-privee.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <section className="analysis-studio">
    <div className="analysis-topline">
      <div className="analysis-logo">DOMINIQUE SOUCY <span>/ STUDIO VIDÉO & CONTENU</span></div>
      <Link href={`/${lang}/studio-live`}>{fr ? "RETOUR AU STUDIO LIVE" : "BACK TO LIVE STUDIO"} ↗</Link>
    </div>
    <div className="analysis-flow"><span className="done">✓ Projet</span><span className="done">✓ Importation média / texte</span><strong>03 / {fr ? "ANALYSE IA" : "AI ANALYSIS"}</strong><span>04 / {fr ? "Montage (à venir)" : "Editing (upcoming)"}</span><span>05 / {fr ? "Export vidéo (à venir)" : "Video export (upcoming)"}</span></div>
    <div className="analysis-heading">
      <div><p className="analysis-kicker">{fr ? "STUDIO PRIVÉ / PREMIÈRE VERSION" : "PRIVATE STUDIO / FIRST VERSION"}</p><h1>{fr ? "ANALYSE IA" : "AI ANALYSIS"}<em>.</em></h1><p>{fr ? "De ta transcription aux moments forts, avec une suggestion parmi nos 12 modèles approuvés." : "From transcript to highlights, mapped to your 12 approved capsule models."}</p></div>
      <div className="analysis-count"><b>12</b><span>{fr ? "MODÈLES DE CAPSULES" : "CAPSULE MODELS"}</span><small>16:9 / 9:16 / 1:1</small></div>
    </div>
    <div className="analysis-columns">
      <div className="analysis-main">
        {importedLive && <div className="analysis-handoff" role="status">
          <strong>{fr ? "TRANSCRIPTION DU STUDIO LIVE REÇUE" : "LIVE STUDIO TRANSCRIPT RECEIVED"}</strong>
          <p>{fr ? "La séance a été transférée uniquement dans cet onglet. Relis le texte et coche l’autorisation avant l’analyse IA." : "The session was transferred within this tab only. Review the text and opt in before AI analysis."}</p>
          {importWarning && <p>{fr ? "Texte limité à 26 000 caractères. Le fichier complet a été téléchargé au moment du transfert." : "Text limited to 26,000 characters. The complete file was downloaded during transfer."}</p>}
        </div>}
        <MediaImport lang={lang} consent={consent} onTranscript={(text) => { setTranscript(text); setResult(null); setSelected(0); }} />
        <div className="analysis-panel">
          <div className="analysis-panel-head"><h2>02 / {fr ? "IMPORTER UNE TRANSCRIPTION" : "IMPORT TRANSCRIPT"}</h2><span>.TXT / .SRT / .VTT</span></div>
          <p>{fr ? "Colle la transcription d’une conférence de presse, ou importe un fichier texte. Tu peux aussi importer un audio ou une vidéo ci-dessus." : "Paste a press-conference transcript or import a text file. You can also import audio or video above."}</p>
          <div className="analysis-actions">
            <button type="button" className="analysis-secondary" onClick={() => inputFile.current?.click()}>{fr ? "IMPORTER UN FICHIER TEXTE +" : "IMPORT TEXT FILE +"}</button>
            <input ref={inputFile} className="analysis-hidden" type="file" accept=".txt,.srt,.vtt,text/plain,text/vtt" onChange={loadFile} aria-label={fr ? "Importer transcription" : "Import transcript"} />
            <span>{transcript.length.toLocaleString(fr ? "fr-CA" : "en-CA")} / {MAX_TRANSCRIPT.toLocaleString(fr ? "fr-CA" : "en-CA")}</span>
          </div>
          <label htmlFor="analysis-transcript" className="analysis-label">{fr ? "TRANSCRIPTION DE LA SÉANCE" : "SESSION TRANSCRIPT"}</label>
          <textarea id="analysis-transcript" value={transcript} maxLength={MAX_TRANSCRIPT} onChange={e=>{setTranscript(e.target.value);setResult(null)}} placeholder={fr ? "Dominique : ...\nJournaliste : ...\nDominique : ..." : "Dominique: ...\nJournalist: ..."} rows={12} />
          <label className="analysis-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} /><span>{fr ? "J’autorise la transcription et l’analyse privées de mon média ou de ce texte par le fournisseur IA. Je vérifierai les citations et les faits avant toute publication." : "I authorize private AI transcription and analysis of this media or text. I will verify all quotes and facts before publication."}</span></label>
          <button className="analysis-primary" type="button" disabled={pending || !consent || transcript.trim().length < 100} onClick={analyze}>{pending ? (fr ? "ANALYSE EN COURS…" : "ANALYZING…") : (fr ? "✦ ANALYSER LA SÉANCE" : "✦ ANALYZE SESSION")}</button>
          {error && <p role="alert" className="analysis-error">{error}</p>}
          <p className="analysis-note">{fr ? "Aucune sauvegarde automatique : conserve ton fichier source. Les résultats sont privés et soumis à ta validation." : "No autosave: keep your source. Results are private and require your approval."}</p>
        </div>
        {result && <div className="analysis-panel">
          <div className="analysis-panel-head"><h2>03 / {fr ? "RÉSULTAT DE L’ANALYSE" : "ANALYSIS RESULTS"}</h2><span>{result.moments.length} {fr ? "EXTRAITS VÉRIFIÉS" : "VERIFIED EXCERPTS"}</span></div>
          <p className="analysis-synopsis">{result.synopsis}</p>
          <div className="analysis-tags">{result.themes.map((theme,i)=><span key={i}>{theme}</span>)}</div>
          {result.editorial_cautions.length>0 && <div className="analysis-cautions"><strong>{fr ? "À VÉRIFIER AVANT PUBLICATION" : "CHECK BEFORE PUBLISHING"}</strong>{result.editorial_cautions.map((item,i)=><p key={i}>{item}</p>)}</div>}
          {result.moments.length === 0 && <p>{fr ? "Aucun extrait exact confirmé dans la transcription. Reformule ou fournis une transcription plus complète." : "No exact excerpt verified. Provide a more complete transcript."}</p>}
          <div className="analysis-moment-list">{result.moments.map((m,i)=><button className={i===selected ? "selected" : ""} type="button" key={i} onClick={()=>setSelected(i)}><span>{String(i+1).padStart(2,"0")}</span><div><strong>{m.title}</strong><small>MODÈLE {String(m.model_id).padStart(2,"0")} / {capsuleById(m.model_id)?.title}</small></div><b>↗</b></button>)}</div>
          <button type="button" className="analysis-secondary" onClick={download}>{fr ? "TÉLÉCHARGER L’ANALYSE PRIVÉE (.JSON)" : "DOWNLOAD PRIVATE ANALYSIS (.JSON)"}</button>
        </div>}
      </div>
      <aside className="analysis-aside">
        <div className="analysis-panel"><div className="analysis-panel-head"><h2>{fr ? "DÉCOUPES SUGGÉRÉES" : "SUGGESTED CUTS"}</h2><span>✦ IA</span></div>
          {active && model ? <><div className="analysis-preview">
            <span className="analysis-preview-logo">DOMINIQUE SOUCY <i>/ STUDIO</i></span>
            <span className="analysis-preview-tag">MODÈLE {String(model.id).padStart(2,"0")} / 12</span>
            <h3>{model.title}</h3><blockquote>« {active.excerpt} »</blockquote>
            <span className="analysis-preview-footer">{fr ? "EXTRAIT SOURCE CONFIRMÉ · MAQUETTE TEXTUELLE" : "SOURCE EXCERPT VERIFIED · TEXT PREVIEW"}</span>
          </div><p>{active.rationale}</p></> : <div className="analysis-empty">{fr ? "Les suggestions apparaîtront ici après l’analyse. Aucun extrait fictif n’est préchargé." : "Suggestions appear here after analysis. No fabricated excerpts."}</div>}
          <h3 className="analysis-subtitle">{fr ? "FORMAT CIBLE" : "TARGET FORMAT"}</h3>
          <div className="analysis-ratios">{formats.map(f=><button type="button" key={f} className={format===f ? "active" : ""} onClick={()=>setFormat(f)}>{f}</button>)}</div>
          <p className="analysis-note">{fr ? "Le choix du format prépare le brief éditorial; il ne génère pas encore de fichier vidéo." : "Format selection prepares the editorial brief; no video file is rendered yet."}</p>
        </div>
        <div className="analysis-panel"><div className="analysis-panel-head"><h2>{fr ? "BIBLIOTHÈQUE / 12 MODÈLES" : "LIBRARY / 12 MODELS"}</h2></div><div className="analysis-library">{capsuleModels.map(m=><div key={m.id}><b>{String(m.id).padStart(2,"0")}</b><span>{fr ? m.title : m.en}</span></div>)}</div></div>
      </aside>
    </div>
  </section>;
}
