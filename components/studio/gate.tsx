"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export function StudioGate({ lang }: { lang: "fr" | "en" }) {
  const fr = lang === "fr";
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = e.currentTarget;
    try {
      const r = await fetch("/api/studio/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: new FormData(form).get("code") }),
      });
      if (r.ok) {
        form.reset();
        router.refresh();
      } else
        setError(
          r.status === 429
            ? fr
              ? "Trop de tentatives. Réessaie dans 15 minutes."
              : "Too many attempts. Try again in 15 minutes."
            : r.status === 503
              ? fr
                ? "L’accès privé attend sa configuration serveur."
                : "Private access requires server configuration."
              : fr
                ? "Code incorrect."
                : "Incorrect code.",
        );
    } catch {
      setError(
        fr
          ? "Connexion interrompue. Réessaie."
          : "Connection lost. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="studio-gate">
      <div className="studio-access">
        <p className="studio-kicker">DOMINIQUE SOUCY / STUDIO PRIVÉ</p>
        <span className="studio-mic" aria-hidden="true">
          ◉
        </span>
        <h1>
          {fr ? "CONFÉRENCE DE PRESSE" : "PRESS CONFERENCE"}
          <em>LIVE.</em>
        </h1>
        <p>
          {fr
            ? "Un homme. Cinq journalistes virtuels. La parole reste à toi."
            : "One man. Five virtual journalists. You keep the floor."}
        </p>
        <form onSubmit={submit}>
          <label htmlFor="studio-code">
            {fr ? "Code d’accès privé" : "Private access code"}
          </label>
          <input
            id="studio-code"
            name="code"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            required
            maxLength={16}
            aria-describedby="studio-gate-error"
          />
          <button disabled={busy}>
            {busy ? "…" : fr ? "ENTRER DANS LE STUDIO →" : "ENTER THE STUDIO →"}
          </button>
          <p id="studio-gate-error" role="alert">
            {error}
          </p>
        </form>
        <p className="studio-muted">
          {fr
            ? "Accès réservé. Aucun microphone activé sur cet écran."
            : "Private access. No microphone is activated on this screen."}
        </p>
      </div>
      <div className="studio-gate-art" aria-hidden="true">
        <span>DS / 01</span>
        <div className="studio-bars">
          {Array.from({ length: 25 }, (_, i) => (
            <i key={i} style={{ height: `${12 + ((i * 37) % 100)}px` }} />
          ))}
        </div>
        <p>SPORT / SOCIÉTÉ / HUMAIN</p>
      </div>
    </section>
  );
}
