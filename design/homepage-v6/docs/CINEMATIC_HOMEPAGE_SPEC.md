# Homepage — Cinematic Editorial Collage (design source of truth)

## Do not redesign the page

Preserve the existing navigation, main hero messaging, CTA buttons, far-right biography sidebar, and photographic panel below the hero. Fill the empty middle-right HERO zone with an authentic photographic / cinematic motion collage closely resembling the visual reference. Keep portrait/hero collage from covering heading and CTA. Use black #0A0A0A, off-white #F4F4EF, lime #CCFF00.

## Layered layout

- Layer A: background near-black with subtle film grain and gradients.
- Layer B: large archival basketball photography in monochrome, low opacity (~0.10–0.35), plus accurate crop.
- Layer C: a dominant, real modern portrait of Dominique; allow overlap and soft masked edges. Existing blue-shirt source is a temporary alternative but is too low-resolution for a large sharp hero.
- Layer D: other real authorized images, cropped as documentary tiles, with small luminous lime corners and gentle masks. Keep hierarchy; not a noisy wall of thumbnails.
- Layer E: sparse lime annotations, cursor-reactive microinteraction, optional unobtrusive progress indicator (must not display invented episode durations).
- Preserve the original right sidebar portrait and basketball card, as well as the section below the hero.

## Interaction and motion

- First visit: no autoplay audio. Option A: low-opacity rapid montage of authorized photos with 0.4–1.2s holds then fade to calm 3–5s loop. Avoid strobe/flashes and rapidly flashing alternating patterns. Option B: calm collage with mouse hover image focus and restrained parallax (max ~8–14px), event-friendly touch tap, keyboard focus states.
- Staccato cut effect should be used very sparingly; once on arrival or a hover, never perpetual frantic changes. Do not make images follow cursor aggressively.
- `prefers-reduced-motion`: all imagery fixed and readable, animations off.
- Mobile: static poster-first composite or minimal motion, portrait legible, avoid overflow, preserve CTA.
- Fast initial load: poster image / Next image, lazy load secondary media. No external autoplay YouTube iframe behind the text.
- If future video loops are desired, use web-optimized short MP4/WebM clips from licensed / original footage with poster and fallback.

## Genuine photography

Do not generate or modify facial features. Transparent cutouts are provisional and may be visually wrong. Prefer originals. No synthetic political/cultural scene should be passed off as authentic reportage. Clear editorial captions and credits.

## Note

The AI mockup is a _design comp_ and is not a functional webpage, video or a source of real photo assets. Distinct JSX/CSS layers are required to reproduce it.
