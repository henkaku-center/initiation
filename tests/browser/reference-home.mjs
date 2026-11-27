// Reference-content integration: external episode links and no external media requests.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { chromium } = await import(pathToFileURL(resolve(process.argv[2], 'index.mjs')).href);
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
const origin = process.env.REFERENCE_HOME_ORIGIN || 'http://localhost:3102';
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const requests = [], errors = [];
context.on('request', req => requests.push(req.url()));
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.pathname === '/api/community-pulse') return route.fulfill({ json: { status: 'fresh', issues: [{number: 46, title: 'Initiationの質問とゲーム体験を決める', updatedAt: '2026-09-14T02:00:00Z', url: 'https://github.com/henkaku-center/initiation/issues/46'}], lastSuccessAt: '2026-09-14T03:00:00Z' } });
  if (url.pathname === '/api/auth/me') return route.fulfill({ status: 401, json: {} });
  return url.origin === origin ? route.continue() : route.abort();
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.on('pageerror', err => errors.push(err.message));
async function scrollSection(selector, offset = 0) {
  await page.locator(selector).evaluate((el, offset) => {
    const header = document.querySelector('.pd-header').getBoundingClientRect().height;
    window.scrollTo({ top: scrollY + el.getBoundingClientRect().top - header + offset, behavior: 'instant' });
  }, offset);
}
try {
  await page.goto(origin);
  await page.locator('.frequency-entry').nth(3).waitFor();
  const heroButton = page.frameLocator('.pd-typography-hero iframe').locator('button').first();
  await heroButton.press('End');
  await page.waitForFunction(() => Math.abs(scrollY + innerHeight - document.documentElement.scrollHeight) <= 2);
  await page.keyboard.press('Home');
  await page.waitForFunction(() => scrollY <= 1);
  assert.deepEqual(await page.locator('[data-gateway-section]').evaluateAll(nodes => nodes.map(el => el.dataset.gatewaySection)), ['01-community-pulse', '02-voices-podcast', '03-frequency', '04-threshold']);
  assert.match(await page.locator('.voices-flow-copy').textContent(), /伊藤穰一が多彩なゲスト/);
  const storageKeys = await page.evaluate(() => Object.keys(localStorage).filter(key => key !== 'henkaku.appearance.v1'));
  for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', {name: theme === 'light' ? 'ライトモード' : 'ダークモード', exact: true}).click();
    await page.evaluate(() => { const hero = document.querySelector('.pd-typography-hero'); scrollTo(0, hero.offsetHeight - innerHeight); });
    await page.waitForFunction(() => Number(document.querySelector('.pd-typography-hero').style.getPropertyValue('--hero-progress')) >= .99);
    assert.equal(await page.locator('.pd-typography-hero-panel').evaluate(el => getComputedStyle(el, '::after').opacity), '1');
    await scrollSection('[data-gateway-section="01-community-pulse"]', 100);
    await page.waitForFunction(() => { const el = document.querySelector('.pd-inline-gateway').shadowRoot.querySelector('[data-gateway-section="01-community-pulse"] .gateway-panel'); return Math.abs(el.getBoundingClientRect().top - document.querySelector('.pd-header').getBoundingClientRect().bottom) < 2; });
    assert.ok(await page.locator('[data-gateway-section="01-community-pulse"] .gateway-panel').evaluate(el => Math.abs(el.getBoundingClientRect().top - document.querySelector('.pd-header').getBoundingClientRect().bottom) < 2), 'Pulse pins beneath the header');
    await scrollSection('[data-voices-scroll]', 80);
    await page.waitForFunction(() => { const el = document.querySelector('.pd-inline-gateway').shadowRoot.querySelector('.voices-sticky-panel'); return Math.abs(el.getBoundingClientRect().top - document.querySelector('.pd-header').getBoundingClientRect().bottom) < 2; });
    assert.ok(await page.locator('.voices-sticky-panel').evaluate(el => Math.abs(el.getBoundingClientRect().top - document.querySelector('.pd-header').getBoundingClientRect().bottom) < 2), 'Voices pins beneath the header');
    assert.equal(await page.locator('[data-podcast-scene] iframe').count(), 0);
    assert.equal(await page.locator('[data-podcast-link]').count(), 4);
    for (const link of await page.locator('[data-podcast-link], .frequency-link').all()) {
      assert.equal(new URL(await link.getAttribute('href')).hostname, 'www.youtube.com');
      assert.equal(await link.getAttribute('target'), '_blank');
    }
    await scrollSection('[data-gateway-section="03-frequency"]');
    assert.equal(await page.locator('[data-gateway-section="03-frequency"] > .gateway-panel').evaluate(el => getComputedStyle(el).top), '0px', 'The non-sticky Frequency panel must not receive the header offset');
    assert.match(await page.locator('.frequency-disclaimer').textContent(), /実際の視聴履歴ではありません/);
    assert.equal(await page.locator('.frequency-listener').count(), 4);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await scrollSection('[data-gateway-section="04-threshold"]', 150);
    assert.equal(await page.locator('.button-primary').getAttribute('href'), '/setup');
    console.log(`PASS reference sections, external episode links, samples, links, sticky layout: ${width} ${theme}`);
  }
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).filter(key => key !== 'henkaku.appearance.v1')), storageKeys, 'No viewing-history storage');
  assert.equal(requests.some(url => /listenbrainz|breeze-zero/.test(url)), false);
  assert.equal(requests.some(url => /(?:youtube(?:-nocookie)?\.com|ytimg\.com)/.test(new URL(url).hostname)), false);
  const [setupTab] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('.button-primary').click({ modifiers: ['Control'] }),
  ]);
  await setupTab.waitForURL(`${origin}/setup`);
  assert.equal(page.url(), `${origin}/`);
  await setupTab.close();
  await page.locator('.button-primary').click();
  await page.waitForURL(`${origin}/setup`);
  await page.locator('.pd-setup-grid').waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS Setup navigation, no history collection, no hero BGM');
} catch (error) {
  if (process.env.REFERENCE_HOME_FAILURE_SCREENSHOT) {
    await page.screenshot({ path: process.env.REFERENCE_HOME_FAILURE_SCREENSHOT });
  }
  throw error;
} finally { await context.close(); await browser.close(); }
