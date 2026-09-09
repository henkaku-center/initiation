# Portal layout checks

## Community Frequency, inverted JoiN column and Setup navigation — 2026-09-09

The current Frequency is a shared fictional community feed. `community-frequency.mjs` checks four play events, three abstract listener icons plus an anonymous icon, the mock disclosure, removal of personal progress/resume links, readable icon sizes, and overflow. JoiN's column alone uses the opposite appearance; the surrounding background retains the page theme. Let the existing color transition finish before inspecting computed background colors.

`shared-shell.mjs` also checks that Setup appears immediately before Community and points to `#setup`. The existing 44px target requirement caught Setup's initially narrow target at 360px; all navigation links now retain at least 44px width.

Before implementation, the checks failed on the personal heading/progress, missing listener icons, missing Setup and unchanged JoiN appearance. After the user's clarification, a separate failing background check confirmed the section-wide inversion before narrowing it to the column.

Final geometry and appearance results: **20 checks passed** (home + navigation at 360×800, 390×844, 768×1024, 844×390 and 1440×900, each in light and dark). Parent viewport dimensions were verified; the iframe height follows the existing shared shell. All four listener variants and the light/dark JoiN column were visually reviewed.

Routing was searched in upstream Issues [#73](https://github.com/henkaku-center/initiation/issues/73), [#52's Gateway comment](https://github.com/henkaku-center/initiation/issues/52#issuecomment-5359048602) and [#16](https://github.com/henkaku-center/initiation/issues/16). The existing `/setup` → `/initiation` flow and Gateway entry agree with the demo routing. Fourteen existing routing/boundary tests passed, and HTTP checks confirmed `/setup` → `/#setup`, `/initiation` → `/#journey`, `/checkin` → `/#community`, and `/apply` / `/admin` → `/#passport`. No route changes were needed.

Follow-up: Community's label is now **DAILY CHECK-IN**, and **YOUR FOOTPRINTS** is a nested subsection directly below the check-in panel, ahead of OPEN SIGNALS. The prior layout failed the label/nesting checks. After the change, navigation and check-in/history geometry passed another **20 checks** across the same five sizes and both themes. An actual demo check-in added one footprint and disabled the button for that day; the empty state was also visually checked. The homepage retains its separate Community Pulse heading.

Validation: `npm test` passed all **244 unit tests**; the **21 integration tests** failed because the local Supabase endpoint was unavailable. `tsc --noEmit`, repository lint and `git diff --check` passed. Normal and demo production builds passed with `--webpack` (the existing `ox/tempo` dependency emits a warning). The default Turbopack build could not create its local subprocess port in the restricted environment; the standard Webpack fallback verified compilation without changing the project's build configuration.

## Earlier podcast previews, personal history and Issue cards — 2026-09-09

`podcast-layout.mjs` exports `auditPodcastLayout`, a read-only geometry check for the homepage iframe's `body`. Run at 360×800, 390×844, 768×1024, 844×390, and 1440×900 on the parent viewport, selecting both appearance modes. Confirm the actual parent dimensions after applying each viewport override. Frequency shows one browser-local mock history, with no membership-tier selector.

The pre-implementation run failed for missing podcast scenes and listening-history entries. Checks cover four player frames of at least 200×200px, separation of title/description and player/caption, captions fitting inside a pinned viewport, four history cards and the development note without horizontal overflow, and the podcast strip reaching both viewport edges. The vertical-to-horizontal scroll transform must remain enabled on short screens too (except reduced motion). The short-screen heading layout was corrected so hiding its chapter number does not place the heading into the narrow number column.

Final geometry result: **10 cases passed** (5 sizes × 2 appearances), with the actual parent dimensions checked on every size change. The linked dialogue scenes, the personal history and four upstream Issue cards were visually previewed. The catalog uses @joiito's **Joi Ito's Podcast (VIDEO)** playlist, not the static-art audio editions. No unit/integration tests, standalone lint, or standalone type check were run. The user approved the local preview and requested a push to their own repository after making the initial video state paused.

Wide-screen follow-up: when two players remained more than half visible, the old selection kept playing the same card. Selection now follows the scroll progress through the four card indices. At 1440×900, a manual responsive playback check confirmed the first, later, final and preceding card became active as the viewport moved forward and backward. Only one player remained active. The full-width strip also moved when scrolling from either side of the screen.

## Shared shell and appearance — 2026-09-09

`shared-shell.mjs` adds `auditSharedShellLayout` for the parent page and `auditHomeContentLayout` for the homepage iframe's `body`. Run these read-only functions through the connected browser at 360×800, 390×844, 768×1024, 844×390, and 1440×900.

1. Dismiss the intro, select ライト in the shared header, and visit `#home`, `#community`, `#journey`, `#passport`, and `#setup`.
2. On each screen run `auditSharedShellLayout` and the existing `auditPortalLayout`. On home also run `auditHomeContentLayout` with a frame-scoped `body.evaluate`.
3. Repeat with ダーク and at each viewport. The checks cover shared header/footer presence, 44px controls, navigation/control overlap, content separation, horizontal overflow, and removal of the duplicate iframe header/footer.
4. Replay the intro at desktop and mobile sizes. Run `auditPortalLayout` and `auditIntroComparisonControls` while the modal is open. Dismiss it and confirm that the common shell is available again.

Results: the pre-implementation check failed with missing shared header, shared footer, and theme control. After implementation, all 60 shell/home checks and 50 existing page-layout checks passed across five sizes and both appearances. Four additional desktop/mobile intro-layout checks passed. The home shell also passed after reloading with the selected dark appearance.

The only tests run for this revision were responsive layout checks. No unit/integration suite, standalone type check, or lint was run. The local demo was compiled by the development server for preview; nothing was pushed or deployed.

## Earlier portal checks

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

## CI lint correction

The PR's Node 22 job stopped at `@next/next/no-assign-module-variable` in the multi-bubble builder. Renamed the local script-text binding from `module` to `introScript`, retaining the literal `type="module"` attributes. All three generated Gateway documents remained byte-identical (SHA-256 comparison).

Verified with the same Node.js 22.23.2 version used by CI: normal build, `tsc --noEmit`, repository lint, all 244 unit tests across 30 files, and demo build passed. This follow-up supersedes the earlier layout-only verification limit for those checks. Integration tests were not run locally in this follow-up; their result is reported separately by GitHub CI. No lint rules or CI checks were disabled.
