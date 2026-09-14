import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

class Element {
  children: Element[] = [];
  attributes: Record<string, string> = {};
  textContent = "";
  href = "";
  target = "";
  rel = "";
  className = "";
  dateTime = "";
  constructor(readonly tag: string) {}
  append(...items: Element[]) { this.children.push(...items); }
  replaceChildren(...items: Element[]) { this.children = items; }
  setAttribute(name: string, value: string) { this.attributes[name] = value; }
  get text(): string { return this.textContent + this.children.map((child) => child.text).join(" "); }
  set innerHTML(_: string) { throw new Error("External data must not be parsed as HTML"); }
}
const issue = (number = 104, title = "参加の入口を改善する") => ({ number, title, url: `https://github.com/henkaku-center/initiation/issues/${number}`, updatedAt: "2026-09-14T02:00:00Z" });
const snapshot = (issues: unknown[] = [issue()], status = "fresh") => ({ issues, status, lastSuccessAt: "2026-09-14T03:00:00Z" });

function render(fetch = vi.fn().mockResolvedValue(Response.json(snapshot()))) {
  const list = new Element("div"), status = new Element("p"), time = new Element("p");
  const nodes: Record<string, Element> = { "[data-pulse-list]": list, "[data-pulse-status]": status, "[data-pulse-time]": time };
  const dispatchEvent = vi.fn();
  const addEventListener = vi.fn(), setInterval = vi.fn();
  const done = runInNewContext(readFileSync("assets/reference/gateway/community-pulse.js", "utf8"), {
    document: { querySelector: (selector: string) => nodes[selector], createElement: (tag: string) => new Element(tag) },
    window: { dispatchEvent, addEventListener }, fetch, Event, AbortSignal, setInterval,
  });
  return { done, list, status, time, fetch, dispatchEvent, addEventListener, setInterval };
}

describe("Community Pulse browser display", () => {
  it("shows loading until the one same-origin request completes", async () => {
    let finish!: (response: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
    const view = render(fetch);
    expect(view.list.attributes["aria-busy"]).toBe("true");
    expect(view.status.text).toContain("取得中");
    finish(Response.json(snapshot()));
    await view.done;
    expect(fetch).toHaveBeenCalledWith("/api/community-pulse", expect.objectContaining({ cache: "no-store", credentials: "omit" }));
    expect(view.list.attributes["aria-busy"]).toBe("false");
    expect(view.addEventListener).not.toHaveBeenCalled();
    expect(view.setInterval).not.toHaveBeenCalled();
  });

  it("renders six issue links, separate update/success times and a render event", async () => {
    const view = render(vi.fn().mockResolvedValue(Response.json(snapshot(Array.from({ length: 6 }, (_, i) => issue(i + 1))))));
    await view.done;
    expect(view.list.children).toHaveLength(6);
    expect(view.list.children[0]).toMatchObject({ tag: "a", href: "https://github.com/henkaku-center/initiation/issues/1", target: "_blank", rel: "noopener noreferrer" });
    expect(view.list.text).toContain("OPEN ISSUE / #1");
    expect(view.list.text).toContain("Issue更新");
    expect(view.time.text).toContain("最終取得");
    expect(view.time.text).toContain("12:00");
    expect(view.time.children[0].dateTime).toBe("2026-09-14T03:00:00Z");
    expect(view.status.text).not.toContain("最新情報ではない");
    expect(view.dispatchEvent.mock.calls[0][0].type).toBe("henkaku:pulse-rendered");
  });

  it("renders an untrusted title as literal text", async () => {
    const title = '<img src=x onerror="alert(1)">';
    const view = render(vi.fn().mockResolvedValue(Response.json(snapshot([issue(1, title)]))));
    await view.done;
    expect(view.list.text).toContain(title);
    expect(view.list.children[0].children[1].tag).toBe("strong");
  });

  it("keeps previous results and their original success time when stale", async () => {
    const view = render(vi.fn().mockResolvedValue(Response.json(snapshot([issue()], "stale"))));
    await view.done;
    expect(view.list.children).toHaveLength(1);
    expect(view.status.text).toContain("最新情報ではない可能性");
    expect(view.time.children[0].dateTime).toBe("2026-09-14T03:00:00Z");
  });

  it.each(["fresh", "stale"])("distinguishes an empty %s snapshot from failure", async (state) => {
    const view = render(vi.fn().mockResolvedValue(Response.json(snapshot([], state))));
    await view.done;
    expect(view.list.children).toHaveLength(0);
    expect(view.status.text).toContain("掲載対象のIssueはありません");
    expect(view.status.text.includes("最新情報ではない可能性")).toBe(state === "stale");
    expect(view.time.text).toContain("最終取得");
  });

  it.each([503, 429])("shows an unavailable message without an invented timestamp on HTTP %s", async (code) => {
    const view = render(vi.fn().mockResolvedValue(new Response("upstream detail", { status: code })));
    await view.done;
    expect(view.status.text).toContain("取得できませんでした");
    expect(view.status.text).toContain("GitHub");
    expect(view.status.text).not.toContain("upstream detail");
    expect(view.time.text).toBe("");
    expect(view.list.children).toHaveLength(0);
    expect(view.list.attributes["aria-busy"]).toBe("false");
  });

  it.each([
    { ...snapshot(), lastSuccessAt: null },
    snapshot([issue(1), { ...issue(2), url: "https://example.com/" }]),
    snapshot([{ ...issue(1), url: "javascript:alert(1)" }]),
    snapshot([{ ...issue(1), updatedAt: "bad-date" }]),
    snapshot(Array.from({ length: 7 }, (_, i) => issue(i + 1))),
  ])("rejects malformed data without publishing partial cards", async (body) => {
    const view = render(vi.fn().mockResolvedValue(Response.json(body)));
    await view.done;
    expect(view.list.children).toHaveLength(0);
    expect(view.time.text).toBe("");
    expect(view.status.text).toContain("取得できませんでした");
  });

  it("handles a timeout without preventing the rest of the script from completing", async () => {
    const view = render(vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));
    await view.done;
    expect(view.status.text).toContain("取得できませんでした");
    expect(view.list.attributes["aria-busy"]).toBe("false");
  });
});
