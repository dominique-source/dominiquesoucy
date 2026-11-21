"use client";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

export function StudioUniverseMotion({
  children,
  motion,
}: {
  children: ReactNode;
  motion: { enabled: boolean; durationMs: number; parallaxPx: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (
      !element ||
      !motion.enabled ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 901px) and (pointer: fine)");
    let visible = false;
    let frame = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      element.style.removeProperty("--studio-parallax");
      if (reduced.matches) element.classList.remove("studio-universe-pending");
    };
    const update = () => {
      if (!visible || reduced.matches || !desktop.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const travel =
          (innerHeight / 2 - rect.top - rect.height / 2) /
          ((innerHeight + rect.height) / 2);
        const offset =
          Math.max(-1, Math.min(1, travel)) * Math.min(motion.parallaxPx, 8);
        element.style.setProperty("--studio-parallax", `${offset}px`);
      });
    };
    if (!reduced.matches) element.classList.add("studio-universe-pending");
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          element.classList.remove("studio-universe-pending");
          update();
        }
      },
      { threshold: 0.08 },
    );
    observer.observe(element);
    window.addEventListener("scroll", update, { passive: true });
    reduced.addEventListener("change", reset);
    desktop.addEventListener("change", reset);
    return () => {
      observer.disconnect();
      reset();
      window.removeEventListener("scroll", update);
      reduced.removeEventListener("change", reset);
      desktop.removeEventListener("change", reset);
    };
  }, [motion.enabled, motion.durationMs, motion.parallaxPx]);
  return (
    <div
      ref={ref}
      className="studio-universe-motion"
      style={{ "--studio-duration": `${motion.durationMs}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
