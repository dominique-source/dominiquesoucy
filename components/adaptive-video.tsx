import type { CSSProperties } from "react";
import { videoSource } from "@/lib/video";
import {
  localVideoPoster,
  videoRatios,
  type VideoOrientation,
  type VideoLayout,
} from "@/lib/video-layout";
import type { Locale } from "@/lib/i18n";
import type { CinematicPosterConfig } from "@/lib/homepage-media";
import { VideoPlayer } from "./video-player";
export type AdaptiveVideoProps = {
  videoUrl: string;
  orientation?: VideoOrientation;
  poster?: string | null;
  title: string;
  captions?: string;
  layout?: VideoLayout;
  lang?: Locale;
  cinematicPoster?: CinematicPosterConfig;
};
export function AdaptiveVideo({
  videoUrl,
  orientation = "landscape",
  poster,
  title,
  captions,
  layout = "article",
  lang = "fr",
  cinematicPoster,
}: AdaptiveVideoProps) {
  if (!videoSource(videoUrl)) return null;
  return (
    <div
      className={`adaptive-video adaptive-video--${orientation} adaptive-video--${layout}`}
      data-orientation={orientation}
      data-layout={layout}
      style={
        { "--video-aspect-ratio": videoRatios[orientation] } as CSSProperties
      }
    >
      <VideoPlayer
        key={videoUrl}
        url={videoUrl}
        title={title}
        lang={lang}
        captions={captions}
        poster={localVideoPoster(poster)}
        cinematicPoster={cinematicPoster}
      />
    </div>
  );
}
