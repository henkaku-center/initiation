// ABOUTME: レート制限の定義と、上限に達したときの文面を検証する。
// ABOUTME: 値そのものは判断の結果なので、意図せず変わったら気づけるように固定する。
import { describe, expect, it } from "vitest";
import { rateLimitMessage, rateLimitRules } from "@/lib/domain/rateLimits";

const DAY = 24 * 60 * 60;
const HOUR = 60 * 60;

describe("rateLimitRules", () => {
  it("keeps the agreed limits", () => {
    expect(rateLimitRules.applicationSubmit).toMatchObject({ limit: 5, windowSeconds: DAY });
    expect(rateLimitRules.checkin).toMatchObject({ limit: 20, windowSeconds: DAY });
    expect(rateLimitRules.applicationTransition).toMatchObject({ limit: 120, windowSeconds: HOUR });
    expect(rateLimitRules.checkinNote).toMatchObject({ limit: 60, windowSeconds: DAY });
  });

  it("uses a distinct bucket per entry point", () => {
    const buckets = Object.values(rateLimitRules).map((rule) => rule.bucket);
    expect(new Set(buckets).size).toBe(buckets.length);
  });

  it("lets an admin work through a batch of applications", () => {
    // 申請30件 × (審査・Allowlist・配布)の3操作 = 90回。まとめ作業で詰まらないこと。
    expect(rateLimitRules.applicationTransition.limit).toBeGreaterThanOrEqual(90);
  });

  it("counts writing a note separately from pressing check-in", () => {
    // 押した直後に書き足して弾かれると「押してから書ける」が成立しない(#46 / Issue #119)。
    expect(rateLimitRules.checkinNote.bucket).not.toBe(rateLimitRules.checkin.bucket);
  });
});

describe("rateLimitMessage", () => {
  it("tells the user how many attempts are allowed in what period", () => {
    expect(rateLimitMessage(rateLimitRules.applicationSubmit)).toBe(
      "申請の送信が多すぎます。1日あたり5回までです。時間をおいてからお試しください",
    );
  });

  it("renders sub-day windows in hours", () => {
    expect(rateLimitMessage(rateLimitRules.applicationTransition)).toBe(
      "申請の状態更新が多すぎます。1時間あたり120回までです。時間をおいてからお試しください",
    );
  });
});
