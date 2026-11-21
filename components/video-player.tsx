"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { videoSource } from "@/lib/video";
import { localVideoPoster } from "@/lib/video-layout";
import { CinematicVideoPoster } from "./cinematic-video-poster";
import type { CinematicPosterConfig } from "@/lib/homepage-media";
import { activatedEmbedUrl } from "@/lib/video";
import { dict, type Locale } from "@/lib/i18n";
export function VideoPlayer({
  url,
  title,
  lang,
  captions,
  poster,
  cinematicPoster,
}: {
  url: string;
  title: string;
  lang: Locale;
  captions?: string;
  poster?: string;
  cinematicPoster?: CinematicPosterConfig;
}) {
  const [activatedUrl, setActivatedUrl] = useState<string | null>(null);
  const loaded = activatedUrl === url;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (loaded) (iframeRef.current ?? fileRef.current)?.focus();
  }, [loaded]);
  const source = videoSource(url);
  const d = dict(lang);
  const approvedPoster = localVideoPoster(poster);
  if (!source) return null;
  return (
    <div className="video-player-shell">
      <div className="video-frame">
        {cinematicPoster?.visible && !loaded ? (
          <CinematicVideoPoster
            config={cinematicPoster}
            lang={lang}
            onPlay={() => setActivatedUrl(url)}
          />
        ) : source.kind === "file" ? (
          <video
            ref={fileRef}
            tabIndex={0}
            className="video-player"
            controls
            preload="none"
            playsInline
            autoPlay={
              loaded && cinematicPoster?.autoplayOnActivate ? true : undefined
            }
            aria-label={title}
            poster={approvedPoster}
          >
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
        ) : loaded ? (
          <iframe
            ref={iframeRef}
            className="video-player"
            src={activatedEmbedUrl(
              source.src,
              !!cinematicPoster?.autoplayOnActivate,
            )}
            title={title}
            loading="lazy"
            allow={`${cinematicPoster?.autoplayOnActivate ? "autoplay; " : ""}fullscreen; picture-in-picture; encrypted-media`}
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div
            className={`video-placeholder ${approvedPoster ? "has-poster" : ""}`}
          >
            {approvedPoster ? (
              <Image
                className="video-poster"
                src={approvedPoster}
                alt=""
                fill
                sizes="(max-width: 600px) 100vw, 60vw"
                loading="lazy"
                style={{ objectFit: "contain" }}
              />
            ) : (
              <span aria-hidden="true" className="adaptive-monogram">
                DS<span>.</span>
              </span>
            )}
            <div className="video-activation">
              <button
                className="button"
                onClick={() => setActivatedUrl(url)}
                aria-label={`${d.consent} — ${title}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  aria-hidden="true"
                  fill="currentColor"
                >
                  <path d="M7 3v18l15-9z" />
                </svg>
                {d.consent}
              </button>
              <p>{d.privacyVideo}</p>
            </div>
          </div>
        )}
      </div>
      {source.kind === "file" && (
        <p className="video-caption-note small muted">{d.captions}</p>
      )}
    </div>
  );
}
