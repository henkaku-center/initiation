// A large gesture must traverse zoom and blackout, with a short tail and prompt reversal.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { chromium } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2], 'index.mjs')).href : 'playwright');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/community-pulse') return route.fulfill({ json: { status: 'fresh', issues: [], lastSuccessAt: null } });
      return url.origin === 'http://localhost:3102' ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    await page.goto('http://localhost:3102');
    await page.waitForFunction(() => typeof window.henkakuGatewayMoveIntent === 'function');
    for (const target of ['parent', 'iframe']) {
      await page.evaluate(() => { window.henkakuGatewayReset(); window.henkakuGatewayMoveIntent(1); });
      await page.waitForTimeout(width <= 820 ? 1800 : 1150);
      const result = await page.evaluate(async target => {
        const hero = document.querySelector('.pd-typography-hero');
        const distance = hero.getBoundingClientRect().height - innerHeight;
        const frame = hero.querySelector('iframe').contentWindow;
        const receiver = target === 'iframe' ? frame : window;
        const wheel = deltaY => receiver.dispatchEvent(new receiver.WheelEvent('wheel', { deltaY, cancelable: true }));
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        wheel(100000);
        await wait(80);
        const early = scrollY / distance;
        await wait(220);
        const stopped = scrollY;
        await wait(100);
        const tail = scrollY - stopped;
        wheel(-20);
        await wait(80);
        const reversed = scrollY < stopped;
        const samples = [];
        const start = performance.now();
        while (scrollY < distance - 1 && performance.now() - start < 20000) {
          wheel(100000);
          await new Promise(requestAnimationFrame);
          samples.push(scrollY / distance);
        }
        const complete = scrollY >= distance - 1;
        const black = getComputedStyle(hero.querySelector('.pd-typography-hero-panel'), '::after').opacity;
        const released = wheel(100);
        window.henkakuGatewayReset();
        await wait(100);
        return { early, tail, reversed, samples, complete, black, released, reset: scrollY };
      }, target);
      assert.ok(result.early > 0 && result.early < .15, 'large input moves without skipping');
      assert.equal(result.tail, 0, 'no long coast after release');
      assert.ok(result.reversed, 'upward input reverses promptly');
      for (const progress of [.2, .4, .6, .8]) assert.ok(result.samples.some(value => Math.abs(value - progress) < .04), `must show ${progress}`);
      assert.ok(result.complete, 'continuous input reaches the end');
      assert.equal(result.black, '1');
      assert.ok(result.released, 'normal scrolling resumes after blackout');
      assert.equal(result.reset, 0, 'reset discards queued input');
      console.log(`PASS ${width} ${target}: paced zoom, blackout, stop, reverse, handoff, reset`);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.evaluate(() => window.henkakuGatewayMoveIntent(10000)), false);
    await context.close();
  }
} finally { await browser.close(); }
