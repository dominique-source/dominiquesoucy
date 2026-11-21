# DOMINIQUE SOUCY — CODEX V6.3

# EXTREME CLOSE-UP PORTRAIT + CINEMATIC PILOT POSTER

REPOSITORY:
https://github.com/dominique-source/dominiquesoucy

PRODUCTION:
https://dominiquesoucy.com

EXISTING PILOT:
https://www.youtube.com/watch?v=6Zy87nhpHS8

EXISTING THUMBNAIL PR:
https://github.com/dominique-source/dominiquesoucy/pull/7

MISSION:

Correct two critical visual shortcomings in the current homepage:

1. Dominique's main face is still too small.
2. The pilot section displays a generic dark video placeholder instead of a compelling vertical cinematic poster.

These are targeted corrections.

DO NOT rebuild the homepage.
DO NOT replace the approved visual identity.
DO NOT remove the three approved thumbnail styles.

========================================
01 — INSPECT BEFORE MODIFYING
========================================

Read the existing implementation.

Pay particular attention to:

components/cinematic-hero.tsx
components/cinematic-collage.tsx
components/premium-editorial.tsx
components/adaptive-video.tsx
components/video-player.tsx
lib/config.ts
lib/photography.ts

app/homepage-v6.css
app/adaptive-video.css
app/[lang]/page.tsx

Also inspect other relevant style files and media assets.

Identify the exact CSS and component rules that prevent the face from appearing sufficiently enlarged.

Do not simply increase the container dimensions.

Fix the actual image rendering and crop.

Review PR #7 before making changes to avoid conflicts.

========================================
02 — MAIN PORTRAIT: EXTREME CLOSE-UP
========================================

CURRENT PROBLEM:

Dominique's photograph still shows:

- Too much torso
- Too much shirt
- Too much space surrounding the head
- An insufficiently intimate composition

DESIRED RESULT:

An extreme close-up of Dominique's authentic face.

The composition should focus on:

- Eyes
- Nose
- Natural smile
- Beard
- Chin
- Upper shoulders only if necessary

The ball must not be visible.

The torso must not dominate.

The face should become approximately 60–90% larger
than its current visible size, depending on the
available resolution and responsive constraints.

CRITICAL:

Do not use object-fit: contain for a photograph
that needs an immersive crop.

Prefer:

- object-fit: cover
- Carefully controlled image scaling
- object-position
- Responsive crop adjustments
- Soft gradient masking at the edges

The portrait must visually dominate the center-right
of the homepage.

The face should feel close enough to create a genuine
human connection.

Preserve enough space for the eyes, nose and smile
to remain legible at every breakpoint.

Do not crop the face mechanically.
Judge the composition visually.

========================================
03 — AUTHENTIC PHOTOGRAPHY ONLY
========================================

Use the real photographs of Dominique Soucy
already available in the repository.

The supplied mockups are composition references,
not final photographic assets.

DO NOT:

- Generate a new face
- Modify facial anatomy
- Reconstruct the portrait with AI
- Change Dominique's ethnicity
- Artificially modify eyes, nose or smile
- Invent documentary photography

ALLOWED:

- Cropping
- Exposure adjustment
- Black-and-white treatment
- Contrast
- Subtle grain
- Gradient masks
- Carefully controlled scaling

If the existing source photograph is too small for
an acceptable extreme close-up, inspect the available
originals and choose the best authentic alternative.

Document any image-resolution limitation.

Do not hide a low-resolution problem by generating
fake facial detail.

========================================
04 — PRESERVE THE HERO COMPOSITION
========================================

Keep:

- SPORT / SOCIÉTÉ / HUMAIN
- "Le sport comme miroir de la société."
- "Faire réfléchir avant de faire réagir."
- Editorial body copy
- "Regarder le pilote"
- "Explorer les réflexions"
- L'HUMAIN photograph
- LA COMMUNAUTÉ photograph
- LE SPORT photograph
- Right sidebar "Le parcours"
- Existing historical basketball photograph
- Navigation and language controls

The enlarged face must not obstruct the headline.

The satellite images must remain visible.

They must not obscure Dominique's eyes or smile.

