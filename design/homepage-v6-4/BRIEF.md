# DOMINIQUE SOUCY — CODEX V6.4

# THE HUMAN. THE UNIVERSE. THE PILOT.

REPOSITORY:
https://github.com/dominique-source/dominiquesoucy

WEBSITE:
https://dominiquesoucy.com

MISSION:

Improve the current homepage using the TWO ATTACHED
VISUAL REFERENCES.

This is a focused premium visual update.

DO NOT rebuild the entire website.

================================================
01 — UNDERSTAND BOTH ATTACHED IMAGES
================================================

IMAGE 1:
"Studio luxueux aux accents lime et basket(1).png"

This image represents Dominique Soucy's
cinematic personal recording studio.

It contains:

- A brown leather wingback chair
- Cinematic warm lighting
- A camera on a tripod
- A studio softbox
- A large black-and-white sports collage
- Lime diagonal graphic elements
- A premium documentary atmosphere
- The French slogan:

"Bienvenue dans mon univers"

USE THIS EXACT PROVIDED IMAGE as a new homepage
editorial feature.

Do not regenerate it unnecessarily.

IMAGE 2:
"Dominique Soucy — Le sport miroir de la société.png"

This is the approved HERO COMPOSITION REFERENCE.

It features:

- Extreme close-up of Dominique's face
- Large headline on the left
- Documentary collage background
- Three archival photo satellites
- Right biography sidebar
- Black, white and lime identity

Use it to guide the hero's composition.

DO NOT use this generated composition to replace
Dominique's authentic photograph.

================================================
02 — HERO: RESTORE THE RIGHT PORTRAIT
================================================

The current website has used the wrong portrait.

Do not use:
02_portrait_chemise_bleue.jpg

For the large cinematic hero, use:
05_portrait_ballon.jpg

This is the authentic photograph where Dominique
is wearing a dark shirt and holding a ball.

The ball must disappear through cropping.

IMPORTANT:
Preserve Dominique's real facial identity.

No AI facial reconstruction.
No artificial changes to smile, eyes or anatomy.

Use the reference image to achieve an intimate
extreme close-up.

The face should dominate the center-right.

The expression must feel personal, human
and emotionally engaging.

Preserve:

- Headline
- Main CTA
- Three photo satellites
- Right sidebar
- Navigation
- FR/EN

Do not change the smaller biography photo
unless explicitly required.

================================================
03 — NEW SECTION: BIENVENUE DANS MON UNIVERS
================================================

Create a new editorial section immediately after
the main homepage hero and before the pilot
thumbnail collection.

This must feel like entering a private
documentary recording space.

Use IMAGE 1 as the principal visual asset.

COPY (FR):

Bienvenue dans
mon univers

COPY (EN):

Welcome to
my world

The title already appears inside the supplied
French image.

IMPORTANT:
Do not overlay a duplicate title on top of the
existing image text.

For French:
Use the supplied composition directly.

For English:
Create a faithful English presentation using
the supplied image as a source, with a carefully
controlled localized text treatment.

Do not modify Dominique's face or invent
additional people.

================================================
04 — IMAGE PRESENTATION
================================================

Desktop:

- Full-width cinematic image
- 16:9-style visual composition
- Large and immersive
- Premium edge-to-edge appearance
- Preserve the chair, backdrop and slogan
- Avoid aggressive cropping
- No visible artificial rounded-card styling

The image should feel like a scene from
an expensive documentary.

Do not make it look like a generic website banner.

Mobile:

- Use a responsive composition
- Preserve the central chair and slogan
- Avoid clipping important text
- Keep meaningful photographic details
- Allow a different crop where needed
- If necessary, show the full image rather
  than forcing an inappropriate mobile crop

Optimize using Next.js Image where appropriate.

Provide meaningful alt text.

================================================
05 — CINEMATIC SCROLL EXPERIENCE
================================================

When the visitor scrolls down from the hero:

Reveal the studio image gradually.

