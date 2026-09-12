// ABOUTME: Exercise public music fetching and rendering without a live service.
// ABOUTME: Failure, empty data and untrusted metadata must never become fictional plays.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

class Element {
  children: Element[] = [];
  attributes: Record<string, string> = {};
  textContent = "";
  href = "";
  className = "";
  hidden = false;
  disabled = false;
  listeners: Record<string, () => Promise<void>> = {};
  constructor(readonly tag: string) {}
  append(...items: Element[]) { this.children.push(...items); }
  replaceChildren(...items: Element[]) { this.children = items; }
  setAttribute(name: string, value: string) { this.attributes[name] = value; }
  addEventListener(name: string, callback: () => Promise<void>) { this.listeners[name] = callback; }
  get text(): string { return this.textContent + this.children.map((child) => child.text).join(" "); }
}
const recording = { track_name: "A song", artist_name: "An artist", listen_count: 321, recording_mbid: "6f33dc05-cdc0-4a2f-8039-e8fed082eec6" };
const payload = (recordings: unknown[] = [recording]) => ({ payload: { recordings, from_ts: 1788134400, to_ts: 1788739200, last_updated: 1789180716, range: "week" } });

function render(fetch = vi.fn().mockResolvedValue(Response.json(payload()))) {
  const list = new Element("ol"), status = new Element("p"), period = new Element("p"), retry = new Element("button");
  const nodes: Record<string, Element> = { "[data-track-list]": list, "[data-frequency-status]": status, "[data-frequency-period]": period, "[data-frequency-retry]": retry };
  const done = runInNewContext(readFileSync("assets/reference/gateway/frequency.js", "utf8"), {
    document: { querySelector: (selector: string) => nodes[selector], createElement: (tag: string) => new Element(tag) },
    fetch, AbortSignal, Intl, Date, URL,
  });
  return { list, status, period, retry, fetch, done };
}

describe("Frequency public music", () => {
  it("loads aggregate weekly tracks without credentials and renders the actual period", async () => {
    const view = render();
    await view.done;
    expect(view.fetch).toHaveBeenCalledWith("https://api.listenbrainz.org/1/stats/sitewide/recordings?range=week&count=4", expect.objectContaining({ credentials: "omit", referrerPolicy: "no-referrer", signal: expect.any(AbortSignal) }));
    expect(view.list.text).toContain("A song");
    expect(view.list.text).toContain("An artist");
    expect(view.list.text).toContain("321 再生");
    expect(view.list.children[0].children[0].href).toBe("https://musicbrainz.org/recording/6f33dc05-cdc0-4a2f-8039-e8fed082eec6");
    expect(view.period.text).toMatch(/2026.*08.*31.*2026.*09.*06/);
    expect(view.period.text).toContain("UTC");
    expect(view.list.attributes["aria-busy"]).toBe("false");
    expect(view.retry.hidden).toBe(true);
  });
  it("shows loading until the request settles", async () => {
    let resolve!: (response: Response) => void;
    const view = render(vi.fn().mockReturnValue(new Promise<Response>((done) => { resolve = done; })));
    expect(view.status.text).toContain("取得中");
    expect(view.list.children).toHaveLength(0);
    expect(view.list.attributes["aria-busy"]).toBe("true");
    resolve(Response.json(payload()));
    await view.done;
  });
  it.each([new Response(null, { status: 204 }), Response.json(payload([]))])("shows an empty state without sample tracks", async (response) => {
    const view = render(vi.fn().mockResolvedValue(response));
    await view.done;
    expect(view.status.text).toContain("まだありません");
    expect(view.list.children).toHaveLength(0);
  });
  it.each([new Response(null, { status: 429 }), new Response("broken", { status: 503 }), Response.json({}), Response.json(payload([{ ...recording, listen_count: "321" }]))])("handles HTTP and malformed responses honestly", async (response) => {
    const view = render(vi.fn().mockResolvedValue(response));
    await view.done;
    expect(view.status.text).toContain("取得できませんでした");
    expect(view.list.children).toHaveLength(0);
    expect(view.retry.hidden).toBe(false);
  });
  it("allows an explicit retry after a network failure", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError("Network failed")).mockResolvedValueOnce(Response.json(payload()));
    const view = render(fetch);
    await view.done;
    expect(view.status.text).toContain("取得できませんでした");
    await view.retry.listeners.click();
    expect(view.list.children).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("renders external text as text, ignores injected links and limits the list to four", async () => {
    const item = { ...recording, track_name: '<img src=x onerror="alert(1)">', recording_mbid: "javascript:alert(1)" };
    const view = render(vi.fn().mockResolvedValue(Response.json(payload(Array(8).fill(item)))));
    await view.done;
    expect(view.list.children).toHaveLength(4);
    expect(view.list.text).toContain(item.track_name);
    expect(view.list.children[0].children[0].href).toBe("https://listenbrainz.org/statistics/?range=week");
  });
});
