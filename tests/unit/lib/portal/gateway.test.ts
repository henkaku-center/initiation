// ABOUTME: Build the Gateway documents used by the application.
// ABOUTME: Navigation, fictional histories and robots policy are checked on generated output.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(`public/demo-assets/gateway/${name}`, "utf8");

type StubEvent = { target: { closest: (selector: string) => { href: string } | null }; preventDefault: () => void; prevented: boolean };
type Posted = { type?: string; screen?: string };

// Run only the portal link handling of the generated home so the pre-hydration
// contract can be exercised without a browser.
function loadHomeLinkScript(html: string) {
  const start = html.indexOf("let portalListening = false;");
  const end = html.indexOf("document.querySelector('.home-replay')", start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const posted: Posted[] = [];
  const listeners: Record<string, (event: unknown) => void> = {};
  const parent = { postMessage: (data: Posted) => { posted.push(data); } };
  const origin = "http://localhost:3102";
  const win = { parent, addEventListener: (type: string, fn: (event: unknown) => void) => { listeners[type] = fn; } };
  runInNewContext(html.slice(start, end), {
    URL, window: win, parent,
    document: { addEventListener: (type: string, fn: (event: unknown) => void) => { listeners[`document:${type}`] = fn; } },
    location: { origin, href: `${origin}/demo-assets/gateway/index.html` },
  });
  const click = (href: string): StubEvent => {
    const event: StubEvent = {
      target: { closest: (selector: string) => (selector === 'a[target="_top"]' ? { href } : null) },
      preventDefault: () => { event.prevented = true; },
      prevented: false,
    };
    listeners["document:click"](event);
    return event;
  };
  const answerFromPortal = () => listeners.message({ source: parent, origin, data: { type: "henkaku:theme", theme: "light" } });
  return { posted, click, answerFromPortal };
}

type IntroClick = { prevented: boolean };

// Run only the link handling of the generated intro. The intro is shown before the
// portal hydrates (Issue #123), so its links must stay ordinary until the portal answers.
function loadIntroLinkScript(html: string) {
  const start = html.indexOf("let portalListening = false;");
  const end = html.indexOf('window.addEventListener("pagehide"', start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const posted: Posted[] = [];
  const listeners: Record<string, (event: unknown) => void> = {};
  const origin = "http://localhost:3102";
  const parent = { postMessage: (data: Posted) => { posted.push(data); }, location: { origin } };
  class Element { constructor(public href: string, public dataset: Record<string, string>) {} closest(selector: string) { return selector === "a[data-intro-screen]" ? this : null; } }
  runInNewContext(html.slice(start, end), {
    URL, Element, parent, stopped: false, input: { signal: undefined }, stopIntro: () => {},
    window: { parent, addEventListener: (type: string, fn: (event: unknown) => void) => { listeners[type] = fn; } },
    document: { addEventListener: (type: string, fn: (event: unknown) => void) => { listeners[`document:${type}`] = fn; } },
    location: { origin, href: `${origin}/demo-assets/gateway/bubble-multi.html` },
  });
  const click = (route: string, screen: string): IntroClick => {
    const event = {
      defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
      target: new Element(`${origin}${route}`, { introScreen: screen }),
      preventDefault: () => { event.prevented = true; },
      prevented: false,
    };
    listeners["document:click"](event);
    return event;
  };
  const answerFromPortal = () => listeners.message({ source: parent, origin, data: { type: "henkaku:intro:listening" } });
  return { posted, click, answerFromPortal };
}


describe("application Gateway generation", () => {
  beforeAll(() => { execFileSync(process.execPath, ["scripts/gateway/build-gateway.mjs"]); });
  it("builds the shared Gateway from the application script directory", () => {
    const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
    for (const name of ["dev", "build"]) {
      expect(scripts[name]).toContain("node scripts/gateway/build-gateway.mjs");
      expect(scripts[name]).not.toContain("scripts/demo/");
    }
  });
  it("generates a normal home with public ListenBrainz music charts", () => {
    const html = read("index.html");
    expect(html).toContain('href="/setup" target="_top"');
    expect(html).toContain('href="/initiation" target="_top"');
    expect(html).not.toContain('href="/#');
    expect(html).toContain('data-gateway-section="03-frequency"');
    expect(html).toContain("frequency.js");
    expect(html).toContain("ListenBrainz / WEEKLY TOP TRACKS");
    expect(html).toContain('href="https://listenbrainz.org/statistics/?range=week"');
    expect(html).toContain("ListenBrainz全体の公開ランキングです。");
    expect(html.includes("（将来的にはコミュニティメンバーが聞いている曲が共有されるかも！？）")).toBe(true);
    expect(html).not.toContain("COMMUNITY PLAYS / MOCK");
    expect(html).not.toContain("listening-history.js");
    expect(html).toContain('content="noindex,nofollow"');
  });
  it("shows the podcast introduction without embedded YouTube players", () => {
    const html = read("index.html");
    expect(html).toContain("VOICES / PODCAST");
    expect(html).toContain('href="https://joi.ito.com/podcast/"');
    expect(html).toContain('aria-label="Voices horizontal scene strip"');
    expect(html.includes("Joi Itoとゲストの対話。番組の公式サイトから聴けます。")).toBe(false);
    expect(html.match(/class="voices-scene"/g)).toHaveLength(4);
    for (const title of ["LISTENING ROOM", "FRAGMENTS", "OBSERVED", "ENTER"]) expect(html).toContain(title);
    expect(html).not.toContain('src="./podcast-preview.js"');
    expect(html).not.toContain("data-podcast-player");
    expect(html).not.toContain("data-podcast-toggle");
    expect(html).not.toContain("無音プレビュー");
    expect(html).not.toContain("映像は無音で流れます");
  });
  it.each(["bubble-multi.html", "intro.html"])("uses normal URL fallbacks in %s", (file) => {
    const html = read(file);
    for (const route of ["/setup", "/initiation", "/community", "/passport"]) expect(html).toContain(`href="${route}"`);
    expect(html).not.toContain('href="/#');
    expect(html).toContain('content="noindex,nofollow"');
  });
  it("generates a single application edition from the music source", () => {
    expect(read("index.html")).not.toContain("COMMUNITY GATEWAY / DEMO");
    for (const name of ["index", "bubble-multi", "intro"]) expect(existsSync(`public/demo-assets/gateway/app-${name}.html`)).toBe(false);
    expect(read("frequency.js")).toBe(readFileSync("assets/reference/gateway/frequency.js", "utf8"));
  });
  it("wires live Pulse from its source and retains source links before JavaScript runs", () => {
    const html = read("index.html");
    expect(html).toContain('src="./community-pulse.js"');
    expect(html).toContain('data-pulse-status role="status"');
    expect(html).toContain('data-pulse-list aria-busy="true"');
    expect(html).toContain('href="https://github.com/henkaku-center/initiation/issues?');
    expect(html).not.toContain("2026年9月9日確認");
    expect(html).not.toContain("gatewayContent.pulse");
    expect(read("gateway-data.js")).not.toContain("pulse:");
    expect(read("community-pulse.js")).toBe(readFileSync("assets/reference/gateway/community-pulse.js", "utf8"));
  });
  it("does not publish unused mock listening histories or player code", () => {
    expect(read("gateway-data.js").includes("communityPlays")).toBe(false);
    expect(read("gateway-data.js").includes("episodes:")).toBe(false);
    expect(existsSync("public/demo-assets/gateway/listening-history.js")).toBe(false);
    expect(existsSync("public/demo-assets/gateway/podcast-preview.js")).toBe(false);
  });
  it("asks the portal to answer as soon as the embedded home runs", () => {
    const { posted } = loadHomeLinkScript(read("index.html"));
    expect(posted).toContainEqual({ type: "henkaku:podcast:ready" });
  });
  it("keeps the anchor's own navigation until the portal answers", () => {
    const { click, posted } = loadHomeLinkScript(read("index.html"));
    const event = click("http://localhost:3102/setup");
    expect(event.prevented).toBe(false);
    expect(posted.some((message) => message.type === "henkaku:home:navigate")).toBe(false);
  });
  it("routes through the portal once it has answered", () => {
    const { click, posted, answerFromPortal } = loadHomeLinkScript(read("index.html"));
    answerFromPortal();
    const event = click("http://localhost:3102/setup");
    expect(event.prevented).toBe(true);
    expect(posted).toContainEqual({ type: "henkaku:home:navigate", screen: "setup" });
  });
  it("asks the portal to answer as soon as the intro runs", () => {
    const { posted } = loadIntroLinkScript(read("bubble-multi.html"));
    expect(posted).toContainEqual({ type: "henkaku:intro:ready" });
  });
  it("keeps the intro anchors' own navigation until the portal answers", () => {
    // The intro is visible before hydration, so a click must not be swallowed while the portal loads (Issue #123).
    const { click, posted } = loadIntroLinkScript(read("bubble-multi.html"));
    const event = click("/setup", "setup");
    expect(event.prevented).toBe(false);
    expect(posted.some((message) => message.type === "henkaku:intro:navigate")).toBe(false);
  });
  it("hands intro links to the portal once it has answered", () => {
    const { click, posted, answerFromPortal } = loadIntroLinkScript(read("bubble-multi.html"));
    answerFromPortal();
    const event = click("/setup", "setup");
    expect(event.prevented).toBe(true);
    expect(posted).toContainEqual({ type: "henkaku:intro:navigate", screen: "setup" });
  });
  it.each([["/", "home"], ["/setup", "setup"], ["/initiation", "journey"], ["/community", "community"], ["/passport", "passport"]])("the encrypted intro dispatches %s to its parent", (route, screen) => {
    const html = read("intro.html");
    const start = html.indexOf("const url = new URL(link.href, location.href);");
    const end = html.indexOf("if (url.origin === location.origin", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const result = runInNewContext(`${html.slice(start, end)}; screen;`, {
      URL, link: { href: `http://localhost:3102${route}` },
      location: { href: "http://localhost:3102/demo-assets/gateway/intro.html" },
    });
    expect(result).toBe(screen);
  });
});
