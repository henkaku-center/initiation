# Gateway source snapshots

- `bubble-multi.html`: https://henkaku-ui.vercel.app/bubble-multi
- `archive/encrypted-intro/liquid.html`: https://henkaku-ui.vercel.app/liquid (comparison archive)
- `gateway-v1-claude.html`: https://henkaku-ui.vercel.app/gateway-v1-claude
- Source project: HENKAKU hero study / 0xsalome, linked in henkaku-center/initiation Issue #52.
- Downloaded 2026-09-09 at the user's explicit request to implement the supplied source faithfully.

These snapshots are retained for provenance and rebuilding. `scripts/gateway/build-gateway.mjs` assembles the multi-bubble intro, the archived encrypted comparison, and the Gateway homepage through separate adapters. The original multi-bubble source remains unchanged; integration, lifecycle, clipping, logo and navigation changes live in its adapter and local stylesheet.

The Bubble and DecryptReveal ports are retained under the original MIT + Commons Clause License Condition v1.0, copyright (c) 2026 David Haz. They are used as part of this website, not distributed as an independent component product. Their license text and headers are in `public/demo-assets/gateway/` and are not replaced by the repository's MIT license.

The rest of the prototype source and thumbnails retain their source attribution; inclusion here does not assert a new license over that material.

## FREQUENCY public music statistics

Weekly top recording metadata and aggregate listen counts / ListenBrainz, MetaBrainz Foundation and contributors / https://listenbrainz.org/statistics/?range=week and https://listenbrainz.readthedocs.io/en/latest/users/api/statistics.html#get--1-stats-sitewide-recordings / CC0, as published at https://listenbrainz.org/data/ (checked 2026-09-12).

`frequency.js` is retained for compatibility with legacy ranking documents; normal Home does not load it. No recordings, cover art, personal listen histories or user identities are copied into the project. The sample listener avatars are original CSS geometry in `podcast.css`, under the repository's MIT code license.

## Reference homepage restoration (2026-11-27)

`podcast-preview.js`, `listening-history.js`, the episode/sample catalogue, and `podcast.css` / original HENKAKU portal implementation / Git revision `cca6e14^`, compared with https://sangraal-demo-initiation.vercel.app/#home / repository MIT code license, retaining the prototype attribution above. Adaptations: ShadowRoot selectors, actual iframe elements for the YouTube API, app-route teardown, and header-aware viewport math.

Videos and thumbnails / Joi Ito and the respective rights holders / the six official VIDEO playlist URLs in `gateway-data.js` / externally embedded or linked YouTube content under its original rights and service terms; no video, audio or image files are redistributed or relicensed.
