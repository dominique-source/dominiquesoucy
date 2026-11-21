# V4 — photographic editorial review

Branch: `codex/dominiquesoucy-v4-premium`. This change is for review only.
`vercel.json` disables automatic Git deployments for this exact branch. No merge,
production promotion or manual preview deployment is part of this delivery.
[Vercel branch deployment configuration](https://vercel.com/docs/project-configuration/git-configuration).

## Pages

- Home: real blue-shirt portrait, pilot directly after the hero, photographic journal spread, historical sport preview and a separate typographic society preview. Published reflections appear when content exists.
- About: four anchored chapters, alternating photographs and existing verified biographical copy, without invented dates or achievements.
- Reflections: existing secure AdaptiveVideo presentation, tightened spacing. The pilot remains separate from the published library.
- Observations: asymmetric archival context, explicitly distinguished from new observations; existing content filters and mixed media cards remain intact.
- Sport & culture: complete Rouge et Or archive and modest action-photo inset. Original marks and signature stay visible.
- Society: off-white reading environment, readable contrast and typography, without unrelated sports photographs.

Both FR and EN routes, content validation, Markdown reading pages and video orientations remain supported.

## Photograph handling

`lib/photography.ts` maps the supplied manifest to verified intrinsic dimensions and descriptive FR/EN alt text. `components/photography.tsx` provides PhotoWithCaption, EditorialPortrait, ArchivePhoto and PhotoStorySection. Source, position, ratio, fit, caption, optional credit, supplied vintage variant and background are configurable. Source files remain untouched; Next Image serves optimized derivatives. Only the hero portrait preloads; other photographs load lazily.

All seven originals are used. The 178 × 282 action archive stays at a maximum of 178 CSS pixels. The 447 × 447 hero portrait stays at or below its native CSS width. Archival photographs use `contain`, preserving signatures, faces and embedded marks.

Every transparent extraction was inspected on black, off-white and lime. All were rejected for this version: residual background polygons, halos, missing scene details or detached fragments. The untouched originals give the most faithful result; no synthetic face, sharpening, cropping or upscaling was introduced. Vintage and transparent files are retained as supplied library alternatives, but are not selected by the V4 pages.

No GPS metadata was present in the supplied originals. The human photograph's image description is simply “Screenshot”; file timestamps are not used as editorial dates. No unconfirmed person, relationship, location, photographer or date has been added to captions.

## Motion and accessibility

CSS entrance staggering, photo mask reveals, a lime rule reveal, progressive scroll-linked frame drift, hover and mobile-menu transitions. No animation dependency or scroll handler was added. Motion respects `prefers-reduced-motion`; photographs remain visible without JavaScript. Existing navigation, skip links, keyboard controls and external-player focus behavior remain intact.

## Validation

- `npm ci`: completed; zero reported vulnerabilities.
- `npm test`: 35 passing tests. Existing tests cover all three video orientations × featured/article/card, deferred embeds, native media, captions, safe providers, legacy defaults and explicit frontmatter overrides. Added archive integrity test compares SHA-256 hashes against the supplied ZIP for all seven originals.
- `npm run lint`, `npm run typecheck`, `npm run content:check`, `npm run build`, `npm run format:check`: passed.
- Content validation currently reports zero published Markdown entries. No fake publications were created.
- Production build served locally. All six pages in both languages checked at 375, 768, 1024, 1440 and 1920 pixels: 60 combinations, no document or heading overflow after fixes.
- Portrait player measured at 337 × 599.1 pixels on desktop and 319.7 × 568.4 pixels at 375 × 812; ratio remains 9:16. Before activation: no iframe. After activation: youtube-nocookie embed, focus on iframe, no autoplay parameter.
- Browser review included photographic proportions, archive marks, mobile navigation and FR/EN links. Reduced-motion behavior was reviewed in code.

## Remaining assets and limits

The approved white-shirt pilot poster is not in the supplied library. The pilot uses the authorized neutral fallback, rather than presenting an unrelated portrait as its thumbnail. Duration, publication date, transcript and unapproved video title remain unset.

The seven-image archive limits how varied the photographic sequence can be; some images intentionally recur as archival context. Supplied caption/credit and publication-rights confirmations can be added before launch. The low-resolution action photo is not suitable for full-bleed enlargement. The preliminary transparent assets need manual refinement before use.

Nine requested review captures are delivered with the chat, outside public website assets. No V4 deployment was performed.
