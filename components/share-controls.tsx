"use client";
import { useState } from "react";
import { brand } from "@/lib/brand-copy";
import type { Locale } from "@/lib/i18n";
export function ShareControls({
  title,
  url,
  lang,
}: {
  title: string;
  url: string;
  lang: Locale;
}) {
  const b = brand(lang);
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState(false);
  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setMessage(b.copied);
      setFallback(false);
    } catch {
      setMessage(b.copyError);
      setFallback(true);
    }
  }
  async function share() {
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({ title, url });
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage(b.shareError);
      setFallback(true);
    }
  }
  return (
    <div className="share-controls">
      <div className="share-buttons">
        <button className="button" onClick={share}>
          {b.share}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M12 16V3m-4 4 4-4 4 4M5 13v7h14v-7" />
          </svg>
        </button>
        <button className="text-link" onClick={copy}>
          {b.copyLink}
        </button>
      </div>
      <p role="status" aria-live="polite" className="small">
        {message}
      </p>
      {fallback && (
        <label className="share-fallback">
          {b.link}
          <input
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      )}
    </div>
  );
}
