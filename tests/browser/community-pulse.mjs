// Exercise the published Gateway script with controlled API responses and real layout.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { musicApi, musicChart } from "./music-fixture.mjs";

const origin = "http://127.0.0.1:3102";
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
const items = Array.from({ length: 6 }, (_, i) => ({
  number: 104 - i,
  title: ["Initiationの質問・クエストと参加体験について考える", "長いタイトルでもモバイル幅で全文を読めることを確認するための議題", '<img src=x onerror="alert(1)">', "Label-based-community-pulse-issue-selection-and-cache-revalidation", "申請から配布・完了確認までの手動運用", "ウォレット接続後の案内を改善する"][i],
  url: `https://github.com/henkaku-center/initiation/issues/${104 - i}`,
  updatedAt: "2026-09-14T02:00:00Z",
}));
await context.route("**/*", async (route) => {
  const url = new URL(route.request().url());
  if (url.href === musicApi) return route.fulfill({ json: musicChart });
  if (url.origin !== origin) return route.abort();
  if (url.pathname === "/api/auth/me") return route.fulfill({ status: 401, json: { error: "unauthenticated" } });
  if (url.pathname === "/api/community-pulse") {
    requests++;
    assert.equal(route.request().headers().cookie, undefined);
    assert.equal(route.request().headers().authorization, undefined);
    if (mode === "loading") await new Promise((done) => { release = done; });
    if (mode === "failure") return route.fulfill({ status: 503, json: { status: "unavailable" } });
    return route.fulfill({ json: { status: mode === "stale" ? "stale" : "fresh", issues: mode === "empty" ? [] : items, lastSuccessAt: "2026-09-14T03:00:00Z" } });
  }
  return route.continue();
});
const location = `${origin}/demo-assets/gateway/index.html`;
try {
  await page.goto(location);
  await page.getByText("注目のIssueを取得中…", { exact: true }).waitFor();
  assert.equal(await page.locator("[data-pulse-list]").getAttribute("aria-busy"), "true");
  assert.equal(await page.getByRole("link", { name: "本家GitHubで一覧を見る ↗" }).count(), 1);
  while (!release) await new Promise((done) => setTimeout(done, 10));
  mode = "ready"; release();
  await page.locator("[data-pulse-list] a").nth(5).waitFor();
  assert.equal(await page.locator("[data-pulse-list] img").count(), 0);
  assert.match(await page.locator("[data-pulse-time]").innerText(), /12:00/);
  const section = page.locator('[data-gateway-section="01-community-pulse"]');
  for (const width of [360, 768, 1440]) {
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, theme);
      await section.scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const cards = page.locator("[data-pulse-list] a");
      assert.equal(await cards.count(), 6);
      assert.equal(await cards.evaluateAll((cards) => cards.every((card) => card.scrollWidth <= card.clientWidth + 1)), true);
      await cards.first().focus();
      await page.keyboard.press("Tab");
      assert.equal(await cards.nth(1).evaluate((card) => card === document.activeElement), true);
      await section.screenshot({ path: `${output}/pulse-${width}-${theme}.png` });
    }
  }
  for (const [state, text, count] of [["stale", "最新情報ではない可能性", 6], ["empty", "掲載対象のIssueはありません", 0], ["failure", "取得できませんでした", 0]]) {
    mode = state;
    await page.reload();
    await page.locator("[data-pulse-status]").filter({ hasText: text }).waitFor();
    assert.equal(await page.locator("[data-pulse-list] a").count(), count);
    assert.equal(await page.locator("[data-pulse-time]").innerText() === "", state === "failure");
    await section.screenshot({ path: `${output}/pulse-${state}.png` });
  }
  mode = "ready";
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await page.locator("[data-pulse-list] a").nth(5).waitFor();
  await section.evaluate((section) => window.scrollTo(0, window.scrollY + section.getBoundingClientRect().bottom));
  await page.waitForFunction(() => [...document.querySelectorAll("[data-pulse-list] a")].every((card) => Number(card.style.getPropertyValue("--card-progress")) === 1));
  const beforeFocus = requests;
  await page.evaluate(() => { window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); });
  assert.equal(requests, beforeFocus);
  await page.goto(origin);
  await page.getByRole("button", { name: "イントロをスキップ", exact: true }).click();
  await page.locator('.pd-gateway-shell[data-intro="dismissed"]').waitFor();
  const home = page.frameLocator('iframe[title="HENKAKU トップページ"]');
  await home.locator("[data-pulse-list] a").nth(5).waitFor();
  await page.screenshot({ path: `${output}/pulse-portal.png`, fullPage: false });
  assert.deepEqual(errors, []);
  console.log("PASS Community Pulse: loading, fresh/stale/empty/error, text safety, six cards, 360/768/1440 light/dark, keyboard, motion, portal iframe");
} finally { await browser.close(); }
