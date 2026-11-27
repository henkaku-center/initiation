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
  const end = html.indexOf("</script><script src=\"./community-pulse.js\"", start);
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
  const click = (href: string, modifiers: Partial<Pick<MouseEvent, "button" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">> = {}): StubEvent => {
    const event: StubEvent = {
      target: { closest: (selector: string) => (selector === 'a[target="_top"]' ? { href } : null) },
      preventDefault: () => { event.prevented = true; },
      prevented: false,
      ...{ button: 0, ...modifiers },
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
  it("restores the reference sample history with real application routes", () => {
    const html = read("index.html");
    expect(html).toContain('href="/setup" target="_top"');
    expect(html).toContain('href="/initiation" target="_top"');
    expect(html).not.toContain('href="/#');
    expect(html).toContain('data-gateway-section="03-frequency"');
    expect(html).toContain('data-frequency-mode="sample"');
    expect(html).toContain("COMMUNITY PLAYS / MOCK");
    expect(html).toContain("実際の視聴履歴ではありません");
    expect(html).not.toContain('src="./frequency.js"');
    expect(html).toContain('src="./listening-history.js"');
    expect(html).toContain('content="noindex,nofollow"');
  });
  it("does not show the retired intro replay control on the home", () => {
    const html = read("index.html");
    expect(html).not.toContain("イントロを再生");
    expect(html).not.toContain("home-replay");
  });
  it("retains the four production abstract Voices scenes and official show link", () => {
    const html = read("index.html");
    expect(html).toContain("VOICES / PODCAST");
    expect(html).toContain('href="https://joi.ito.com/podcast/"');
    expect([...html.matchAll(/class="voices-scene-title">([^<]+)/g)].map(([, title]) => title)).toEqual(["LISTENING ROOM", "FRAGMENTS", "OBSERVED", "ENTER"]);
    expect(html).not.toContain("data-podcast-link");
    expect(html).not.toContain("data-podcast-player");
    expect(html).not.toContain('src="./podcast-preview.js"');
    expect(html).toContain('src="/demo-assets/gateway/thumbs/hero.png"');
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
  it("publishes the reference catalogue and fictional fixtures without collecting history", () => {
    expect(read("gateway-data.js")).toContain("communityPlays");
    expect(read("gateway-data.js")).toContain("episodes:");
    expect(existsSync("public/demo-assets/gateway/listening-history.js")).toBe(true);
    expect(existsSync("public/demo-assets/gateway/podcast-preview.js")).toBe(false);
    expect(read("listening-history.js")).toContain("i.ytimg.com/vi/");
  });
  it("asks the portal to answer as soon as the embedded home runs", () => {
    const { posted } = loadHomeLinkScript(read("index.html"));
    expect(posted).toContainEqual({ type: "henkaku:podcast:ready" });
  });
  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])("lets the browser handle modified Gateway links (%j)", (modifiers) => {
    const { click, posted, answerFromPortal } = loadHomeLinkScript(read("index.html"));
    answerFromPortal();
    expect(click("http://localhost:3102/setup", modifiers).prevented).toBe(false);
    expect(posted.some((message) => message.type === "henkaku:home:navigate")).toBe(false);
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
