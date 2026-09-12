// ABOUTME: Verify the music chart in a real browser across loading, failure and ready states.
// ABOUTME: An explicit --live flag permits one public ListenBrainz GET, without credentials.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { musicApi, musicChart } from "./music-fixture.mjs";
import { auditCommunityFrequency } from "../layout/community-frequency.mjs";
import { auditPodcastLayout } from "../layout/podcast-layout.mjs";

const origin = "http://127.0.0.1:3102";
const live = process.argv.includes("--live");
const { chromium } = await import(pathToFileURL(resolve(process.argv[2], "index.mjs")).href);
const output = resolve(process.argv[3]);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.argv[4] });
const context = await browser.newContext({ reducedMotion: "reduce" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
let mode = "loading", release;
let requests = 0;
await context.route("**/*", async (route) => {
  const request = route.request();
  if (request.url() === musicApi) {
    requests++;
    assert.equal(request.method(), "GET");
    assert.equal(request.headers().authorization, undefined);
    assert.equal(request.headers().cookie, undefined);
    assert.equal(request.headers().referer, undefined);
    if (live) return route.continue();
    if (mode === "loading") await new Promise((done) => { release = done; });
    if (mode === "failure") return route.fulfill({ status: 429, body: "Unavailable" });
    if (mode === "empty") return route.fulfill({ status: 204 });
    return route.fulfill({ json: musicChart });
  }
  return new URL(request.url()).origin === origin ? route.continue() : route.abort();
});
try {
  await page.goto(`${origin}/demo-assets/gateway/app-index.html`);
  const status = page.locator("[data-frequency-status]");
  if (!live) {
    await status.filter({ hasText: "取得中" }).waitFor();
    await page.waitForFunction(() => document.querySelector("[data-track-list]").getAttribute("aria-busy") === "true");
    mode = "failure";
    while (!release) await new Promise((done) => setTimeout(done, 10));
    release();
    await status.filter({ hasText: "取得できませんでした" }).waitFor();
    assert.equal(await page.locator(".frequency-entry").count(), 0);
    mode = "ready";
    const retry = page.getByRole("button", { name: "もう一度取得", exact: true });
    await retry.focus();
    await page.keyboard.press("Enter");
  }
  await page.locator(".frequency-entry").nth(3).waitFor();
  assert.equal(await page.locator(".frequency-entry").count(), 4);
  assert.equal(await page.locator("[data-track-list]").getAttribute("aria-busy"), "false");
  assert.match(await page.locator("[data-frequency-period]").innerText(), /UTC/);
  assert.match(await page.locator(".frequency-disclaimer").innerText(), /将来的にはコミュニティメンバーが聞いている曲が共有されるかも！？/);
  const section = page.locator('[data-gateway-section="03-frequency"]');
  for (const width of [360, 768, 1440]) {
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      await section.scrollIntoViewIfNeeded();
      assert.deepEqual((await page.locator("body").evaluate(auditCommunityFrequency)).issues, []);
      assert.deepEqual((await page.locator("body").evaluate(auditPodcastLayout)).issues, []);
      assert.equal(await section.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator(".frequency-link").first().focus();
      assert.equal(await page.locator(".frequency-link").first().evaluate((element) => element === document.activeElement), true);
      await section.screenshot({ path: `${output}/${live ? "live" : "fixture"}-${width}-${theme}.png` });
    }
  }
  if (!live) {
    mode = "empty";
    await page.reload();
    await status.filter({ hasText: "まだありません" }).waitFor();
    assert.equal(await page.locator(".frequency-entry").count(), 0);
  } else assert.equal(requests, 1);
  assert.deepEqual(errors, []);
  console.log(`PASS Frequency (${live ? "public live API" : "offline fixtures"}): ${requests} GETs, four tracks, period/source, keyboard, 360/768/1440 light/dark${live ? "" : ", loading/error/retry/empty"}`);
} finally { await browser.close(); }
