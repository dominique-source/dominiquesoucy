"use client";
import Image from "next/image";
import { useId, type CSSProperties } from "react";
import type { Locale } from "@/lib/i18n";
import { dict } from "@/lib/i18n";
import type { CinematicPosterConfig } from "@/lib/homepage-media";

export function CinematicVideoPoster({
  config,
  lang,
  onPlay,
}: {
  config: CinematicPosterConfig;
  lang: Locale;
  onPlay: () => void;
}) {
  const noteId = useId();
  return (
    <>
      <button
        className="cinematic-video-poster"
        type="button"
        onClick={onPlay}
        aria-label={config.playLabel[lang]}
        aria-describedby={noteId}
        style={
          {
            "--poster-position": config.position.desktop,
            "--poster-mobile-position": config.position.mobile,
          } as CSSProperties
        }
      >
        <Image
          src={config.src}
          alt={config.alt[lang]}
          fill
          sizes="(max-width: 600px) 90vw, 420px"
          loading="lazy"
          className="cinematic-poster-image"
        />
        <span className="cinematic-poster-shade" aria-hidden="true" />
        <span className="cinematic-poster-name" aria-hidden="true">
          DOMINIQUE
          <br />
          SOUCY<span>.</span>
        </span>
        <span className="cinematic-poster-play" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="32" height="32">
            <path d="M8 4 21 12 8 20Z" fill="currentColor" />
          </svg>
        </span>
        <span className="cinematic-poster-copy" aria-hidden="true">
          <strong>{config.title[lang]}</strong>
          <span>{config.episode[lang]}</span>
          <small>{dict(lang).mission}</small>
        </span>
      </button>
      <span id={noteId} className="poster-accessibility-note">
        {config.providerNotice[lang]}
      </span>
    </>
  );
}
