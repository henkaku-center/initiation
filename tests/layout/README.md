# Portal layout checks

`portal-layout.mjs` exports read-only geometry checks for a connected browser. They are separate from Vitest's backend/domain suite and require a rendered page, not Node's DOM mocks.

1. Start `npm run dev:demo -- --port 3000` and open `http://localhost:3000/#home`. Use `localhost` consistently: Next's development-origin protection rejects some script requests through `127.0.0.1`.
2. Apply each viewport: 360×800, 390×844, 768×1024, 844×390, 1440×900. Check the additional short-screen intro breakpoint at 667×375.
3. Run `auditPortalLayout` with the connected browser's read-only `page.evaluate` on the parent page, then on the `body` of the intro/home iframe as applicable.
4. On the default multi-bubble intro, run `auditMultiBubbleLayout` and `auditIntroLinkPlacement` in the iframe, and `auditIntroComparisonControls` in the parent. Select `暗号化＋泡`, click an empty area, wait for `#reveal[data-phase="done"]`, then run `auditIntroLinkPlacement` again. Switch back using `複数の泡`. Links in the multi-bubble version are immediately available.
5. Repeat the root check on `#journey`, `#community`, `#passport`, `#setup`. Check both scene backgrounds and the long final-question form. Visually confirm that the traveler touches the foreground ground and does not overlap the form.

An empty `issues` array is a pass. Checks cover horizontal overflow, full-screen intro size, skip-button hit area, PUBLIC GATEWAY/navigation separation, duplicate navigation destinations, covered links, question-card clipping, and traveler/form overlap. The helper does not access wallet providers, authentication, or the database.

## 2026-09-09 result

- Before implementation: the separate intro/home layout check failed as expected.
- Initial five-size matrix: 35 checks; two failures, both mobile homepage horizontal overflow.
- After correcting animated-card overflow and short-screen intro spacing: all 18 intro/home/link-coverage checks across six sizes passed. The unchanged Journey/Community/Passport/Setup geometry checks had already passed at all five sizes.
- Empty-space encryption/reveal was manually repeated five times, followed by working link navigation and fade; the interface remained usable.
- The Podcast summary was visually checked at 360px with a readable body and an official-site link.

No unit/integration tests, standalone lint, or standalone type check were run for this revision, as requested. Vercel performs the build needed to publish the demo.

## Multi-bubble replacement and comparison

- Added `auditMultiBubbleLayout` first and confirmed the encrypted-only implementation failed with `Multi-bubble intro is missing`.
- Ran the replacement's geometry, link coverage, parent comparison controls, and decrypted comparison link coverage at all six viewport sizes: 24 checks, all passed.
- Switched between both variants at every size; links stayed available. A direct multi-bubble Community link faded to `#community`, and the homepage replay reopened the default variant.
- The archived original HTML/CSS are byte-identical to the saved encrypted baseline. The generated encrypted `intro.html` also remains unchanged.
