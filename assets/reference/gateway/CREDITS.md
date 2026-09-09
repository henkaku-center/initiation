# Gateway source snapshots

- `bubble-multi.html`: https://henkaku-ui.vercel.app/bubble-multi
- `archive/encrypted-intro/liquid.html`: https://henkaku-ui.vercel.app/liquid (comparison archive)
- `gateway-v1-claude.html`: https://henkaku-ui.vercel.app/gateway-v1-claude
- Source project: HENKAKU hero study / 0xsalome, linked in henkaku-center/initiation Issue #52.
- Downloaded 2026-09-09 at the user's explicit request to implement the supplied source faithfully.

These snapshots are retained for provenance and rebuilding. `scripts/demo/build-gateway.mjs` assembles the multi-bubble intro, the archived encrypted comparison, and the Gateway homepage through separate adapters. The original multi-bubble source remains unchanged; integration, lifecycle, clipping, logo and navigation changes live in its adapter and local stylesheet.

The Bubble and DecryptReveal ports are retained under the original MIT + Commons Clause License Condition v1.0, copyright (c) 2026 David Haz. They are used as part of this website, not distributed as an independent component product. Their license text and headers are in `public/demo-assets/gateway/` and are not replaced by the repository's MIT license.

The rest of the prototype source and thumbnails retain their source attribution; inclusion here does not assert a new license over that material.
