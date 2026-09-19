# Klocky — working case-study notes

## Problem

Most clock tools optimize for utility. A spare screen can instead become a quiet design object.

## Reference research

Inspected the three supplied references and the linked Photo Gradient tool. The useful principle is constrained composition over a expressive background. Native implementation details that were not visible are explicitly marked as inferred in REFERENCE_AUDIT.md.

## First prototype

Prove one path: visual gallery, immersive clock, live edit, ambient state. Three backgrounds and three compositions establish the system before expansion.

## Major design decisions

- An off-white collection surface frames saturated artwork without competing with it.
- Clock layouts own their typographic proportions and permissible customization.
- The editor changes the real display; the Lab is the only place with extensive controls.
- Background + clock + a small option set is the persistent object.

## Technical decisions

React/TypeScript/Vite, authored CSS, direct WebGL2, no application backend. Separate player, collection, studio and Lab. All shader artwork is original. First-party PWA assets can be cached without remote fonts.

## Capture plan

See ../case-study-captures/README.md. Further implementation and verification notes will be appended as the product is tested.

## Shader engine and performance

Built three algorithms before expanding to twenty-eight distinct spatial treatments. The collection mixes quiet fields, organic forms, optical distortion and graphic systems. One live WebGL2 canvas serves the player or Lab; collection artwork uses generated posters (roughly 328 KB for all twenty-eight). Palette, seed, motion and distortion use a shared interface. Resolution is capped by both DPR and total pixel area. Low frame pacing reduces resolution rather than changing the visual language.

## Clock system

Thirteen compositions share time and metadata, but own their geometry. Digital split panels, rolling minutes, typographic sentences, disciplined grids and analog faces have separate structures. A small set of font/weight/fill options is normalized on layout changes. The second hand uses browser interpolation between real system-time readings instead of a React animation loop.

## Responsive and orientation challenge

The first landscape pass exposed vertically clipped neighboring minutes in Vertigo. Capping the stack by viewport height fixed it without shrinking the portrait composition. Measuring each clock container (including the live editor preview) proved more useful than relying on device width alone. Phone portrait editing uses a top preview and lower sheet; short landscape uses a side inspector; larger devices preserve a full-height clock.

## Klocky Lab

A separate route handles generative complexity. Local image sampling and weighted color clustering yield six palette colors. Colors can be rearranged and edited; the shader updates live. JSON and poster exports connect experimentation back to the production catalogue without adding a backend or consumer design canvas.

## PWA work

Offline precaching includes the shell, shader modules and all poster art. A build-tool path interpolation bug surfaced because the workspace contains an apostrophe. Moving to an explicit bundled service worker avoided the fragile generated import paths. To verify offline behavior across engines, the browser test shuts down the actual origin after installation rather than relying only on a synthetic network switch.

## Interesting failures

- White numerals lost clarity on pale artwork. Background choices now supply a curated foreground color.
- Safari does not always focus a clicked button. Explicitly focusing icon triggers made modal focus restoration reliable.
- WebKit's service worker bypassed weather mocks and returned real weather. Deterministic API tests isolate the worker; a separate test validates the actual offline worker.
- Concurrent test invocations shared browser trace directories and a preview server. One coordinated test run avoids those artifact collisions.
- Small metadata needed a minimum size in the compact editor preview, even when its visual priority remains low.

## Final implementation

The gallery, player, studio and Lab share definitions rather than independent preset screens. Preferences and links use validated, versioned data. No account, payment provider, copied artwork or background video. Netlify build/routing configuration is included. Physical-device thermal behavior and a real two-hour session remain separate release checks; automated desktop emulation must not be presented as that certification.

## Verification outcome

Seven unit checks and fifty-one browser checks passed, including both browser engines and the eleven-size matrix. A short resource audit retained one active GPU program/buffer across 140 shader changes and released both on disposal. Updating the development test runner cleared the dependency audit. See QA_REPORT.md for measured results and the physical-device checks that remain unverified.


## Visual direction correction

The first collection leaned too heavily on muted earth tones and grain. The supplied screenshot feedback made the missing qualities specific: pink/violet fields, red/blue columns, prismatic edges, broad multicolor ribbons, deep blue haze, angular light, sparse contours, stepped arcs, liquid folds and textured glass. Added twelve original algorithms, bringing the catalogue to forty, and moved those treatments into the curated homepage pairings. Signal now uses crisp monochrome dots.

The homepage previews now share an exact 11:5 landscape ratio at every breakpoint. Larger desktop windows use two columns (three on large monitors); phones use one. Each preview keeps its composition rather than inheriting a generic centered time treatment. Bundled Antonio and Space Grotesk add reliable typographic contrast; Lucent now uses one offset frosted plaque, clearly distinct from Fold's condensed split panels. The Lab can refract an uploaded photograph through the Weave grid, with capped texture dimensions and explicit session-only photo handling.

The revised suite passed all 51 flows, plus 24 strengthened bounds checks for every composition and all requested viewport sizes. A fresh renderer audit tracked texture allocation as well: one texture during use and none after disposal. The 15-second desktop sample measured approximately 59.6 fps at Full HD; hardware endurance remains unverified.
