"use client";
import type { MouseEvent, ReactNode } from "react";

/** A real anchor remains usable without JavaScript; repeat activation also restores focus. */
export function PilotThumbnailLink({
  href,
  className,
  label,
  children,
}: {
  href: string;
  className: string;
  label: string;
  children: ReactNode;
}) {
  function follow(event: MouseEvent<HTMLAnchorElement>) {
    if (
      href !== "#pilote" ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
    const player = document.getElementById("pilote");
    if (!player) return;
    event.preventDefault();
    if (location.hash !== href) history.pushState(null, "", href);
    player.focus({ preventScroll: true });
    player.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }
  return (
    <a
      href={href}
      className={className}
      aria-label={label}
      aria-controls={href === "#pilote" ? "pilote" : undefined}
      onClick={follow}
    >
      {children}
    </a>
  );
}
