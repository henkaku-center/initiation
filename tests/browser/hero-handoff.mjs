// Public home regression checks; no wallet, remote services or database required.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { musicApi, musicChart } from './music-fixture.mjs';
const { chromium } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2], 'index.mjs')).href : 'playwright');
const browser = await chromium.launch({ headless: true });
const origin = 'http://localhost:3102';
const failures = [];
await mkdir('/private/tmp/pr147-verification', { recursive: true });
async function check(name, run) {
  if (process.argv.includes("--network-only") && name.includes(": inputs")) return;
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.message}`); }
}
try {
  for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
    await check(`${width} ${theme}: inputs, reset, content, setup`, async () => {
      const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
      try {
        await context.addInitScript(theme => localStorage.setItem('henkaku.appearance.v1', theme), theme);
        await context.route('**/*', route => {
          const url = new URL(route.request().url());
          if (url.href === musicApi) return route.fulfill({ json: musicChart });
          if (url.pathname === '/api/community-pulse') return route.fulfill({ json: { status: 'fresh', issues: [], lastSuccessAt: '2026-09-14T03:00:00Z' } });
          if (url.pathname === '/api/auth/me') return route.fulfill({ status: 401, json: {} });
          return url.origin === origin ? route.continue() : route.abort();
        });
        const page = await context.newPage();
        page.setDefaultTimeout(12000);
        await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.locator('.frequency-entry').nth(3).waitFor();
        await page.getByRole('button', { name: theme === 'light' ? 'ライトモード' : 'ダークモード', exact: true }).click();
        const frame = page.frameLocator('iframe[title="文字で描く変革"]');
        const gate = width <= 820 ? 1460 : 810;
        for (const input of ['wheel', 'touch', 'keyboard', 'parent-keyboard', 'focused-sheet', 'ArrowDown', 'Space', 'End']) {
          await page.waitForTimeout(500);
          await page.evaluate(() => window.henkakuGatewayReset());
          if (input === 'focused-sheet') await frame.locator('#sheet').focus();
          if (input === 'keyboard') await frame.locator('body').click({ position: { x: 5, y: 5 } });
          if (['parent-keyboard', 'ArrowDown', 'Space', 'End'].includes(input)) await page.locator('#portal-main').evaluate(el => el.focus({ preventScroll: true }));
          const send = async () => {
            if (input === 'wheel') {
              await page.mouse.move(width / 2, 450);
              await page.mouse.wheel(0, 400);
            } else if (input === 'touch') {
              assert.equal(await frame.locator('body').evaluate(body => {
                const touch = y => new Touch({ identifier: 1, target: body, clientX: 100, clientY: y });
                window.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(500)] }));
                return window.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(300)], cancelable: true }));
              }), false, 'touch must be consumed while assembling');
            } else await page.keyboard.press(['ArrowDown', 'Space', 'End'].includes(input) ? input : 'PageDown');
          };
          await send();
          await page.waitForTimeout(150);
          assert.equal(await page.evaluate(() => scrollY), 0, `${input}: first movement must wait`);
          assert.equal(await frame.locator('#sheet').evaluate(el => el.classList.contains('is-dispersed')), false, `${input}: must assemble`);
          await page.waitForTimeout(gate + 50);
          if (input === 'touch') {
            assert.equal(await frame.locator('body').evaluate(body => window.dispatchEvent(new TouchEvent('touchmove', { touches: [new Touch({ identifier: 1, target: body, clientY: 100 })], cancelable: true }))), false, 'touch must advance through the paced hero');
            await page.mouse.wheel(0, 400);
          } else if (input === 'wheel') await page.mouse.wheel(0, 400);
          else await page.keyboard.press(['ArrowDown', 'Space', 'End'].includes(input) ? input : 'PageDown');
          await page.waitForFunction(() => scrollY > 0);
        }
        assert.equal(await page.locator('.pd-inline-gateway').getAttribute('data-theme'), theme);
        await page.locator('[data-gateway-section="01-community-pulse"]').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `/private/tmp/pr147-verification/pulse-${width}-${theme}.png` });
        await page.locator('[data-gateway-section="03-frequency"]').scrollIntoViewIfNeeded();
        await page.getByRole('link', { name: 'ページの最初のヒーローに戻る' }).click();
        await page.waitForFunction(() => scrollY === 0);
        await page.mouse.move(width / 2, 450);
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(150);
        assert.equal(await page.evaluate(() => scrollY), 0, 'reset must re-arm gate');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.locator('.pd-inline-gateway a[href="/setup"]').first().click();
        await page.waitForURL(`${origin}/setup`);
        await page.locator('.pd-setup-grid').waitFor();
      } finally { await context.close(); }
    });
  }
  for (const mode of ['gateway-failure', 'api-failure', 'timeout', 'leave']) {
    await check(mode, async () => {
      const context = await browser.newContext();
      let rankingReady = false;
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(12000);
        await page.addInitScript(mode => {
          window.testAborts = [];
          window.testStarts = [];
          const original = window.fetch;
          window.fetch = (url, options) => {
            const api = String(url).includes('/api/community-pulse') || String(url).includes('api.listenbrainz.org');
            if (api && !window.testResume && (mode === 'timeout' || mode === 'leave')) return new Promise((_, reject) => {
              window.testStarts.push(String(url));
              const start = performance.now();
              options.signal.addEventListener('abort', () => { window.testAborts.push({url: String(url), elapsed: performance.now() - start}); reject(options.signal.reason); }, { once: true });
            });
            return original(url, options);
          };
        }, mode);
        await context.route('**/*', route => {
          const url = new URL(route.request().url());
          if (mode === 'gateway-failure' && url.pathname === '/demo-assets/gateway/index.html') return route.fulfill({ status: 503, body: '' });
          // Exercise the preserved 8s chart adapter with the older document shape.
          if (url.pathname === '/demo-assets/gateway/index.html' && mode !== 'gateway-failure') {
            return route.fetch().then(async response => route.fulfill({ response, body: (await response.text()).replace('data-frequency-mode="sample"', '').replace('</ol>\n          <p class="frequency-disclaimer">', '</ol><p data-frequency-status></p><p data-frequency-period></p><button data-frequency-retry type="button" hidden>もう一度取得</button>\n          <p class="frequency-disclaimer">') }));
          }
          if (rankingReady && url.href === musicApi) return route.fulfill({ json: musicChart });
          if (url.pathname === '/api/community-pulse' || url.href === musicApi) return route.fulfill({ status: 503, body: '' });
          if (url.pathname === '/api/auth/me') return route.fulfill({ status: 401, json: {} });
          return url.origin === origin ? route.continue() : route.abort();
        });
        await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 20000 });
        if (mode === 'gateway-failure') {
          const error = page.getByRole('alert').filter({ hasText: 'Gatewayを読み込めませんでした' });
          await error.scrollIntoViewIfNeeded();
          assert.equal(await error.isVisible(), true);
          assert.equal(await error.evaluate(el => el.getRootNode() instanceof ShadowRoot), true);
          for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
            await page.setViewportSize({ width, height: 900 });
            await page.getByRole('button', { name: theme === 'light' ? 'ライトモード' : 'ダークモード', exact: true }).click();
            await error.scrollIntoViewIfNeeded();
            assert.equal(await error.isVisible(), true);
          }
        } else if (mode === 'leave') {
          await page.waitForFunction(() => window.testStarts.length === 2);
          await page.getByRole('link', { name: 'Setup', exact: true }).click();
          await page.waitForURL(`${origin}/setup`);
          await page.waitForFunction(() => window.testAborts.length === 2);
        } else {
          if (mode === 'timeout') {
            await page.waitForFunction(() => window.testAborts.some(item => item.url.includes('listenbrainz')), undefined, { timeout: 12000 });
            assert.match(await page.locator('[data-frequency-status]').textContent(), /取得できませんでした/);
            const music = await page.evaluate(() => window.testAborts.find(item => item.url.includes('listenbrainz')));
            assert.ok(music.elapsed >= 7900 && music.elapsed < 10000, 'ranking deadline is 8s');
          }
          await page.locator('[data-pulse-status]').filter({ hasText: '取得できませんでした' }).waitFor({ state: 'attached', timeout: 12000 });
          if (mode === 'timeout') {
            const pulse = await page.evaluate(() => window.testAborts.find(item => item.url.includes('community-pulse')));
            assert.ok(pulse.elapsed >= 9900 && pulse.elapsed < 12000, 'issue deadline is 10s');
          }
          for (const selector of ['[data-pulse-list]', '[data-track-list]']) assert.equal(await page.locator(selector).getAttribute('aria-busy'), 'false');
          await page.locator('[data-frequency-retry]').scrollIntoViewIfNeeded();
          assert.equal(await page.locator('[data-frequency-retry]').isVisible(), true);
          assert.equal(await page.locator('[data-frequency-retry]').isEnabled(), true);
          for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
            await page.setViewportSize({ width, height: 900 });
            await page.getByRole('button', { name: theme === 'light' ? 'ライトモード' : 'ダークモード', exact: true }).click();
            for (const selector of ['[data-pulse-status]', '[data-frequency-status]']) {
              await page.locator(selector).scrollIntoViewIfNeeded();
              assert.equal(await page.locator(selector).isVisible(), true);
            }
          }
          rankingReady = true;
          await page.evaluate(() => { window.testResume = true; });
          // This is the retained chart adapter on a synthetic legacy document,
          // not the normal sample UI. Exercise its retry handler directly.
          await page.locator('[data-frequency-retry]').evaluate(el => el.click());
          await page.locator('.frequency-entry').nth(3).waitFor();
        }
      } finally { await context.close(); }
    });
  }
} finally { await browser.close(); }
assert.deepEqual(failures, []);
