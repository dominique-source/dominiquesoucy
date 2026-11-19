"use client";
import { useState } from "react";
import { videoSource } from "@/lib/video";
import { dict, type Locale } from "@/lib/i18n";
export function VideoPlayer({
  url,
  title,
  lang,
  captions,
}: {
  url: string;
  title: string;
  lang: Locale;
  captions?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const source = videoSource(url);
  const d = dict(lang);
  if (!source) return null;
  if (source.kind === "file")
    return (
      <div>
        <video
          className="video-player"
          controls
          preload="metadata"
          playsInline
          aria-label={title}
        >
          {/* Approved caption file is optional until supplied by the publisher. */}
          <source src={source.src} />
          {captions && (
            <track
              kind="captions"
              src={captions}
              srcLang={lang}
              label={lang === "fr" ? "Français" : "English"}
              default
            />
          )}
        </video>
        <p className="small muted">{d.captions}</p>
      </div>
    );
  return (
    <div>
      {loaded ? (
        <iframe
          className="video-player"
          src={source.src}
          title={title}
          allow="fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="video-placeholder">
          <span aria-hidden="true" className="play-symbol">
            ▷
          </span>
          <button className="button" onClick={() => setLoaded(true)}>
            {d.consent}
          </button>
          <p>{d.privacyVideo}</p>
        </div>
      )}
    </div>
  );
}
