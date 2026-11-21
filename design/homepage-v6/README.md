# DOMINIQUE SOUCY — Cinematic Homepage Asset Pack

This package is intended to be unpacked **at the root of the existing Next.js repository**, without overwriting the working application.

## Contents

- `design/references/homepage-cinematic-approved-concept.png`: AI concept ONLY. Use to match composition, not as a website image.
- `design/references/user-selected-previous-concept.jpg`: screenshot supplied by the user, for visual comparison ONLY.
- `public/assets/dominique/originals/`: 7 genuine supplied photographs, not AI regenerated.
- `public/assets/dominique/vintage/`: 7 previously graded photographs.
- `public/assets/dominique/transparent/`: 7 **provisional** cutouts with potentially inaccurate edges; inspect before use.
- `public/assets/home-cinematic/archive/`: 7 monochrome non-generative image variants from originals.
- `public/assets/home-cinematic/texture/`: subtle overlay texture.
- `public/assets/home-cinematic/manifest.json`: photo inventory.
- `docs/CINEMATIC_HOMEPAGE_SPEC.md`: implementation & visual design specifications.

## Identity fidelity

DO NOT render AI-regenerated faces or cropped parts of the AI mockup in the actual production page. The large center face in the mockup is for layout direction, not a usable identity photo. The real light-blue shirt photo is low-resolution. For a large center portrait, prefer a new photo of Dominique from front or 3/4 view under diffuse light, ideally 2000px+ on the shortest side. No fabricated photo for societal events should be presented as documentary evidence.

## No video included

Motion sections, hover interactions, crossfades, and quick-cut sequences must be implemented in code using real authorized photographs / licensed footage; no working video loops are included here.

## Suggested staging

Check design at 375px / 768px / 1440px / 1920px, preserve FR/EN, existing routing, and reduced-motion alternatives. Never merge or deploy without review.
