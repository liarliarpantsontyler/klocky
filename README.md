# Klocky

A responsive, local-first ambient clock. Thirteen curated clock pairings, two additional editor layouts, forty original procedural backgrounds, five still backgrounds, a live editor and an internal background-design Lab. No account or backend.

## Run

Use Node 22 LTS or Node 24+. The included `.nvmrc` and Netlify configuration select Node 22.

```sh
npm ci
npm run dev
```

Open the printed local address. First-time visitors see onboarding; returning visitors open their saved clock. The curated collection is at `/collection`, onboarding can be replayed at `/welcome`, and the internal design tool is at `/lab`.

```sh
npm run build
npm run preview
npm test
npx playwright install chromium webkit
npm run test:e2e
```

The Playwright suite starts the production preview server on port 4173. Run it as one invocation, so browser projects share a managed artifact directory safely. Tests include the requested 11-size viewport matrix; screenshots are written to `case-study-captures/qa/`.

## Deploy to Netlify

Import this folder as a repository or upload the built `dist` directory. `netlify.toml` configures `npm run build` and `dist`; `public/_redirects` provides SPA fallback for `/display` and `/lab`. HTTPS is required for installability, clipboard, geolocation and wake lock. No environment secrets are needed for the preview. Nothing has been published automatically.

## Product model

`BackgroundDefinition + ClockDefinition + curated options = KlockyPreset`

- `src/onboarding`: first-time flow, live curated carousel and vertical chooser, momentum physics and location confirmation
- `src/gallery`: curated pairings, collection and favorites
- `src/clock`: composition definitions, safe options and clock rendering
- `src/shaders`: original GLSL algorithms and a disposable WebGL2 renderer
- `src/backgrounds`: catalogue, static fallbacks, live canvas and crossfade
- `src/editor`: live consumer editor, weather controls and the separate Lab
- `src/state`: versioned persistence, URL validation and entitlement interface
- `src/hooks`: aligned system time, actual-container orientation and browser display APIs
- `src/weather`: optional Open-Meteo weather/geocoding and 15-minute cache
- `src/sw.ts`: offline precache and navigation fallback

Clock type sizes are composition-owned. There is no freeform positioning. The gallery runs no WebGL contexts; its images are actual shader poster frames. The onboarding carousel and chooser render live backgrounds only for visible/nearby cards; the player and Lab also render live backgrounds. Shader code is loaded separately from the initial app shell.

Typography uses up to four semantic weight tiers: Thin, Regular, Bold and Chonky. Each typeface exposes only the distinct weights it actually supports, with unavailable choices hidden; single-weight display faces show only Regular. The custom typeface menu renders each option in its own face and is designed to scroll as the library grows. Font randomization changes both typeface and weight where multiple weights are available.

## Add a clock

Add a `ClockDefinition` with allowed options to `src/clock/definitions.ts`, its composition in `Clock.tsx`, and its responsive styles in `clocks.css`. Add a pairing in `src/gallery/presets.ts`. Clock options are normalized when changing layouts or reading shared links.

## Add a background

Use `/lab` to choose a spatial algorithm, tune a palette/uniforms, and export a compatible definition. Photograph extraction uses local canvas sampling and weighted clustering; files never leave the browser. Enable “Photograph through glass” to preview the image beneath Weave’s refracting grid. Poster export includes the photograph; JSON exports the reusable shader and palette, while the source photograph stays in the current session. Save the exported definition in the catalogue and the captured poster under `public/posters/<id>.webp`. New algorithms are independent GLSL bodies in `src/shaders/library.ts` using the common uniforms.

To regenerate all bundled poster images and app icons from the current renderer, start the development server on 5173, then run `node scripts/generate-posters.mjs`. The renderer generates the artwork; it does not use reference assets.

## Sharing and persistence

`/display?preset=meridian` opens a curated clock and restores its saved edits on the same device. Copy Link produces `/display?s=<versioned-preset>` with validated, bounded settings. Links contain only clock/background options, not weather coordinates. Onboarding completion, clock customization, locale, time zone, weather location, recents and favorites stay in browser storage. Settings → Show Welcome Again replays onboarding without deleting the saved customization. Unsupported or corrupt data falls back to defaults.

The preview entitlement service unlocks everything. Premium flags are metadata only; no checkout is implemented.

## Weather and privacy

No location prompt on launch. Onboarding uses device time automatically and offers manual city/timezone search or an explicit location button. After permission, approximate coordinates are sent to BigDataCloud for city naming and Open-Meteo for the timezone; if lookup fails, device time and offline timezone selection remain available. Enabling weather also offers manual city search and an explicit location button. Weather requests send the chosen coordinates to Open-Meteo. City queries go to its geocoding API. Weather attribution is in the editor. The public Open-Meteo endpoint is suitable for a noncommercial preview; review its commercial-use plan before introducing paid access. See https://open-meteo.com/en/terms and https://open-meteo.com/en/docs.

## Browser behavior

- Fullscreen uses the browser Fullscreen API where supported. On iPhone and iPad in Safari, add Klocky to your Home Screen for an immersive display; the app shows step-by-step guidance. On Chrome, Edge, and similar browsers, an in-app Install button appears when the browser offers install.
- Wake lock is reacquired after returning to a visible tab where permitted; low power mode can prevent it.
- Reduced motion freezes shader time and removes UI/digit animations. The system preference takes precedence.
- Hidden tabs stop animation and clock scheduling; current system time is read when returning.
- DPR is capped at 2; total render pixels are capped around 2.2 million and reduced when sampled frame times fall below target.
- No WebGL2: the matching poster remains visible. Context loss preserves that fallback and restoration recreates GPU resources.
- App UI chrome (onboarding, gallery, editor, settings) uses **Humin** (`humin-regular.ttf`, `humin-bold.ttf`), the same VAG Rounded Next subset as humin.work, bundled under your brand license. Clock display typefaces are separate: Antonio, Space Grotesk, Libre Baskerville, Rubik 80s Fade, Rubik Mono One, Silkscreen, Jersey 20, Danfo and Days One under the SIL Open Font License; Tiempos Headline, American Typewriter and Black Valentine from local installed copies; remaining clock choices use system stacks. No external font requests are made at runtime.
- Every collection preview keeps an exact 11:5 landscape ratio. Each of the thirteen curated presets has its own composition/background pairing, with deliberate typeface, weight, color and placement choices.

## Research and validation

- `docs/REFERENCE_AUDIT.md` was completed before code and separates observations, inferences and original extensions.
- `docs/CASE_STUDY_LOG.md` records design/engineering decisions.
- `docs/QA_REPORT.md` records checks and remaining device validation.
- `case-study-captures/README.md` lists portfolio capture candidates.

## Onboarding implementation notes

The welcome carousel and vertical pick-a-clock list both read the existing curated preset array directly. Every card retains the collection’s 11:5 aspect ratio at every viewport size. The chooser offers a direct pill action on each clock, a random curated clock action, and an equally sized secondary action that opens a neutral clock in the editor. The additional Wordplay and Elsewhere layouts and still backgrounds remain editor options.

Pointer drag uses time-based velocity, exponential deceleration and a spring settle. Wheel events retain trackpad-provided momentum. Three repeated tracks wrap without resetting velocity. Automatic drift pauses during interaction and keyboard focus, and is disabled by reduced motion. Explicit selection stays put on the selection step. The selected live surface expands through View Transitions, with a transform animation fallback.

Validation for this change: 22 non-browser unit tests and the production build. Browser checks were intentionally not run. Live geolocation providers and visual/input behavior still require device verification. The existing browser tests predate the welcome route; collection-focused tests should enter `/collection`.
