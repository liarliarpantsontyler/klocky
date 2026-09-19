# Klocky V1 — verification report

Verified September 19, 2026. The app is implemented and available locally; it has not been deployed to a public host. This report separates automated evidence from physical-device release checks.

## Automated results

| Check | Result |
| --- | --- |
| Unit tests | 7 passed |
| Browser suite | 51 passed in 2.3 minutes |
| Strengthened composition/preview bounds checks | 24 passed in 49 seconds |
| Browser projects | Chromium, WebKit, and touch-enabled mobile WebKit emulation |
| TypeScript and production build | Passed |
| Dependency audit | 0 reported vulnerabilities after updating Vitest to 4.1.11 |
| Shader catalogue | All 40 algorithms compiled in Chromium and WebKit |
| Clock catalogue | All 13 compositions fit tested phone portrait and landscape containers |
| Offline navigation | Cached shell, `/display`, and `/lab` loaded after the test origin was shut down |

The browser suite verifies selection, live editing, background/layout/font/color changes, hour format, seconds, favorites, recents, saved edits, shared URLs, manual-city weather and units, settings validation/reset, keyboard shortcuts, idle chrome, focus trapping/restoration, wake-lock release and denial, WebGL fallback, reduced motion, analog second-hand interpolation, and Lab image extraction/JSON/poster export. Weather fixtures are deterministic and isolated from service-worker interception; a separate test exercises the actual offline worker.

Fullscreen entry and exit are automated in Chromium. WebKit checks the supported or unavailable path as appropriate; this is not certification of native iOS fullscreen behavior.

The full browser suite was rerun after the visual revision: twelve new shader algorithms, photo glass, bundled fonts, revised curated pairings and 11:5 preview windows. Unit checks and the production build also passed.

## Responsive matrix

Each size was exercised in both desktop browser engines for gallery, live display and editor, with captures, exact 11:5 preview-ratio checks, overflow/panel bounds checks, shader pixel-budget checks, and a swapped-dimension orientation check:

| Width | Height | Intended context |
| ---: | ---: | --- |
| 390 | 844 | Phone portrait |
| 844 | 390 | Phone landscape |
| 430 | 932 | Large phone portrait |
| 932 | 430 | Large phone landscape |
| 768 | 1024 | Tablet portrait |
| 1024 | 768 | Tablet landscape |
| 1366 | 768 | Laptop |
| 1440 | 900 | Desktop |
| 1920 | 1080 | Full HD desktop |
| 2560 | 1440 | Large desktop |
| 2520 | 1080 | 21:9 ultrawide |

These are geometry assertions and captured screenshots, not an approved pixel-diff baseline. Representative gallery, phone, tablet, editor, Lab and shader contact-sheet images were visually inspected. Physical safe-area insets and device-specific browser chrome still need hardware verification.

## Rendering and resources

The repeatable `scripts/performance-audit.mjs` audit switches shaders 140 times, samples animation, tests reduced motion and forces context loss/restoration. Its result is saved under `case-study-captures/qa/performance.json`.

- After 140 switches: one program, one buffer, one texture, zero retained shader objects.
- After disposal: zero tracked programs, buffers, textures or shader objects.
- Reduced-motion captures were unchanged; context restoration succeeded.
- A 15-second Chromium sample at a 1920 × 1080 viewport recorded 894 frame intervals, averaging 16.79 ms (about 59.6 fps); p95 was 16.8 ms.
- Rendering used 2,073,600 pixels during that sample.

The sample omits intervals of 200 ms or longer and is a short desktop pacing observation, not a mobile performance guarantee. GPU object counts do not substitute for a two-hour heap/thermal/battery soak. Gallery cards use static poster frames and create no WebGL contexts; the player or Lab owns one live renderer.

## Build footprint

The entry JavaScript is 88.70 KB gzip, shared CSS 7.88 KB gzip, the lazy renderer 6.31 KB gzip, and the lazy Lab 4.49 KB gzip plus 1.54 KB gzip CSS. The worker precaches 100 entries totaling approximately 931 KiB before transfer compression, including the locally bundled typefaces. All 40 poster images together occupy approximately 408 KB.

## Native Safari smoke check

Installed macOS Safari successfully opened the gallery, selected Meridian, entered the live editor, changed to Spectral, and closed the editor with Escape. The attempted fullscreen request in the automation context was refused and the app displayed its graceful explanation. No native mobile device was available for installation or thermal testing.

## Remaining release checks

1. On physical iPhone/iPad Safari and an Android device, install to the home screen and verify standalone launch, icons, safe areas, rotation, offline relaunch and display behavior.
2. Run an uninterrupted two-hour display session on representative hardware; record heap growth, GPU resources, clock accuracy, battery and temperature, including background/foreground recovery.
3. Verify sustained mobile frame pacing against the 45 fps degraded target and native wake-lock behavior under low-power and permission-denial conditions.
4. After publishing over HTTPS, smoke-test Netlify deep links, update installation, sharing and optional location/weather requests on the deployed origin.

Netlify routing/build configuration is present. Node 22 is pinned for deployment; local checks passed on the host's Node 23.4, which the patched Vitest package does not officially support. Use the pinned supported Node version for future installs.
