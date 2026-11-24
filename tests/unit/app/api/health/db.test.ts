// ABOUTME: DBヘルスチェック(GET /api/health/db)の応答を検証する。
// ABOUTME: 成功は204・失敗とタイムアウトは503で、本文は空、キャッシュ禁止、内部エラーを漏らさない。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pingMock } = vi.hoisted(() => ({ pingMock: vi.fn() }));

vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({ health: { ping: pingMock } }),
}));

import { DB_HEALTH_TIMEOUT_MS, GET, dynamic } from "@/app/api/health/db/route";

describe("GET /api/health/db", () => {
  beforeEach(() => {
    pingMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns 204 with an empty body when the database answers", async () => {
    pingMock.mockResolvedValue(undefined);

    const response = await GET();

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(pingMock).toHaveBeenCalledTimes(1);
    expect(pingMock.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });

  it("returns 503 with an empty body and no internal error when the query fails", async () => {
    pingMock.mockRejectedValue(new Error("connection refused: secret-host.internal sb_secret_xxx"));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 503 and aborts the query when the database does not answer in time", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    pingMock.mockImplementation((s: AbortSignal) => {
      signal = s;
      return new Promise(() => {});
    });

    const pending = GET();
    await vi.advanceTimersByTimeAsync(DB_HEALTH_TIMEOUT_MS);
    const response = await pending;

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
    expect(signal?.aborted).toBe(true);
  });

  // 同時に届いたリクエストは1回の問い合わせを共有し、DBへの往復を増やさない。
  it("shares one in-flight query between concurrent requests", async () => {
    let resolvePing: () => void = () => {};
    pingMock.mockImplementation(() => new Promise<void>((resolve) => (resolvePing = resolve)));

    const first = GET();
    const second = GET();
    resolvePing();
    const responses = await Promise.all([first, second]);

    expect(responses.map((r) => r.status)).toEqual([204, 204]);
    expect(pingMock).toHaveBeenCalledTimes(1);
  });

  it("runs a fresh query for each request once the previous one settled", async () => {
    pingMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("down"));

    expect((await GET()).status).toBe(204);
    expect((await GET()).status).toBe(503);
    expect(pingMock).toHaveBeenCalledTimes(2);
  });

  it("opts out of route caching", () => {
    expect(dynamic).toBe("force-dynamic");
  });
});
