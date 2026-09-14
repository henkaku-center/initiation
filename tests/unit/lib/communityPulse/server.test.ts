// Run the installed Next cache with an in-memory storage adapter, not a mock of revalidation.
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("AsyncLocalStorage", AsyncLocalStorage);
const require = createRequire(import.meta.url);
const { workAsyncStorage } = require("next/dist/server/app-render/work-async-storage.external.js");
type Value = { kind: string; data: { body: string } };
const entries = new Map<string, { value: Value; storedAt: number }>();
const incrementalCache = {
  generateSimpleCacheKey: async (key: string) => key,
  async get(key: string, { revalidate }: { revalidate: number }) {
    const entry = entries.get(key);
    return entry ? { value: entry.value, isStale: Date.now() - entry.storedAt >= revalidate * 1000 } : null;
  },
  async set(key: string, value: Value) { entries.set(key, { value, storedAt: Date.now() }); },
};
async function request() {
  const { GET } = await import("@/app/api/community-pulse/route");
  const store = { incrementalCache, isStaticGeneration: false, pendingRevalidates: {} as Record<string, Promise<unknown>> };
  const response = await workAsyncStorage.run(store, GET);
  return { response, body: await response.json(), settled: () => Promise.all(Object.values(store.pendingRevalidates)) };
}
const raw = (title = "議題", number = 104) => ({ number, title, state: "open", labels: [{ name: "community-pulse" }], html_url: `https://github.com/henkaku-center/initiation/issues/${number}`, updated_at: "2026-09-14T02:00:00Z" });

beforeEach(() => { vi.resetModules(); entries.clear(); vi.useFakeTimers(); vi.setSystemTime("2026-09-14T03:00:00Z"); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Community Pulse Route Handler and Next Data Cache", () => {
  it("shares a successful snapshot across requests for one hour", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json([raw()]));
    vi.stubGlobal("fetch", fetch);
    const first = await request();
    await first.settled();
    expect(first.response.status).toBe(200);
    expect(first.response.headers.get("cache-control")).toBe("no-store");
    expect(first.body).toMatchObject({ status: "fresh", lastSuccessAt: "2026-09-14T03:00:00.000Z", issues: [{ number: 104 }] });
    vi.setSystemTime("2026-09-14T03:59:59Z");
    expect((await request()).body).toEqual(first.body);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("serves a stale snapshot immediately and updates title/closure after background revalidation", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([raw()])).mockResolvedValueOnce(Response.json([raw("更新された議題", 105)]));
    vi.stubGlobal("fetch", fetch);
    const first = await request(); await first.settled();
    vi.setSystemTime("2026-09-14T04:00:01Z");
    const stale = await request();
    expect(stale.body).toMatchObject({ status: "stale", lastSuccessAt: first.body.lastSuccessAt, issues: [{ number: 104 }] });
    await stale.settled();
    expect((await request()).body).toMatchObject({ status: "fresh", lastSuccessAt: "2026-09-14T04:00:01.000Z", issues: [{ number: 105, title: "更新された議題" }] });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps the last success on revalidation failure and respects retry-after", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([raw()])).mockResolvedValueOnce(new Response("upstream secret", { status: 429, headers: { "retry-after": "120" } })).mockResolvedValueOnce(Response.json([]));
    vi.stubGlobal("fetch", fetch);
    const first = await request(); await first.settled();
    vi.setSystemTime("2026-09-14T04:00:01Z");
    const stale = await request(); await stale.settled();
    const retry = await request(); await retry.settled();
    expect(retry.body).toEqual({ ...first.body, status: "stale" });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(retry.body)).not.toContain("secret");
    vi.advanceTimersByTime(120_000);
    const recovery = await request(); await recovery.settled();
    expect((await request()).body).toMatchObject({ status: "fresh", issues: [], lastSuccessAt: "2026-09-14T04:02:01.000Z" });
  });

  it("returns an unavailable response without manufacturing a success when the cache is empty", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("secret upstream URL"));
    vi.stubGlobal("fetch", fetch);
    const result = await request();
    expect(result.response.status).toBe(503);
    expect(result.response.headers.get("retry-after")).toBe("60");
    expect(result.body).toMatchObject({ status: "unavailable", issues: [], lastSuccessAt: null, sourceUrl: "https://github.com/henkaku-center/initiation/issues?q=is%3Aissue+is%3Aopen+label%3Acommunity-pulse" });
    expect(JSON.stringify(result.body)).not.toContain("secret");
    await request();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(entries.size).toBe(0);
  });
});
