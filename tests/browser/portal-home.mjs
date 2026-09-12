// ABOUTME: Check public portal content and footer navigation without a wallet or database.
// ABOUTME: Allow only local app targets and block external resources during browser checks.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { musicChart, musicApi } from "./music-fixture.mjs";

const origin = process.argv[5] ?? "http://127.0.0.1:3102";
assert.equal(origin, "http://127.0.0.1:3102", "Use a local verification server");
const playwright = process.argv[2] ? pathToFileURL(resolve(process.argv[2], "index.mjs")).href : "playwright";
const { chromium } = await import(playwright);
const output = resolve(process.argv[3] ?? "/private/tmp/henkaku-portal-home");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.argv[4] ?? chromium.executablePath() });
const context = await browser.newContext({ reducedMotion: "no-preference" });
const page = await context.newPage();
const errors = [];
const playerRequests = [];
page.on("pageerror", (error) => errors.push(error.message));
context.on("request", (request) => {
  if (/youtube(?:-nocookie)?\.com\/(?:iframe_api|embed\/)/.test(request.url())) playerRequests.push(request.url());
});
await context.route("**/*", (route) => {
  const url = new URL(route.request().url());
  if (url.href === musicApi) return route.fulfill({ json: musicChart });
  if (url.origin !== origin) return route.abort();
  // This suite exercises public UI; authenticated flows use portal.mjs and the local DB.
  if (url.pathname === "/api/auth/me") return route.fulfill({ status: 401, contentType: "application/json", body: '{"error":"Unauthorized"}' });
  return route.continue();
});
try {
  await page.goto(origin);
  await page.getByRole("button", { name: "イントロをスキップ", exact: true }).click();
  const home = page.frameLocator('iframe[title="HENKAKU トップページ"]');
  const voices = home.locator('[data-gateway-section="02-voices-podcast"]');
  assert.equal(await home.locator('[data-gateway-section="03-frequency"]').count(), 1);
  assert.match(await home.locator('.frequency-disclaimer').innerText(), /ListenBrainz全体の公開ランキング/);
  await home.locator('.frequency-entry').nth(3).waitFor();
  assert.equal(await home.locator('.frequency-entry').count(), 4);
  assert.equal(await page.locator('.pd-demo-controls').count(), 0);
  for (const width of [360, 768, 1440]) {
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.getByRole("button", { name: theme === "light" ? "ライトモード" : "ダークモード", exact: true }).click();
      await voices.evaluate((element) => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top));
      assert.equal(await voices.locator("iframe, [data-podcast-player], [data-podcast-toggle]").count(), 0);
      assert.equal(await voices.locator(".voices-scene").count(), 4);
      assert.equal(await home.locator('script[src*="podcast-preview"]').count(), 0);
      assert.equal(await voices.getByRole("link", { name: "公式サイトで番組を聴く ↗" }).getAttribute("href"), "https://joi.ito.com/podcast/");
      const policy = page.getByRole("contentinfo").getByRole("link", { name: "プライバシーポリシー", exact: true });
      assert.equal(await policy.getAttribute("href"), "https://henkaku-center.github.io/initiation/privacy-policy");
      await policy.focus();
      assert.equal(await policy.evaluate((element) => element === document.activeElement), true);
      await page.keyboard.press("Tab");
      assert.equal(await page.getByRole("button", { name: "素材・クレジット", exact: true }).evaluate((element) => element === document.activeElement), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await voices.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `${output}/${new URL(origin).port}-${width}-${theme}.png`, fullPage: true });
    }
  }
  assert.deepEqual(playerRequests, [], "No YouTube player is requested");
  await page.setViewportSize({ width:1440, height:1000 });
  await page.goto(`${origin}/setup`);
  await page.locator('.pd-setup-grid').waitFor();
  const setupBox = await page.locator('.pd-setup-grid').boundingBox();
  assert.ok(Math.abs(setupBox.x - 72) < 2 && Math.abs(setupBox.width - 1296) < 2, "Keep the reference page width and side margins");
  assert.equal(await page.locator('.pd-status-panel').count(), 1);
  for (const width of [360, 768, 1440]) {
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width, height:1000 });
      await page.getByRole("button", { name:theme === "light" ? "ライトモード" : "ダークモード", exact:true }).click();
      for (const [route, selector] of [["setup", ".pd-setup-grid"], ["initiation", ".pd-journey-scene"], ["passport", ".pd-reward-grid"], ["community", ".pd-community-grid"]]) {
        await page.goto(`${origin}/${route}`);
        await page.locator(selector).waitFor();
        assert.equal(await page.locator(".pd-demo-notice").count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${route}, ${width}, ${theme}: no overflow`);
        if (route === "initiation") {
          assert.equal(await page.getByRole("heading", { name:"はじめまして、旅人。", exact:true }).count(), 1);
          assert.match(await page.locator(".pd-game-world").evaluate((element) => getComputedStyle(element).backgroundImage), /night\.webp/);
          await page.getByRole("button", { name:"右を見る", exact:true }).click();
          assert.match(await page.locator(".pd-look-bearing").innerText(), /EAST/);
          await page.getByRole("button", { name:"正面を見る", exact:true }).click();
        }
        if (route === "passport") {
          assert.equal(await page.locator(".pd-reward-card").count(), 4);
          assert.equal(await page.getByRole("button", { name:"申請する", exact:true }).count(), 0);
        }
        for (const picture of await page.locator("img").all()) {
          await picture.evaluate((element) => element.scrollIntoView({ block:"center" }));
          await picture.evaluate((element) => element.decode());
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path:`${output}/${route}-${width}-${theme}.png`, fullPage:true });
      }
    }
  }
  const retiredState = JSON.stringify({ connected:true, signedIn:true, completed:true, participantNFT:true, application:"approved", rewardClaimed:true });
  await page.evaluate((value) => localStorage.setItem("henkaku.portal-demo.v1", value), retiredState);
  const redirect = await context.request.get(`${origin}/demo`, { maxRedirects:0 });
  assert.equal(redirect.status(), 308);
  assert.equal(redirect.headers().location, "/");
  for (const [hash, pathname] of [["", "/"], ["#home", "/"], ["#setup", "/setup"], ["#journey", "/initiation"], ["#community", "/community"], ["#passport", "/passport"], ["#unknown", "/"]]) {
    await page.goto(`${origin}/demo${hash}`);
    await page.waitForURL((url) => url.pathname === pathname);
    assert.equal(await page.locator(".portal-app").count(), 1);
    assert.equal(await page.getByText("デモ操作", { exact:true }).count(), 0);
    assert.equal(await page.getByText("WELCOME TO HENKAKU.", { exact:true }).count(), 0, "Retired progress is not restored");
    await page.reload();
    await page.waitForURL((url) => url.pathname === pathname);
  }
  await page.goto(`${origin}/community`);
  const card = page.locator(".pd-community-card").first();
  for (const close of ["Escape", "button"]) {
    await card.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    assert.match(await dialog.innerText(), /サンプル/);
    assert.equal(await dialog.getByRole("button", { name:"参加受付は準備中", exact:true }).isDisabled(), true);
    if (close === "Escape") await page.keyboard.press("Escape");
    else await dialog.getByRole("button", { name:"閉じる", exact:true }).click();
    await dialog.waitFor({ state:"hidden" });
    assert.equal(await card.evaluate((element) => element === document.activeElement), true);
  }
  assert.equal(await page.evaluate(() => localStorage.getItem("henkaku.portal-demo.v1")), retiredState);
  assert.deepEqual(errors, [], "No unhandled page error");
  console.log(`Public portal passed: ${origin}, Chromium ${browser.version()}, 3 widths × 2 themes, no YouTube player, footer link and keyboard focus`);
} finally {
  await browser.close();
}
