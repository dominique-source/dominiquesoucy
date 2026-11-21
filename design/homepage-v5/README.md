# Approved homepage layout — current reference

`approved-reference.png` is the latest screenshot supplied by the user on November 21, 2026. It supersedes the earlier cinematic concept, retained in `previous-reference.png` only for design history. The user explicitly confirmed that the homepage should include a right-hand portrait column like the supplied reference.

Both images are design references, never photographic assets for the actual website. None of their AI-rendered people or facial details are extracted, recreated or displayed as website photography. No fictitious team members, names or professional roles from the template are copied.

## Composition

The implementation follows the new primary reference: compact dark navigation with lime branding and the existing About link styled as the header action, a large white sans-serif statement in a black introduction panel, restrained body text, a solid lime primary action and an outlined secondary action. A horizontal monochrome sports/community photograph follows, with a large lime diagonal panel at the left and the small cross pattern above it. A dark portrait column at the right uses lime image backgrounds, compact captions and a short chapter heading.

The original monochrome portrait is displayed close to its useful native resolution, avoiding the earlier 760-pixel enlargement of a 447-pixel source. A personal basketball archive occupies the second sidebar tile instead of inventing a second team member. On mobile, the main panel, photo band and portrait module stack; the two real archive/profile tiles share a responsive grid.

## Components and scope

- `components/cinematic-hero.tsx` retains its existing export to avoid unrelated routing refactors, but now renders the approved sports editorial composition. Its copy comes from the existing FR/EN dictionary; the three actions lead to the real pilot, localized reflections and localized About page.
- `app/homepage-v5.css` contains only the new homepage composition, its scoped header refinements and the existing pilot anchor treatment. The previous cinematic hero styles are replaced rather than layered underneath.
- `components/premium-editorial.tsx` retains the focusable `#pilote` player group. AdaptiveVideo, native aspect ratios, deferred external embeds, captions and content validation remain unchanged.
- Existing publications, editorial pages, SEO, local fonts and FR/EN routes remain intact.
- `vercel.json` disables automatic Git deployment of `codex/portrait-integration-fix`. This delivery updates the open PR and does not merge or deploy it.

## Authentic photographs

1. `02_portrait_chemise_bleue.jpg` — original 447 × 447 portrait, served as the exact JPEG without another compression pass. It appears in the lime-backed profile tile, normally below its native CSS width.
2. `04_equipe_purathlete.jpg` — original 1620 × 1080 photograph for the wide band. Its landscape framing allows real faces to remain visible without inventing a basketball scene or enlarging the tiny action archive. Its crop and horizontal offset keep the lime panel away from the faces.
3. `07_archive_rouge_et_or.jpg` — original 1100 × 1536 basketball archive in the sidebar, shown with `contain` so the full postcard, autograph and embedded marks remain visible.

CSS grayscale supplies the monochrome presentation from the reference; the wide band has a restrained brightness adjustment. There is no facial reconstruction, skin smoothing, sharpening, geometric face alteration or change to the source photographs. All supplied originals remain byte-identical to the ZIP. Archival context is labelled explicitly and no dates, photographer credits, identities or partnerships are invented.

The preliminary transparent PNGs remain unused. The blue-shirt portrait uses the existing SVG exterior alpha mask. `trace-mask.py` records its optional design-time generation from connected light neutral background pixels. It writes only an SVG alpha contour, never a raster photograph. A 1.1-source-pixel inset excludes the old bright fringe, with a 0.25-pixel feather. The image's RGB data and interior facial details are retained. Python, Pillow, NumPy and OpenCV are optional design-time tooling, not app or build dependencies.

## Review and limitations

The layout, typography hierarchy, dark/lime palette, diagonal band, portrait column and action treatment are compared against the latest screenshot. The original template's English promotional copy, stock/generated athlete, fictitious coaches and Framer/bookmark/download interface are not part of the personal website. The composition is implemented as real React/CSS, not by displaying the mockup.

The authentic photographs intentionally differ from the reference's AI-rendered scenes and faces. The portrait source remains 447 × 447; it is kept small enough for a clean presentation instead of manufacturing more detail. The existing neutral pilot poster remains until the approved white-shirt asset is supplied. No invented video metadata is added.

## Validation

All 35 existing tests pass, along with lint, typecheck, content validation, production build and formatting checks. Existing tests cover all video orientations and variants, safe content loading and SHA-256 identity of all seven original photographs. Browser review covers 375, 430, 768 and 1440 px in FR/EN: eight combinations without document or headline overflow. The mobile menu target is 44 × 44 px; the homepage actions are at least 44 px high. The pilot link focuses the real player, retains the 9:16 frame and does not load an iframe before explicit activation. The pilot section immediately follows the new homepage composition. Screenshots are delivered in the chat for direct comparison with the current approved reference.
