import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

type Handler = (event: Record<string, unknown>) => void;
class ElementStub {
  dataset: Record<string, string> = {};
  textContent = "";
  src = "";
  id = "";
  disabled = false;
  children: ElementStub[] = [];
  parts = new Map<string, ElementStub>();
  handlers = new Map<string, Handler>();
  constructor(readonly tagName = "div") {}
  querySelector(selector: string) { return this.parts.get(selector); }
  setAttribute() {}
  addEventListener(name: string, handler: Handler) { this.handlers.set(name, handler); }
  replaceChildren(...children: ElementStub[]) { this.children = children; }
  appendChild(child: ElementStub) { this.children.push(child); }
  replaceWith = vi.fn();
  getBoundingClientRect() { return { top: 5000, height: 2000 }; }
}

function setup({ embedded = false, apiReady = false } = {}) {
  const windowHandlers = new Map<string, Handler>();
  const documentHandlers = new Map<string, Handler>();
  const toggle = new ElementStub("button");
  const section = new ElementStub();
  const head = new ElementStub("head");
  const elements = Array.from({ length: 4 }, () => {
    const element = new ElementStub();
    for (const selector of ["[data-podcast-link]", "[data-podcast-label]", ".podcast-screen", "[data-podcast-status]", "[data-podcast-player]"]) {
      element.parts.set(selector, new ElementStub());
    }
    return element;
  });
  const observers: Array<{ targets: ElementStub[]; emit: (visible: boolean) => void; disconnect: ReturnType<typeof vi.fn> }> = [];
  class Observer {
    targets: ElementStub[] = [];
    disconnect = vi.fn();
    constructor(private callback: (entries: unknown[]) => void) { observers.push(this); }
    observe(target: ElementStub) { this.targets.push(target); }
    emit(visible: boolean) {
      this.callback(this.targets.map(target => ({ target, isIntersecting: visible, intersectionRatio: visible ? 1 : 0 })));
    }
  }
  const playerFactory = vi.fn(function () { return { destroy: vi.fn() }; });
  const timers = {
    setTimeout: vi.fn(() => 1), clearTimeout: vi.fn(),
    setInterval: vi.fn(() => 2), clearInterval: vi.fn(),
  };
  const win = {
    parent: {} as object,
    gatewayMock: { episodes: elements.map((_, index) => ({ id: `video00000${index}`, title: `Episode ${index}` })) },
    matchMedia: () => ({ matches: false, addEventListener: vi.fn() }),
    addEventListener: (name: string, handler: Handler) => windowHandlers.set(name, handler),
    YT: apiReady ? { Player: playerFactory } : undefined,
    onYouTubeIframeAPIReady: undefined as (() => void) | undefined,
    innerHeight: 900,
  };
  win.parent = embedded ? { postMessage: vi.fn() } : win;
  const doc = {
    head, readyState: "complete", hidden: false,
    querySelectorAll: () => elements,
    querySelector: (selector: string) => selector === "[data-podcast-toggle]" ? toggle : section,
    createElement: (tag: string) => new ElementStub(tag),
    addEventListener: (name: string, handler: Handler) => documentHandlers.set(name, handler),
  };
  runInNewContext(readFileSync("public/demo-assets/gateway/podcast-preview.js", "utf8"), {
    window: win, document: doc, location: { origin: "https://demo.example" },
    IntersectionObserver: Observer, URLSearchParams, ...timers,
  });
  return {
    head, toggle, elements, playerFactory, timers, observers,
    approach() { observers.forEach(observer => observer.emit(true)); },
    activate(active: boolean) {
      windowHandlers.get("message")?.({ origin: "https://demo.example", source: win.parent, data: { type: "henkaku:home-state", active, paused: false } });
    },
    setHidden(hidden: boolean) { doc.hidden = hidden; documentHandlers.get("visibilitychange")?.({}); },
    click() { toggle.handlers.get("click")?.({}); },
    leave() { windowHandlers.get("pagehide")?.({ persisted: false }); },
    suspend() { windowHandlers.get("pagehide")?.({ persisted: true }); },
    restore() { windowHandlers.get("pageshow")?.({ persisted: true }); },
    apiLoaded() { win.YT = { Player: playerFactory }; win.onYouTubeIframeAPIReady?.(); },
  };
}

describe("podcast JavaScript loading", () => {
  it("does not fetch YouTube or start playback polling on the initial home view", () => {
    const page = setup();
    expect(page.head.children).toHaveLength(0);
    expect(page.timers.setInterval).not.toHaveBeenCalled();
    expect(page.playerFactory).not.toHaveBeenCalled();
  });

  it("still defers player construction if another feature has already loaded the API", () => {
    const page = setup({ apiReady: true });
    expect(page.playerFactory).not.toHaveBeenCalled();
    page.approach();
    expect(page.playerFactory).toHaveBeenCalledTimes(4);
  });

  it("loads the API once when the video section approaches and attaches four players", () => {
    const page = setup();
    page.approach();
    page.approach();
    expect(page.head.children.map(script => script.src)).toEqual(["https://www.youtube.com/iframe_api"]);
    expect(page.playerFactory).not.toHaveBeenCalled();
    page.apiLoaded();
    expect(page.playerFactory).toHaveBeenCalledTimes(4);
    expect(page.timers.setInterval).toHaveBeenCalledTimes(1);
    page.approach();
    expect(page.playerFactory).toHaveBeenCalledTimes(4);
  });

  it("waits until the intro has closed even if the hidden video section is near", () => {
    const page = setup({ embedded: true });
    page.approach();
    expect(page.head.children).toHaveLength(0);
    page.activate(true);
    expect(page.head.children).toHaveLength(1);
  });

  it("does not load just because the home becomes active while videos are still far away", () => {
    const page = setup({ embedded: true });
    page.activate(true);
    expect(page.head.children).toHaveLength(0);
  });

  it("can start loading on the play button before the observer callback arrives", () => {
    const page = setup();
    expect(page.head.children).toHaveLength(0);
    page.click();
    expect(page.head.children).toHaveLength(1);
    expect(page.toggle.textContent).toBe("映像を一時停止");
  });

  it("waits for a background tab to become visible", () => {
    const page = setup();
    page.setHidden(true);
    page.approach();
    expect(page.head.children).toHaveLength(0);
    page.setHidden(false);
    expect(page.head.children).toHaveLength(1);
  });

  it("ignores visibility and late API readiness after leaving the page", () => {
    const page = setup();
    page.approach();
    page.leave();
    page.apiLoaded();
    page.approach();
    expect(page.playerFactory).not.toHaveBeenCalled();
    expect(page.observers.every(observer => observer.disconnect.mock.calls.length > 0)).toBe(true);
  });

  it("checks visibility and the parent state again after restoring an unloaded page", () => {
    const page = setup({ embedded: true });
    page.activate(true);
    page.suspend();
    page.approach();
    expect(page.head.children).toHaveLength(0);
    page.restore();
    page.approach();
    expect(page.head.children).toHaveLength(0);
    page.activate(true);
    expect(page.head.children).toHaveLength(1);
  });

  it("reuses already-created players when restoring a page from the back/forward cache", () => {
    const page = setup();
    page.approach();
    page.apiLoaded();
    page.suspend();
    page.restore();
    page.approach();
    expect(page.head.children).toHaveLength(1);
    expect(page.playerFactory).toHaveBeenCalledTimes(4);
    expect(page.timers.setInterval).toHaveBeenCalledTimes(1);
  });
});
