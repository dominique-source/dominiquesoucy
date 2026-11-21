# V5 — approved homepage reference and review

`approved-reference.png` is the user-supplied composition. It is a visual reference with AI-rendered details, not a photographic asset. It is never served by the homepage and no face is extracted from it.

## Implementation

- `components/cinematic-hero.tsx`: server-rendered hero, semantic headline, real photographs, three localized actions. The primary action targets the actual pilot player and moves keyboard focus there without loading an external iframe.
- `app/homepage-v5.css`: homepage-only cinematic layers, restrained grain, monumental condensed title, Georgia editorial statement and italic mission, lime play action and fine rules. Navigation refinements are scoped to pages containing the new hero. Other editorial pages retain their V4 design.
- `components/premium-editorial.tsx`: an addressable, focusable `#pilote` player group. AdaptiveVideo and all source ratios remain unchanged.
- `app/[lang]/page.tsx`, `app/layout.tsx`: connect the hero and its stylesheet.
- `vercel.json`: disables automatic Git deployments for `codex/homepage-premium-v5`; this is a review-only branch.

## Authentic source photographs

1. `/assets/dominique/originals/02_portrait_chemise_bleue.jpg` — foreground, original 447 × 447 file. Its source pixels, facial features, colour and texture are unchanged. It is the only preloaded hero photograph.
2. `/assets/dominique/originals/07_archive_rouge_et_or.jpg` — original 1100 × 1536 archive, displayed behind the composition using CSS grayscale, subdued contrast/opacity and edge fades. Its actual autograph and existing marks have not been erased or replaced.

The preliminary transparent PNGs remain rejected because of visible extraction defects. Instead, a new SVG alpha mask removes only the light exterior background when displaying the original portrait. It is not a replacement photograph. A second CSS alpha gradient softens the lower edge; there are no portrait colour filters, sharpening, scaling animations or reconstructed facial details.

`trace-mask.py` records how the SVG was produced. It reads the original image, flood-fills connected light neutral exterior pixels, traces the largest outer contour and writes a vector alpha mask. It does not write a raster image. The filled outer contour retains the photographic interior, including facial details and shirt highlights. The bottom boundary is deliberately not seeded, because the shirt extends beyond the source frame. A 0.3-source-pixel edge feather avoids hard raster stair-steps. This optional design-time utility needs Python, Pillow, NumPy and OpenCV; none is a runtime or build dependency. Run it from any directory with `python3 design/homepage-v5/trace-mask.py` if the same approved source needs its mask regenerated.

## Comparison and limits

The rendered desktop composition is compared directly with the supplied reference: name on the left, faded athlete in the centre, authentic portrait on the right, serif statement below the name, and three actions at the bottom left. Mobile deliberately changes the order to eyebrow, name, portrait, statement, mission and actions. At 768 px, the action row sits below the portrait to keep every label on a dark background.

This is not a pixel-perfect recreation of the mockup: the original face, head angle, clothing, archive autograph and original image boundaries are preserved rather than recreating the mockup's AI details. The foreground source is only 447 × 447; the large desktop presentation is visibly softer than the conceptual reference. It has not been sharpened or AI-upscaled. A higher-resolution version of the same original would improve large-screen detail. Minor light edge pixels inherent to the original photograph can remain visible against black. The approved white-shirt pilot poster is still absent, so its existing neutral fallback remains.

## Verification

- Existing 35 tests cover publishing validation, safe video providers, all portrait/landscape/square × featured/article/card variants, legacy defaults and the byte integrity of all seven original photographs.
- Lint, TypeScript, content validation, production build and formatting checks are run before delivery.
- Browser comparisons and functional checks cover 375, 430, 768 and 1440 px in FR and EN; desktop/mobile screenshots are delivered with the PR in the chat.
- The hero CTA scrolls to and focuses `#pilote`; it does not activate YouTube. The player remains 9:16. Secondary actions retain the active locale.
- CSS motion is opt-in under `prefers-reduced-motion: no-preference`; reduced motion has no hero animation or smooth anchor scrolling. No client animation package or scroll listener was added.

No merge or production deployment is part of this V5 delivery.
