# HENKAKU Gateway references

The homepage is adapted from the supplied HENKAKU UI prototypes:

- Reference demo for the typography hero and scroll handoff: [HENKAKU UI](https://henkaku-ui.vercel.app/gateway-v1-claude). The adapted files in this repository are `henkaku-typography-hero.html` and `henkaku-typography/`.
- https://henkaku-ui.vercel.app/bubble-multi — previous default intro, retained as a reference; eight drifting/merging bubbles, cursor trail, WebGL2 and Canvas 2D display modes.
- https://henkaku-ui.vercel.app/liquid — archived encrypted comparison, rolling decrypt, Bubble and tuning controls.
- https://henkaku-ui.vercel.app/gateway-v1-claude — layout, typography, pinned sections, sideways Voices scenes and Threshold.
- https://github.com/henkaku-center/initiation/issues/52 — prototype attribution / 0xsalome.

`bubble.js` and `decrypt-reveal.js`: Copyright (c) 2026 David Haz, MIT + Commons Clause License Condition v1.0. See `LICENSE-canvas-ui.txt`, retained in full. Used as part of this website; not offered as an independent component library. These files retain their own license rather than the repository's MIT default.

`gateway-v1-claude-decrypt.js` and the HTML/CSS: HENKAKU UI prototype source, with its source attribution retained.

`thumbs/hero.png`, `thumbs/riso.png`, `thumbs/liquid.png`: the corresponding publicly supplied preview images at https://henkaku-ui.vercel.app/thumbs/ . They remain illustrative previews of those prototypes, not member photographs or commercial music covers.

Changes: user-supplied concave arrow logo, real application routes, live Pulse issues, restored official podcast previews and fictional sample plays, parent navigation, owned renderer teardown, and a unified scroll document with Shadow DOM style isolation. No automatic audio playback is added. The multi-bubble source keeps its original source attribution; the older Bubble and DecryptReveal ports are used only by the encrypted comparison.

The introduction to “Joi Ito's Podcast — 変革への道” is an original editorial summary based on https://joi.ito.com/podcast/ (accessed 2026-09-09), with a direct link to that official page. Descriptions, transcripts, recordings and artwork are not stored in this repository.

## Joi Ito's Podcast preview references (restored 2026-11-27)

The preview and fictional sample history have been restored from the repository revision before `cca6e14`, matching https://sangraal-demo-initiation.vercel.app/#home at the user’s request.

Videos / Joi Ito and the respective rights holders / https://www.youtube.com/@joiito/podcasts → “Joi Ito's Podcast (VIDEO)”, https://www.youtube.com/playlist?list=PLdwOpF5thM-7Q5OILxkZpRnUnrt0w7US2 and the per-video URLs recorded in `gateway-data.js` (checked 2026-09-09) / externally hosted YouTube content, used through the official embedded player; no CC BY 4.0 or repository MIT relicensing is claimed.

Thumbnails / Joi Ito and the respective rights holders / YouTube's `i.ytimg.com/vi/VIDEO_ID/` URLs / externally referenced YouTube thumbnails, subject to their original rights and YouTube's service terms; no local copies are distributed.

The four Voices scenes reference six official VIDEO playlist entries: conversations with Kengo Kuma, Dai Tamesue, Aya Miyaguchi, Mizuko Ito, Emily Yang (Pplpleasr), and Lawrence Lessig. Titles are shortened from the linked official video titles; each scene identifies the speakers and links to its YouTube page. Frequency listener labels and relative play times are fictional fixtures. No video, audio, transcript or thumbnail files are distributed with the project.

Frequency listener indicators (orbit, mosaic, spark and anonymous silhouette) / HENKAKU portal demo, authored with Codex / original CSS geometry in `assets/reference/gateway/podcast.css` / repository MIT-licensed UI code; no third-party artwork or real user avatars.

## Retained FREQUENCY ranking adapter

Weekly top recording metadata and aggregate listen counts / ListenBrainz, MetaBrainz Foundation and contributors / https://listenbrainz.org/statistics/?range=week / CC0, as published at https://listenbrainz.org/data/ (checked 2026-09-12).

The public API is read only by the retained legacy ranking adapter; normal Home displays fixed samples. Audio, album covers and personal histories are not imported. Decorative record geometry / HENKAKU portal / `assets/reference/gateway/podcast.css` / original MIT-licensed CSS.

## Reference homepage restoration (2026-11-27)

`podcast-preview.js`, `listening-history.js`, the episode/sample catalogue, and `podcast.css` / original HENKAKU portal implementation / Git revision `cca6e14^`, compared with https://sangraal-demo-initiation.vercel.app/#home / repository MIT code license, retaining the prototype attribution above. Adaptations: ShadowRoot selectors, actual iframe elements for the YouTube API, app-route teardown, and header-aware viewport math.

Videos and thumbnails / Joi Ito and the respective rights holders / the six official VIDEO playlist URLs in `gateway-data.js` / externally embedded or linked YouTube content under its original rights and service terms; no video, audio or image files are redistributed or relicensed.
