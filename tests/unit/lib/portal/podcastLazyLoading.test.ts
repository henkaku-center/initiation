import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

class Node {
  dataset: Record<string, string> = {};
  textContent = "old status";
  src = "";
  parts = new Map<string, Node>();
  attributes: Record<string, string> = {};
  children: Node[] = [];
  onerror?: () => void;
  replacement?: Node;
  remove = vi.fn();
  setAttribute(key: string, value: string) { this.attributes[key] = value; }
  querySelector(key: string) { return this.parts.get(key); }
  append(node: Node) { this.children.push(node); }
  replaceWith(node: Node) { this.replacement = node; }
}
function setup(apiReady = true) {
  const elements = Array.from({ length: 4 }, () => {
    const el = new Node();
    for (const key of ["[data-podcast-link]", "[data-podcast-label]", "[data-podcast-status]", "[data-podcast-player]"]) el.parts.set(key, new Node());
    return el;
  });
  const head = new Node();
  type Player = { frame: Node; events: { onReady: (event: {target: Player}) => void; onStateChange: (event: {data: number}) => void; onError: () => void }; pauseVideo: ReturnType<typeof vi.fn>; playVideo: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
  const players: Player[] = [];
  const api = { Player: function(frame: Node, options: {events: Player["events"]}) {
    const player = {frame, events:options.events, pauseVideo:vi.fn(), playVideo:vi.fn(), destroy:vi.fn()};
    players.push(player);
    return player;
  }};
  let notify: (entries: {isIntersecting: boolean}[]) => void = () => {};
  const disconnect = vi.fn();
  class Observer {
    constructor(callback: typeof notify) { notify = callback; }
    observe() {}
    disconnect = disconnect;
  }
  const root = { querySelectorAll: () => elements, querySelector: () => null };
  const win = { YT: apiReady ? api : undefined, addEventListener: vi.fn(), gatewayContent: {episodes: elements.map((_, i) => ({id:`video00000${i}`,title:`Episode ${i}`,guest:"Guest"}))} };
  runInNewContext(readFileSync("assets/reference/gateway/podcast-preview.js", "utf8"), {
    window: win, document: {head, querySelector: () => new Node(), createElement: () => new Node()},
    AbortController, IntersectionObserver: Observer, URLSearchParams, location: {origin:"https://local.example"}, setTimeout:vi.fn(() => 1), clearTimeout:vi.fn(),
  });
  const controller = new AbortController();
  (win as typeof win & {henkakuStartPodcast: (root: unknown, signal: AbortSignal) => void}).henkakuStartPodcast(root, controller.signal);
  return {elements, head, players, controller, disconnect, async approach() { notify([{isIntersecting:true}]); await Promise.resolve(); await Promise.resolve(); }};
}

describe("ordinary embedded YouTube playback", () => {
  it("defers external players until the video section approaches", async () => {
    const view = setup();
    expect(view.players).toHaveLength(0);
    await view.approach();
    expect(view.players).toHaveLength(4);
    for (const player of view.players) {
      const url = new URL(player.frame.src);
      expect(url.hostname).toBe("www.youtube-nocookie.com");
      expect(url.searchParams.get("controls")).toBe("1");
      expect(url.searchParams.get("autoplay")).toBe("0");
      expect(url.searchParams.has("mute")).toBe(false);
      expect(url.searchParams.has("disablekb")).toBe(false);
      expect(player.frame).not.toHaveProperty("inert");
      expect(player.frame).not.toHaveProperty("tabIndex", -1);
      player.events.onReady({target:player});
      expect(player.playVideo).not.toHaveBeenCalled();
    }
    expect(view.elements.every(el => el.parts.get("[data-podcast-status]")?.textContent === "")).toBe(true);
  });
  it("pauses other episodes only when the visitor starts a video, without forcing mute or seeking", async () => {
    const view = setup(); await view.approach();
    view.players.forEach(player => player.events.onReady({target:player}));
    view.players[1].events.onStateChange({data:1});
    expect(view.players[1].pauseVideo).not.toHaveBeenCalled();
    expect(view.players[0].pauseVideo).toHaveBeenCalledOnce();
    expect(view.players.every(player => player.playVideo.mock.calls.length === 0)).toBe(true);
  });
  it("leaves native iframe controls usable if the optional API cannot load", async () => {
    const view = setup(false); await view.approach();
    expect(view.elements.every(el => el.parts.get("[data-podcast-player]")?.replacement?.src.includes("controls=1"))).toBe(true);
    view.head.children[0].onerror?.();
    await Promise.resolve();
    expect(view.players).toHaveLength(0);
    expect(view.elements.every(el => el.parts.get("[data-podcast-status]")?.textContent === "")).toBe(true);
    view.controller.abort();
    expect(view.elements.every(el => el.parts.get("[data-podcast-player]")?.replacement?.remove.mock.calls.length === 1)).toBe(true);
  });
  it("destroys the owned players on route departure and reports only actual embed errors", async () => {
    const view = setup(); await view.approach();
    view.players[0].events.onError();
    expect(view.elements[0].parts.get("[data-podcast-status]")?.textContent).toContain("YouTubeのリンク");
    view.controller.abort();
    expect(view.players.every(player => player.destroy.mock.calls.length === 1)).toBe(true);
    expect(view.disconnect).toHaveBeenCalled();
  });
});
