// Reference-content integration: deterministic YouTube API, no external services or DB.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { chromium } = await import(pathToFileURL(resolve(process.argv[2], 'index.mjs')).href);
const browser = await chromium.launch({ headless: true });
const origin = 'http://localhost:3102';
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(() => {
  window.mediaCalls = [];
  window.testPlayers = [];
  window.YT = { Player: class {
    constructor(frame, options) {
      if (!(frame instanceof HTMLIFrameElement)) throw new Error('Player needs the actual shadow iframe');
      this.frame = frame; this.options = options; this.state = 2;
      window.testPlayers.push(this);
      queueMicrotask(() => options.events.onReady({ target: this }));
    }
    mute() { throw new Error('Do not force silent playback'); }
    setVolume() { throw new Error('Leave volume to the visitor'); }
    getPlayerState() { return this.state; }
    getDuration() { return 120; }
    getCurrentTime() { return 5; }
    cueVideoById() {}
    seekTo() {}
    playVideo() { this.state = 1; this.options.events.onStateChange({ data: 1 }); }
    pauseVideo() { this.state = 2; this.options.events.onStateChange({ data: 2 }); }
    destroy() { window.mediaCalls.push('destroy'); this.frame.remove(); }
  }};
});
const requests = [], errors = [];
context.on('request', req => requests.push(req.url()));
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.pathname === '/api/community-pulse') return route.fulfill({ json: { status: 'fresh', issues: [{number: 46, title: 'Initiationの質問とゲーム体験を決める', updatedAt: '2026-09-14T02:00:00Z', url: 'https://github.com/henkaku-center/initiation/issues/46'}], lastSuccessAt: '2026-09-14T03:00:00Z' } });
  if (url.pathname === '/api/auth/me') return route.fulfill({ status: 401, json: {} });
  if (url.hostname.endsWith('youtube-nocookie.com')) return route.fulfill({ contentType: 'text/html', body: '<body style="background:#101116"></body>' });
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
    await page.locator('[data-podcast-scene] iframe').nth(3).waitFor({ state: 'attached' });
    await page.waitForFunction(() => {
      const r = document.querySelector('.pd-inline-gateway').shadowRoot;
      return [...r.querySelectorAll('[data-podcast-scene]')].every(el => ['ready','playing'].includes(el.dataset.podcastState));
    });
    await page.waitForFunction(() => { const el = document.querySelector('.pd-inline-gateway').shadowRoot.querySelector('.voices-sticky-panel'); return Math.abs(el.getBoundingClientRect().top - document.querySelector('.pd-header').getBoundingClientRect().bottom) < 2; });
    assert.ok(await page.locator('.voices-sticky-panel').evaluate(el => Math.abs(el.getBoundingClientRect().top - document.querySelector('.pd-header').getBoundingClientRect().bottom) < 2), 'Voices pins beneath the header');
    assert.equal(await page.locator('[data-podcast-toggle]').count(), 0);
    assert.equal(await page.locator('[data-podcast-status]').first().textContent(), '');
    for (const frame of await page.locator('[data-podcast-scene] iframe').all()) {
      assert.equal(await frame.getAttribute('inert'), null);
      assert.notEqual(await frame.getAttribute('tabindex'), '-1');
      const url = new URL(await frame.getAttribute('src'));
      assert.equal(url.searchParams.get('controls'), '1');
      assert.equal(url.searchParams.get('autoplay'), '0');
      assert.equal(url.searchParams.has('mute'), false);
      assert.equal(await frame.getAttribute('allowfullscreen'), '');
    }
    // Simulate events from a visitor's native YouTube controls, not app autoplay.
    await page.evaluate(() => window.testPlayers[0].playVideo());
    await page.waitForFunction(() => document.querySelector('.pd-inline-gateway').shadowRoot.querySelectorAll('[data-podcast-state="playing"]').length === 1);
    await page.evaluate(() => window.testPlayers[1].playVideo());
    assert.equal(await page.evaluate(() => window.testPlayers[0].getPlayerState()), 2);
    assert.equal(await page.evaluate(() => window.testPlayers[1].getPlayerState()), 1);
    await page.evaluate(() => window.testPlayers[1].pauseVideo());
    await page.waitForFunction(() => document.querySelector('.pd-inline-gateway').shadowRoot.querySelectorAll('[data-podcast-state="playing"]').length === 0);
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
    console.log(`PASS reference sections, native player controls, play/pause, samples, links, sticky layout: ${width} ${theme}`);
  }
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).filter(key => key !== 'henkaku.appearance.v1')), storageKeys, 'No viewing-history storage');
  assert.equal(requests.some(url => /listenbrainz|breeze-zero/.test(url)), false);
  assert.equal((await page.evaluate(() => window.mediaCalls)).includes('mute'), false);
  await page.locator('.button-primary').click();
  await page.waitForURL(`${origin}/setup`);
  await page.locator('.pd-setup-grid').waitFor();
  assert.equal((await page.evaluate(() => window.mediaCalls.filter(x => x === 'destroy').length)), 4);
  assert.deepEqual(errors, []);
  console.log('PASS Setup navigation, player teardown, no history collection, no hero BGM');
} catch (error) {
  console.log(JSON.stringify(await page.evaluate(() => { const r = document.querySelector('.pd-inline-gateway')?.shadowRoot; return {calls:window.mediaCalls.slice(-10), hidden:document.hidden, scenes:[...r.querySelectorAll('[data-podcast-scene]')].map(el => ({state:el.dataset.podcastState, rect:el.querySelector('.podcast-screen').getBoundingClientRect().toJSON()}))}; }), null, 2));
  await page.screenshot({path:'/private/tmp/pr147-reference-test-failure.png'});
  throw error;
} finally { await context.close(); await browser.close(); }
