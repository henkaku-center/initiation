// ABOUTME: オンチェーン読み取りと申請記録から表示状態を組み立てる純粋関数を固定する。
// ABOUTME: 取得中・失敗を未保有/未追加と混同せず、1未満の残高を0と区別する(Issue #91)。
import { describe, expect, it } from "vitest";
import type { Application } from "@/lib/domain/types";
import {
  allowlistNote,
  allowlistReadingView,
  formatHenkakuBalance,
  tokenReadingView,
} from "@/lib/domain/walletStatus";

const ONE = BigInt(10) ** BigInt(18);
const n = BigInt;

describe("formatHenkakuBalance", () => {
  it("shows zero as 0", () => {
    expect(formatHenkakuBalance(n(0), 18)).toBe("0");
  });
  it("shows a balance below one token as 1未満 instead of rounding to 0", () => {
    expect(formatHenkakuBalance(n(1), 18)).toBe("1未満");
    expect(formatHenkakuBalance(ONE - n(1), 18)).toBe("1未満");
  });
  it("floors to an integer with thousands separators", () => {
    expect(formatHenkakuBalance(ONE, 18)).toBe("1");
    expect(formatHenkakuBalance(n(10) * ONE, 18)).toBe("10");
    expect(formatHenkakuBalance(n(1234) * ONE + ONE / n(2), 18)).toBe("1,234");
  });
  it("respects the configured decimals", () => {
    expect(formatHenkakuBalance(n(2500), 3)).toBe("2");
  });
});

describe("tokenReadingView", () => {
  const base = { connected: true, decimals: 18, symbol: "HENKAKU" };
  it("asks for a wallet connection before reading", () => {
    const view = tokenReadingView({ ...base, connected: false, balance: { status: "loading" } });
    expect(view.state).toBe("disconnected");
    expect(view.text).toContain("接続");
  });
  it("keeps loading distinct from not holding", () => {
    const view = tokenReadingView({ ...base, balance: { status: "loading" } });
    expect(view.state).toBe("loading");
    expect(view.text).not.toContain("0");
    expect(view.text).not.toContain("保有していない");
  });
  it("keeps failure distinct from not holding", () => {
    const view = tokenReadingView({ ...base, balance: { status: "error" } });
    expect(view.state).toBe("error");
    expect(view.text).toContain("取得できませんでした");
  });
  it("shows a zero balance as not holding", () => {
    const view = tokenReadingView({ ...base, balance: { status: "ready", value: n(0) } });
    expect(view).toMatchObject({ state: "negative", text: "0 HENKAKU", verdict: "保有していない" });
  });
  it("shows a positive balance with the holding verdict", () => {
    const view = tokenReadingView({ ...base, balance: { status: "ready", value: n(10) * ONE } });
    expect(view).toMatchObject({ state: "positive", text: "10 HENKAKU", verdict: "保有している" });
  });
  it("treats dust as holding", () => {
    const view = tokenReadingView({ ...base, balance: { status: "ready", value: n(1) } });
    expect(view).toMatchObject({ state: "positive", text: "1未満 HENKAKU", verdict: "保有している" });
  });
});

describe("allowlistReadingView", () => {
  it("asks for a wallet connection before reading", () => {
    expect(allowlistReadingView({ connected: false, allowed: { status: "loading" } }).state).toBe("disconnected");
  });
  it("keeps loading and failure distinct from not added", () => {
    expect(allowlistReadingView({ connected: true, allowed: { status: "loading" } }).state).toBe("loading");
    const failed = allowlistReadingView({ connected: true, allowed: { status: "error" } });
    expect(failed.state).toBe("error");
    expect(failed.text).toContain("取得できませんでした");
  });
  it("shows added and not added", () => {
    expect(allowlistReadingView({ connected: true, allowed: { status: "ready", value: true } })).toMatchObject({ state: "positive", text: "追加済み" });
    expect(allowlistReadingView({ connected: true, allowed: { status: "ready", value: false } })).toMatchObject({ state: "negative", text: "未追加" });
  });
});

describe("allowlistNote", () => {
  const application: Application = { id: "a1", memberId: "m1", reviewStatus: "pending", allowlistStatus: "pending", distributionStatus: "pending", distributionTxId: null, reason: null, createdAt: "2026-09-12", updatedAt: "2026-09-12" };
  const app = (patch: Partial<Application>): Application => ({ ...application, ...patch });

  it("says nothing without an application or without an on-chain reading", () => {
    expect(allowlistNote(true, null)).toBeNull();
    expect(allowlistNote(false, null)).toBeNull();
    expect(allowlistNote(null, app({ allowlistStatus: "added" }))).toBeNull();
  });
  it("reports an on-chain registration the record has not caught up with", () => {
    const expected = "Allowlistには登録済みです。申請記録は未更新です";
    expect(allowlistNote(true, app({ allowlistStatus: "pending" }))?.text).toBe(expected);
    expect(allowlistNote(true, app({ allowlistStatus: "failed" }))?.text).toBe(expected);
    expect(allowlistNote(true, app({ allowlistStatus: "added" }))).toBeNull();
  });
  it("asks to contact operators when the record says added but the chain does not", () => {
    const note = allowlistNote(false, app({ allowlistStatus: "added", distributionTxId: "0xabc" }));
    expect(note?.text).toBe("オンチェーンで確認できません。運営に連絡してください");
    expect(note?.txId).toBe("0xabc");
  });
  it("does not promise approval while the review is still open", () => {
    const expected = "申請が承認されると、運営が追加します";
    expect(allowlistNote(false, app({ reviewStatus: "pending" }))?.text).toBe(expected);
    expect(allowlistNote(false, app({ reviewStatus: "needs_info" }))?.text).toBe(expected);
  });
  it("separates waiting for the operator after approval", () => {
    expect(allowlistNote(false, app({ reviewStatus: "approved" }))?.text).toBe("運営による追加を待っています");
  });
  it("leaves rejected and failed records to the application rows", () => {
    expect(allowlistNote(false, app({ reviewStatus: "rejected" }))).toBeNull();
    expect(allowlistNote(false, app({ reviewStatus: "approved", allowlistStatus: "failed" }))).toBeNull();
  });
});
