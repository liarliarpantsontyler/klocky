# Klocky reference audit

Research completed September 19, 2026, before application code was written.

Sources:

- https://www.danield.design/case-studies/clocks
- https://www.danield.design/case-studies/photo-gradient
- https://www.clocks.app/
- https://photogradient.com/ (working tool linked by the case study)

Method: read the supplied sites; scroll through the visual case studies, animated demonstrations, device compositions, onboarding and settings captures; inspect the working Photo Gradient controls and dropdowns; compare narrow and desktop browser widths. These are public demonstrations, not an installed native-app audit. Several lazy-loaded videos initially showed blank/loading states. No proprietary source, assets or shader code was taken.

## A. OBSERVED

### Clocks case study

The mobile chooser uses landscape visual previews in a vertical list, a compact brand header, Pro and settings. The editing demonstration retains a live preview above Background, Layout and Font rows and a Display Clock action. Changing layout re-composes the time: a small lower-edge clock becomes a centered panel or two-part composition. Visible font choices include a rounded system style. Date/location/weather sit at edges in small type; time may be dominant or deliberately subordinate to the background. Examples include a thin outlined panel, separated flip blocks and a rolling-minute stack with faded neighboring numerals. The backgrounds range from soft fields to fluid distortions and monochrome displaced dots. The text identifies 30 Metal shaders. Settings captures show 24-hour time, widgets, app icon, sharing, charging instructions and onboarding reset. A gradient Pro banner offers an upgrade. Onboarding is brief, visual, with one starting action. Icon strokes and white chrome are restrained. Captures show rounded preview boundaries, generous gaps and compact metadata.

### Photo Gradient case study and linked working tool

The case study emphasizes making color, mesh arrangement and noise pleasant to manipulate. Desktop pairs artwork with a small floating inspector; narrow layouts put controls beneath the preview. The live tool exposes gradient interpolation, warp shape, dimensions, warp strength/size, noise and an ordered color list. Interpolation choices include sharp/soft Bézier, static/grid mesh and simple. Warp choices include noise variants, circular, domain warping, waves, rows and columns. Palette controls include image input, randomization and add; individual colors have hex fields and rearrangement/removal affordances. The output is downloadable. The examples combine muted tones with occasional vivid accents, broad low-frequency transitions and deliberate fine grain. The inspector is white with subtle divisions and shadow; the canvas has priority. No clock editor appears here. This is a separate design tool, not evidence that the consumer clock product exposes these controls.

### clocks.app

The product is presented in physical spaces across phone, tablet and desktop. Wide displays preserve negative space rather than enlarge all metadata. Examples show a broad colored ribbon against a pale field and translucent split numeral blocks. The page advertises curated presets, more than 20 backgrounds and 10 clocks, matching desktop screensavers and Shortcuts support. FAQ: automatic charging launch requires Shortcuts setup; the Pro purchase applies across the same Apple ID; no ads/data collection; the app is intended for awake use; no timer at the time of this page. Screensaver installation help lives in settings. The marketing site uses roomy sections and simple calls to action; that marketing hierarchy should not become the clock application's navigation.

## B. INFERRED — not verified native behavior

- The model is a selected background plus a constrained clock composition, with some shared styling controls. Exact storage schema and complete supported option sets are unknown.
- Tapping a preview probably enters editing or display. Public clips demonstrate the end states; exact gesture count, transition curve, haptics and cancellation semantics cannot be established.
- Preview bounds appear to transition calmly, but a true shared-element implementation cannot be proven from screenshots.
- The native product likely relies on GPU rendering; only the Metal statement is confirmed. Frame pacing, adaptive quality, memory behavior and reduced-motion implementation were not inspectable.
- Phone portrait editing and landscape artwork are documented visually. Real orientation transitions, safe-area rules, ultrawide behavior and all tablet breakpoints are not verified.
- Glass suggests backdrop diffusion, a bright inner edge and controlled transparency. Actual refraction math is not known.
- Weather/location are visible in sample compositions. Provider, permission flow, caching and error states are unknown.
- Precise free limits, entitlement behavior, keyboard commands, focus management, screen-reader output, hover behavior, fullscreen/wake-lock policies and all empty/error states are unknown.
- Font appearance suggests modern system sans, rounded and condensed alternatives. Do not assume proprietary font licenses or reproduce exact type assets.

## C. KLOCKY EXTENSION — original web implementation

### Product and navigation

Chooser → player → live studio. Default launch is directly into a usable gallery, with one short orientation hint instead of mandatory onboarding. Gallery cards use actual current time and static shader posters. A shared visual transition connects each card to the player. Consumer editing contains only curated choices. Advanced generative controls are isolated at `/lab`, absent from main navigation.

### Original visual system

Warm off-white gallery; graphite typography; small squared labels; three columns at desktop and a single column on phones. Original named compositions and palettes. The first three proofs are Meridian / mesh, Fold / ribbon, and Orbit / caustic field. Type uses native sans, a restrained geometric option, serif editorial and mono. Numerals use tabular widths. Metadata remains secondary. UI glass uses a dark contrast-safe surface, fine highlight, blur and inset edge rather than a uniform white wash.

### Responsive system

Measure the clock container's actual aspect ratio via ResizeObserver. Portrait may stack time or place metadata above/below; landscape uses width and opposite edges. Explicit phone landscape, tablet, desktop and ultrawide rules constrain numeral scale by both axes. Editor overlays desktop; phone portrait keeps the live preview above an independent scrolling sheet. Phone landscape puts the inspector alongside a visible preview. Respect safe areas throughout.

### Browser behavior and accessibility

Fullscreen and wake lock are feature-detected, user-triggered and report unavailable states. Display chrome/cursor fades after inactivity and reappears on pointer/keyboard/touch activity. Focused controls remain operable. Escape reverses the current layer. Visible focus, semantic controls, dialog focus containment, 44px targets, reduced motion, accessible clock labels and nonintrusive weather failures are implementation requirements, not reference claims.

### Engine and persistence

One active WebGL context, static gallery posters, common uniforms, visibility suspension, capped resolution, adaptive rendering and context-loss fallback. Crossfade a snapshot over the newly selected shader without white flashes. Separate system-time scheduling from the graphics loop. Local versioned preferences, sanitized URL presets, recent choices, no account. Offline app shell and first-party assets; weather requests only after an explicit user choice.

### Lab and future monetization

Original GLSL algorithms and 28 distinct spatial treatments. The Lab offers palette extraction entirely on-device, editable uniforms, JSON export and poster capture. Definitions carry premium flags behind a replaceable entitlement interface; all designs are unlocked in this V1 preview. No payment UI or misleading purchase action.

## Design decisions from research

1. Start with composition quality, not a catalogue count.
2. Clock and background must be independently selectable without arbitrary positioning.
3. Rich canvas, quiet application. Avoid marketing heroes or dashboard furniture.
4. Keep the background-design tool separate from personalizing a clock.
5. Document native parity limits rather than fabricate interaction observations.

## Verification limits

The research does not certify native Safari behavior, actual device motion, inaccessible video states or native app settings not pictured. Those are separate product QA tasks. Source counts differ between the older marketing copy and newer case study; they are recorded as source-specific claims.