Keep the cinematic black-and-white documentary
aesthetic with restrained lime accents.

========================================
05 — PILOT SECTION: REMOVE EMPTY PLACEHOLDER
========================================

CURRENT PROBLEM:

The existing pilot section displays:

- A dark vertical rectangle
- A large DS monogram
- A technical button labeled
  "Charger la vidéo externe"
- A privacy explanation below the button

This looks like an empty video slot.

It does not resemble a premium media production.

Replace the visually empty placeholder with a
prominent cinematic 9:16 poster.

The poster should immediately communicate:

THIS IS A VIDEO WORTH WATCHING.

========================================
06 — CREATE THE VERTICAL PILOT POSTER
========================================

FORMAT:
9:16 portrait.

The image must be based on an authentic visual
from Dominique's actual pilot video.

Preferred source:
A compelling frame extracted from the original
pilot recording or another user-approved
authentic photograph.

FIRST:
Inspect the repository for an approved pilot poster.

If an original is present, use it.

If it is absent:

- Do not invent an AI video still.
- Do not imply that a stock photograph is
  a genuine frame from the pilot.
- Create a temporary poster using an approved
  authentic Dominique photograph.
- Make the image path easy to replace later.

The temporary poster must still look polished.

========================================
07 — PILOT POSTER ART DIRECTION
========================================

Visual style:

Premium documentary film poster.

Black and white.
Very dark charcoal background.
Authentic photographic portrait.
Strong cinematic contrast.
Subtle lime graphic accents.

The portrait should occupy most of the vertical area.

Avoid excessive decorative elements.

Poster typography:

DOMINIQUE SOUCY

PILOTE
ÉPISODE 00

Optional editorial line:

FAIRE RÉFLÉCHIR
AVANT DE FAIRE RÉAGIR.

Use the actual approved editorial identity.

Do not invent claims about the video's content.

The typography must be legible on mobile.

========================================
08 — A REAL PLAY BUTTON
========================================

Add a large, immediately recognizable play control.

Visual specifications:

- Lime #CCFF00
- Circular or simple geometric design
- Centered or strategically positioned
- Strong contrast against the photograph
- Subtle shadow
- Clear hover feedback

Hover:

- Slight image enlargement
- Gentle brightness increase
- Play button increases in prominence
- Lime accent becomes more visible

No cheesy glow.
No unnecessary bouncing.
No autoplay before interaction.

========================================
09 — CLICK-TO-PLAY FUNCTIONALITY
========================================

Clicking the poster must activate the existing
verified YouTube pilot:

https://www.youtube.com/watch?v=6Zy87nhpHS8

Preserve the original 9:16 video aspect ratio.

The user should see the poster BEFORE activation.

After activation:

The poster disappears.
The actual player is rendered in the same area.
Playback should begin if browser and YouTube
autoplay policies permit it.

IMPORTANT:

Use privacy-conscious click-to-load behavior.

Do not request YouTube resources until
the visitor explicitly interacts.

Avoid making the visitor click through multiple
unnecessary intermediate screens.

If automatic playback is prevented by the browser,
display a clear usable player control.

The interaction must work with:

- Mouse
- Touch
- Keyboard

Provide accessible button labels.

========================================
10 — PILOT SECTION EDITORIAL COPY
========================================

Remove unfinished placeholder language such as:

"Les informations éditoriales seront ajoutées
après validation."

Replace with concise approved positioning.

Suggested French:

PILOTE — ÉPISODE 00

LE SPORT COMME MIROIR
DE LA SOCIÉTÉ.

Faire réfléchir avant de faire réagir.

Suggested English:

PILOT — EPISODE 00

SPORT AS A MIRROR
OF SOCIETY.

Make people think before they react.

Use existing approved translations wherever
available.

Do not create false episode summaries,
release dates or testimonials.

========================================
11 — KEEP ALL THREE THUMBNAIL STYLES
========================================

Preserve the three approved variants:

A — ET SI ON SE TROMPAIT?
B — LE SPORT EST UN MIROIR.
C — LE SPORT. VRAIMENT?

They must remain three distinct visual treatments.

Currently all three point to the same pilot.

Do not collapse them into a single design.

