# CODEX — DOMINIQUE SOUCY V6.2

# THREE PILOT THUMBNAILS — PREMIUM INTEGRATION

REPOSITORY:
https://github.com/dominique-source/dominiquesoucy

EXISTING PR:
https://github.com/dominique-source/dominiquesoucy/pull/7

BRANCH:
codex/three-pilot-thumbnail-styles

PRODUCTION:
https://dominiquesoucy.com

MISSION:

Finalize the three premium video thumbnail styles already implemented in PR #7.

IMPORTANT:
Do not rebuild this feature from scratch.

First inspect the existing branch, understand what has already been implemented, then improve and validate the current work.

The goal is to transform the three approved thumbnail concepts into a polished, interactive editorial video collection.

All three thumbnails currently promote the SAME pilot:

https://www.youtube.com/watch?v=6Zy87nhpHS8

The system must support different videos in the future.

========================================
01 — PRESERVE THE APPROVED HOMEPAGE
========================================

DO NOT redesign the main homepage.

Preserve:

- Large immersive Dominique portrait
- Cinematic photographic collage
- Editorial headline
- Black / white / lime identity
- Existing navigation
- Le parcours sidebar
- FR/EN support
- Existing animations
- Existing pilot video player

The three thumbnails should enhance the homepage, not replace its visual identity.

========================================
02 — THREE DISTINCT VIDEO STYLES
========================================

STYLE A — THE QUESTION

French:
ET SI ON SE TROMPAIT?

English:
WHAT IF WE WERE WRONG?

Visual identity:

- Large authentic portrait
- Black and white
- Strong cinematic contrast
- Bold typography
- Lime accent
- Intimate, provocative composition

STYLE B — THE MANIFESTO

French:
LE SPORT EST UN MIROIR.

English:
SPORT IS A MIRROR.

Visual identity:

- Documentary portrait
- Premium editorial typography
- Minimal composition
- Dark photographic background
- Refined lime accents

STYLE C — THE CONFRONTATION

French:
LE SPORT. VRAIMENT?

English:
SPORT. REALLY?

Visual identity:

- Authentic basketball archive
- Black-and-white documentary aesthetic
- Sport and society visual references
- Dynamic composition
- Strong lime highlights

Each design must remain visually distinct.

Do not generate AI faces.

Use Dominique's actual photographs from the repository.

========================================
03 — HOMEPAGE INTEGRATION
========================================

Place the collection between:

1. Cinematic homepage hero
2. Existing pilot video section

Desktop:

Display three premium horizontal cards in a row.

Maintain 16:9 thumbnail proportions.

Each card must have:

- Large readable title
- Strong authentic photography
- Clear play symbol
- Subtle lime accents
- Editorial identification

Mobile:

Stack cards vertically.

Ensure all text remains legible.

Do not crop important facial details.

Avoid unnecessary horizontal scrolling.

========================================
04 — VIDEO INTERACTION
========================================

All three thumbnails currently point to:

https://www.youtube.com/watch?v=6Zy87nhpHS8

Prefer linking to the existing #pilote section.

The existing player must retain its native 9:16 format.

Clicking any thumbnail must reliably move the visitor to the actual video player.

Improve focus and scroll behaviour.

Do not create three duplicate video players.

Do not autoplay audio.

========================================
05 — PREMIUM HOVER INTERACTIONS
========================================

Desktop hover:

- Image zoom of approximately 3–5%
- Lime border appears
- Play symbol becomes more prominent
- Slight image brightness adjustment
- Smooth cinematic transition

Animation timing:
Approximately 300–500ms.

Avoid excessive animations.

Respect prefers-reduced-motion.

Ensure keyboard users receive equivalent focus styling.

========================================
06 — FUTURE EPISODES
========================================

Make the three visual styles reusable.

Create a simple configuration allowing:

- Thumbnail style
- Title FR
- Title EN
- Image path
- Video URL
- Episode label
- Optional subtitle
- Image positioning

Currently:
All three use Pilot Episode 00.

Later:
Each can point to a different video.

Do not hardcode URLs in multiple unrelated components.

Preserve support for portrait, landscape and square video playback.

========================================
07 — PHOTO AUTHENTICITY
========================================

Use real Dominique Soucy photographs.

Preserve:

- Facial identity
- Original expressions
- Authentic historical details
- Body proportions
- Natural photographic imperfections

Allowed:

- Cropping
- Black-and-white conversion
- Moderate contrast
- Subtle grain
- Dark overlays

Not allowed:

- AI facial reconstruction
- Synthetic replacement faces
- Fabricated archival photography
- Artificial changes to his smile or eyes

Use real source images even when their resolution is imperfect.

========================================
08 — CRITICAL VISUAL REVIEW
========================================

Inspect screenshots at:

375px
430px
768px
1440px
1920px

Verify:

- All three thumbnails are visible
- Text is readable
- Portrait cropping looks natural
- No image distortion
- Buttons are clearly clickable
- Existing hero remains intact
- Sidebar is unchanged
- Pilot player is functional
- FR/EN works
- Mobile layout has no overflow

Compare against the three approved visual concepts attached to this conversation.

Do not claim visual verification without inspecting actual rendered screenshots.

========================================
09 — TESTS
========================================

Run:

npm run content:check
npm test
npm run lint
npm run typecheck
npm run build

Fix any errors introduced by this feature.

Verify the existing pilot URL remains correct.

Report any tests that cannot be executed.

========================================
10 — DELIVERY
========================================

Continue working on:

codex/three-pilot-thumbnail-styles

Update the existing PR #7.

Do not open a duplicate PR unless necessary.

Provide:

1. Summary of changes
2. Desktop screenshots
3. Mobile screenshots
4. FR/EN verification
5. Video link verification
6. Performance notes
7. Test results
8. Vercel preview URL

Do not merge automatically.

Do not deploy directly to production.

FINAL OBJECTIVE:

Create three visually compelling editorial entry points to Dominique Soucy's pilot.

Preserve all three approved artistic directions.

ONE PILOT.
THREE VISUAL IDENTITIES.
A PREMIUM MEDIA EXPERIENCE.

IMPLEMENT AND VALIDATE.