Recommended effects:

- Subtle fade from black
- Very gentle image scale transition
- Cinematic reveal
- Restrained parallax, desktop only
- Smooth text transition

DURATION:
Approximately 700–1100ms.

No dramatic zooming.
No excessive visual effects.

The experience must remain premium and subtle.

Respect prefers-reduced-motion.

================================================
06 — NAVIGATION INTO THE PILOT
================================================

Immediately beneath the studio feature,
place the existing pilot content.

Maintain the approved three styles:

A — ET SI ON SE TROMPAIT?
B — LE SPORT EST UN MIROIR.
C — LE SPORT. VRAIMENT?

All three currently point to:

https://www.youtube.com/watch?v=6Zy87nhpHS8

Preserve the real vertical video player.

Make the transition between the studio image
and pilot section feel editorially connected.

Do not duplicate video players.

Do not remove the cinematic 9:16 pilot poster.

================================================
07 — VISUAL HIERARCHY
================================================

The visitor's journey should be:

STEP 1:
THE PERSON

Extreme close-up of Dominique's authentic face.

STEP 2:
THE UNIVERSE

The cinematic studio and:
"Bienvenue dans mon univers"

STEP 3:
THE CONTENT

Three compelling video poster styles
and the main pilot.

STEP 4:
THE REFLECTIONS

Existing editorial content and archives.

This order is essential.

================================================
08 — DESIGN SYSTEM
================================================

Black:
#0A0A0A

Off-white:
#F4F4EF

Lime:
#CCFF00

Fonts:
Use the existing approved website typography.

Avoid:

- Generic gradients
- Unnecessary boxes
- Overly rounded interfaces
- Excessive animations
- Stock photography
- New AI-generated faces
- Duplicate slogans

The studio artwork's serif typography
is an intentional editorial contrast.

Do not force the entire site into serif fonts.

================================================
09 — CODE STRUCTURE
================================================

Inspect existing components and assets first.

Possible relevant files:

components/cinematic-hero.tsx
components/cinematic-collage.tsx
components/pilot-thumbnail-collection.tsx
components/premium-editorial.tsx

lib/homepage-media.ts
lib/photography.ts

app/[lang]/page.tsx
app/homepage-v6.css

Build the studio feature as a reusable component:

StudioUniverseSection

Centralize its configuration.

Support:

- Source image
- Alt text FR/EN
- Localized slogan handling
- Desktop crop
- Mobile crop
- Optional motion settings

Do not hardcode layout logic throughout
unrelated files.

================================================
10 — QUALITY CONTROL
================================================

Inspect actual browser screenshots at:

375px
430px
768px
1440px
1920px

MANDATORY:

Verify that the main hero uses the correct
authentic photograph.

Verify that the image of the studio is
the actual supplied artwork.

Verify that:

- All text is readable
- No slogan is duplicated
- No image appears distorted
- No mobile overflow occurs
- The three video cards remain functional
- The pilot player works
- FR/EN works
- The sidebar remains intact

Compare the homepage hero against IMAGE 2.

Compare the studio section against IMAGE 1.

Do not report visual success without reviewing
rendered screenshots.

================================================
11 — TESTS AND DELIVERY
================================================

Run:

npm run content:check
npm test
npm run lint
npm run typecheck
npm run build

Report results.

Commit changes on a feature branch.

Open a PR against main.

Do not merge automatically.
Do not deploy to production without approval.

Provide:

- PR link
- Desktop screenshot
- Mobile screenshot
- Final image paths
- Summary of changes
- Test results
- Preview URL if available

================================================
FINAL CREATIVE OBJECTIVE
================================================

DOMINIQUE SOUCY

A premium independent documentary media brand.

The homepage should connect the visitor
with the human being first.

Then invite them into his world.

Then introduce his ideas and videos.

THE PERSON.
THE UNIVERSE.
THE PERSPECTIVE.

Less corporate.
More intimate.
More cinematic.

IMPLEMENT NOW.
