// Fixed reference samples: no personal history, credentials or ranking fetches.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { auditCommunityFrequency } from '../layout/community-frequency.mjs';
import { auditPodcastLayout } from '../layout/podcast-layout.mjs';
const origin = process.env.PORTAL_TEST_ORIGIN ?? 'http://127.0.0.1:3102';
assert.ok(['http://127.0.0.1:3102', 'http://localhost:3102'].includes(origin));
const { chromium } = await import(pathToFileURL(resolve(process.argv[2], 'index.mjs')).href);
const browser = await chromium.launch({ headless: true, executablePath: process.argv[4] });
const context = await browser.newContext({ reducedMotion: 'reduce' });
const page = await context.newPage();
let rankings = 0;
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.hostname.includes('listenbrainz')) rankings++;
  if (url.pathname === '/api/community-pulse') return route.fulfill({json: {status:'fresh',issues:[],lastSuccessAt:'2026-09-14T03:00:00Z'}});
  return url.origin === origin ? route.continue() : route.abort();
});
try {
  await page.goto(`${origin}/demo-assets/gateway/index.html`);
  await page.locator('.frequency-entry').nth(3).waitFor();
  const original = await page.locator('[data-track-list]').textContent();
  for (const width of [360, 768, 1440]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({width,height:1000});
    await page.evaluate(theme => {document.documentElement.dataset.theme = theme;}, theme);
    await page.locator('[data-gateway-section="03-frequency"]').scrollIntoViewIfNeeded();
    assert.deepEqual((await page.locator('body').evaluate(auditCommunityFrequency)).issues, []);
    assert.deepEqual((await page.locator('body').evaluate(auditPodcastLayout)).issues, []);
    assert.equal(await page.locator('[data-track-list]').textContent(), original);
    await page.locator('.frequency-link').first().focus();
    assert.equal(await page.locator('.frequency-link').first().evaluate(el => el === document.activeElement), true);
  }
  await page.reload();
  await page.locator('.frequency-entry').nth(3).waitFor();
  assert.equal(await page.locator('[data-track-list]').textContent(), original);
  assert.equal(rankings, 0);
  console.log('PASS fixed sample history: four plays, source links, keyboard, 360/768/1440 light/dark, no ranking requests');
} finally {await context.close();await browser.close();}
