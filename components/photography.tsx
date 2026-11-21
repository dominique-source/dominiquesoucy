import Image from "next/image";
import type { CSSProperties } from "react";
import { photograph, type PhotoId } from "@/lib/photography";
import type { Locale } from "@/lib/i18n";
import { Reveal } from "./reveal";
type Props = {
  photo: PhotoId;
  lang: Locale;
  src?: string;
  alt?: string;
  position?: string;
  ratio?: string;
  fit?: "contain" | "cover";
  caption?: string;
  credit?: string;
  variant?: "original" | "vintage";
  background?: "dark" | "light" | "lime";
  className?: string;
  priority?: boolean;
};
/** Originals stay untouched. Dimensions reserve the frame before next/image loads. */
export function PhotoWithCaption({
  photo,
  lang,
  src,
  alt,
  position = "50% 50%",
  ratio,
  fit = "contain",
  caption,
  credit,
  variant = "original",
  background = "dark",
  className = "",
  priority = false,
}: Props) {
  const image = photograph(photo, lang, variant);
  return (
    <figure
      className={`editorial-photo photo-${background} ${className}`}
      style={
        {
          "--photo-width": `${image.width}px`,
          "--photo-ratio": ratio ?? `${image.width} / ${image.height}`,
        } as CSSProperties
      }
    >
      <div className="photo-frame">
        <Image
          src={src ?? image.src}
          alt={alt ?? image.alt}
          width={image.width}
          height={image.height}
          preload={priority}
          sizes={`(max-width: 600px) calc(100vw - 40px), ${image.width}px`}
          style={{ objectPosition: position, objectFit: fit }}
        />
      </div>
      {(caption || credit) && (
        <figcaption>
          {caption}
          {credit && <span className="photo-credit">{credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}
export function EditorialPortrait(props: Omit<Props, "photo">) {
  return <PhotoWithCaption {...props} photo="02_portrait_chemise_bleue" />;
}
export function ArchivePhoto(props: Props) {
  return <PhotoWithCaption {...props} />;
}
export function PhotoStorySection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <Reveal className={`photo-story ${className}`}>{children}</Reveal>;
}
