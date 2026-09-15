import { afterEach, describe, expect, it, vi } from "vitest";
import { createPulseFetcher, PulseFetchError } from "@/lib/communityPulse/github";

const start = Date.parse("2026-09-14T03:00:00Z");
const issue = (number: number, overrides = {}) => ({
  number, title: `議題 ${number}`, state: "open", labels: [{ name: "community-pulse" }],
  html_url: `https://github.com/henkaku-center/initiation/issues/${number}`,
  updated_at: `2026-09-14T02:${String(number % 60).padStart(2, "0")}:00Z`,
  ...overrides,
});
const api = "https://api.github.com/repos/henkaku-center/initiation/issues";
const pageTwo = `${api}?state=open&labels=community-pulse&sort=updated&direction=desc&per_page=100&page=2`;
const pullRequests = (count = 100) => Array.from({ length: count }, (_, i) => issue(1000 + i, { pull_request: {} }));
afterEach(() => vi.useRealTimers());

describe("Community Pulse GitHub reader", () => {
  it("selects six labeled open issues after excluding PRs, newest first", async () => {
    const request = vi.fn().mockResolvedValue(Response.json([
      issue(20, { pull_request: {} }), issue(19, { state: "closed" }),
      issue(18, { labels: [{ name: "bug" }] }), ...Array.from({ length: 8 }, (_, i) => issue(i + 1)),
    ]));
    const result = await createPulseFetcher({ fetch: request, now: () => start })();
    expect(result.issues.map((item) => item.number)).toEqual([8, 7, 6, 5, 4, 3]);
    expect(result.lastSuccessAt).toBe("2026-09-14T03:00:00.000Z");
    const [url, options] = request.mock.calls[0];
    expect(new URL(url).origin + new URL(url).pathname).toBe(api);
    expect(Object.fromEntries(new URL(url).searchParams)).toMatchObject({ state: "open", labels: "community-pulse", sort: "updated", direction: "desc", per_page: "100" });
    expect(options).toMatchObject({ cache: "no-store", redirect: "error" });
    expect(options.headers.Authorization).toBeUndefined();
    expect(result.issues[0]).toEqual({ number: 8, title: "議題 8", url: `${"https://github.com/henkaku-center/initiation/issues/"}8`, updatedAt: "2026-09-14T02:08:00.000Z" });
  });

  it.each([
    `<${pageTwo}>; rel="next"`,
    '<https://api.github.com/repositories/1325289105/issues?state=open&labels=community-pulse&sort=updated&direction=desc&per_page=100&after=Y3Vyc29y&page=2>; rel="next"',
    undefined,
  ])("reads the next full page without depending on Link format (%s)", async (link) => {
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json(pullRequests(), { headers: link ? { Link: link } : {} }))
      .mockResolvedValueOnce(Response.json([issue(6), issue(5), issue(4), issue(3), issue(2), issue(1)]));
    const result = await createPulseFetcher({ fetch: request, now: () => start })();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0]).toBe(pageTwo);
    expect(result.issues).toHaveLength(6);
  });

  it("deduplicates issues seen on moving pages", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json([issue(8), ...pullRequests(99)], { headers: { Link: `<${pageTwo}>; rel="next"` } }))
      .mockResolvedValueOnce(Response.json([issue(8), issue(7)]));
    expect((await createPulseFetcher({ fetch: request })()).issues.map((item) => item.number)).toEqual([8, 7]);
  });

  it.each(["https://example.com/steal", `${api}?state=all`, `${api}?state=open&labels=other`])("ignores external pagination URL %s and keeps credentials on the fixed endpoint", async (next) => {
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json(pullRequests(), { headers: { Link: `<${next}>; rel="next"` } }))
      .mockResolvedValueOnce(Response.json([]));
    await expect(createPulseFetcher({ fetch: request, token: () => "test-token" })()).resolves.toHaveProperty("issues", []);
    expect(request).toHaveBeenCalledTimes(2);
    for (const [index, [url, options]] of request.mock.calls.entries()) {
      expect(url).toBe(`${api}?state=open&labels=community-pulse&sort=updated&direction=desc&per_page=100&page=${index + 1}`);
      expect(options.headers.Authorization).toBe("Bearer test-token");
      expect(options.redirect).toBe("error");
    }
  });

  it.each(["Community-Pulse", "COMMUNITY-PULSE", { name: "Community-Pulse" }, { name: "COMMUNITY-PULSE" }])("matches label capitalization returned by GitHub (%s)", async (label) => {
    const request = vi.fn().mockResolvedValue(Response.json([issue(1, { labels: [label] })]));
    expect((await createPulseFetcher({ fetch: request })()).issues.map((item) => item.number)).toEqual([1]);
  });

  it("stops after six issues even when the page is full", async () => {
    const request = vi.fn().mockResolvedValue(Response.json([
      ...pullRequests(94), ...Array.from({ length: 6 }, (_, i) => issue(i + 1)),
    ], { headers: { Link: `<${pageTwo}>; rel="next"` } }));
    expect((await createPulseFetcher({ fetch: request })()).issues).toHaveLength(6);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("rejects a failed later page instead of publishing the partial list", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json([issue(1), ...pullRequests(99)]))
      .mockResolvedValueOnce(new Response("upstream failure", { status: 503 }));
    await expect(createPulseFetcher({ fetch: request })()).rejects.toBeInstanceOf(PulseFetchError);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("treats a successful empty list as a timestamped snapshot", async () => {
    expect(await createPulseFetcher({ fetch: vi.fn().mockResolvedValue(Response.json([])), now: () => start })())
      .toEqual({ issues: [], lastSuccessAt: "2026-09-14T03:00:00.000Z" });
  });

  it.each([{}, [issue(1, { html_url: "javascript:alert(1)" })], [issue(1, { title: null })], [issue(1, { updated_at: "invalid" })]])("rejects malformed data instead of returning an empty success", async (body) => {
    await expect(createPulseFetcher({ fetch: vi.fn().mockResolvedValue(Response.json(body)) })()).rejects.toBeInstanceOf(PulseFetchError);
  });

  it("keeps titles as data and omits bodies, user details and credentials", async () => {
    const title = '<img src=x onerror="alert(1)">';
    const request = vi.fn().mockResolvedValue(Response.json([issue(1, { title, body: "private-to-display", user: { login: "someone" } })]));
    const result = await createPulseFetcher({ fetch: request, token: () => "test-token" })();
    expect(request.mock.calls[0][1].headers.Authorization).toBe("Bearer test-token");
    expect(result.issues[0].title).toBe(title);
    expect(JSON.stringify(result)).not.toMatch(/private-to-display|someone|test-token/);
  });

  it.each([
    [429, { "retry-after": "120" }, 120_000],
    [403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String((start + 180_000) / 1000) }, 180_000],
    [403, {}, 60_000],
    [503, {}, 60_000],
  ])("waits before retrying HTTP %s", async (status, headers, delay) => {
    let now = start;
    const request = vi.fn().mockResolvedValueOnce(new Response("DO NOT EXPOSE", { status, headers })).mockResolvedValue(Response.json([]));
    const load = createPulseFetcher({ fetch: request, now: () => now });
    await expect(load()).rejects.toMatchObject({ retryAt: start + delay });
    now += delay - 1;
    await expect(load()).rejects.toBeInstanceOf(PulseFetchError);
    expect(request).toHaveBeenCalledTimes(1);
    now++;
    await expect(load()).resolves.toHaveProperty("issues", []);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("shares an in-flight fetch and records success only after the response is complete", async () => {
    let now = start;
    let finish!: (response: Response) => void;
    const request = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
    const load = createPulseFetcher({ fetch: request, now: () => now });
    const a = load(), b = load();
    expect(request).toHaveBeenCalledTimes(1);
    now += 1000;
    finish(Response.json([issue(1)]));
    expect(await a).toEqual(await b);
    expect((await a).lastSuccessAt).toBe("2026-09-14T03:00:01.000Z");
  });

  it("bounds a paginated read instead of reporting partial data as complete", async () => {
    const request = vi.fn().mockImplementation(async () => Response.json(pullRequests()));
    await expect(createPulseFetcher({ fetch: request })()).rejects.toBeInstanceOf(PulseFetchError);
    expect(request).toHaveBeenCalledTimes(5);
  });

  it.each([0, 6])("accepts a complete result with %s issues on the fifth page", async (count) => {
    const request = vi.fn(async (url: string) => Response.json(new URL(url).searchParams.get("page") === "5"
      ? count === 0 ? [] : [...pullRequests(94), ...Array.from({ length: count }, (_, i) => issue(i + 1))]
      : pullRequests()));
    expect((await createPulseFetcher({ fetch: request })()).issues).toHaveLength(count);
    expect(request).toHaveBeenCalledTimes(5);
  });
});