Do not duplicate the YouTube player three times.

The three thumbnails and the vertical pilot poster
must work together as one coherent video experience.

The three thumbnails serve as discovery cards.

The large 9:16 poster serves as the actual
playback entry point.

Avoid redundant headings and excessive vertical gaps.

========================================
12 — DESKTOP LAYOUT
========================================

At 1440px and 1920px:

Hero:
Large intimate portrait center-right.

Pilot section:
Two-column editorial composition.

Left:
Episode title, approved positioning and concise copy.

Right:
Large visually compelling vertical poster.

The poster must be prominent enough to be
recognized immediately as a playable video.

Avoid large unused empty areas.

Maintain premium spacing and visual hierarchy.

========================================
13 — MOBILE LAYOUT
========================================

At 375px and 430px:

- Keep the face visually dominant
- Do not crop the eyes awkwardly
- Keep headline readable
- Preserve the main call to action
- Present the vertical poster prominently
- Maintain a true 9:16 ratio
- Make the play button easily tappable
- Avoid horizontal overflow
- Avoid text placed over critical facial features

The mobile pilot experience should feel like a
premium vertical documentary preview.

========================================
14 — CENTRALIZED MEDIA CONFIGURATION
========================================

Centralize the homepage media configuration.

Support:

Hero portrait:

- Source path
- Desktop positioning
- Mobile positioning
- Crop scale
- Alt text

Pilot poster:

- Source path
- Desktop positioning
- Mobile positioning
- Title overlay
- Video URL
- Poster visibility
- Accessible play label

Future media replacements should not require
rebuilding the components.

Keep the system simple and maintainable.

========================================
15 — MOTION DESIGN
========================================

Use subtle, premium motion.

Hero:

- Gentle entrance
- Small parallax on desktop
- No facial distortion

Poster:

- Soft image zoom on hover
- Elegant play-button transition
- Seamless replacement by the actual player

Respect prefers-reduced-motion.

Avoid unnecessary JavaScript animation libraries.

Do not introduce heavy dependencies without need.

========================================
16 — MANDATORY VISUAL VERIFICATION
========================================

Generate real browser screenshots at:

375px
430px
768px
1440px
1920px

Capture:

1. Homepage hero
2. Entire pilot section
3. Video poster before interaction
4. Player after activation
5. Three thumbnail styles

COMPARE THE RESULTS AGAINST THE USER'S
LATEST SCREENSHOTS.

Do not consider the task complete merely
because the code compiles.

Verify visually:

- Face is significantly larger
- Torso no longer dominates
- Authenticity preserved
- Poster is visible before playback
- Poster is genuinely attractive
- Play button is unmistakable
- Video opens correctly
- All three thumbnail styles remain
- FR/EN is functional
- Mobile is polished

If the face still feels too distant,
increase the crop until the desired
emotional proximity is achieved.

========================================
17 — TESTS
========================================

Run:

npm run content:check
npm test
npm run lint
npm run typecheck
npm run build

Report all results.

Do not claim success without execution.

Fix errors introduced by this change.

========================================
18 — GIT WORKFLOW
========================================

Inspect the current main branch and existing PR #7.

Preserve ongoing changes.

If PR #7 is still open, build on its existing branch
or coordinate changes without overwriting newer work.

Do not accidentally remove its three thumbnail styles.

Use an appropriate feature branch if necessary.

Open or update a pull request.

Do not merge automatically.

Do not deploy to production without approval.

Provide:

- PR link
- Vercel preview link, if available
- Before/after screenshots
- Final image paths
- Test results
- Limitations

========================================
FINAL ACCEPTANCE CRITERIA
========================================

The previous homepage looked too corporate because
Dominique's portrait was too distant.

The previous pilot section looked unfinished because
the player had no compelling poster.

Both problems must be visibly solved.

The finished experience should feel like an
independent premium documentary media brand.

The first emotional connection is Dominique's face.

The second is an irresistible invitation
to watch his pilot.

KEEP IT AUTHENTIC.
KEEP IT CINEMATIC.
MAKE THE VIDEO IMPOSSIBLE TO MISS.

IMPLEMENT NOW.
