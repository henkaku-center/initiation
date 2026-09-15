// ABOUTME: 申請ステータスの許可・拒否ルールを検証する。
// ABOUTME: 審査承認前の実行禁止、Allowlist追加前の配布禁止、終端状態の保護を確認する。
import { describe, expect, it } from "vitest";
import { currentStatus, validateTransition } from "@/lib/domain/applicationTransitions";
import type { Application } from "@/lib/domain/types";

function app(overrides: Partial<Application> = {}): Application {
  return {
    id: "a1",
    memberId: "m1",
    reviewStatus: "pending",
    allowlistStatus: "pending",
    distributionStatus: "pending",
    distributionTxId: null,
    reason: null,
    createdAt: "2026-08-06T00:00:00Z",
    updatedAt: "2026-08-06T00:00:00Z",
    ...overrides,
  };
}

describe("validateTransition", () => {
  it("allows pending -> approved for review", () => {
    expect(validateTransition(app(), "review", "approved")).toEqual({ ok: true });
  });

  it("allows needs_info -> rejected for review", () => {
    expect(validateTransition(app({ reviewStatus: "needs_info" }), "review", "rejected")).toEqual({ ok: true });
  });

  it("forbids changing a rejected review", () => {
    expect(validateTransition(app({ reviewStatus: "rejected" }), "review", "approved").ok).toBe(false);
  });

  it("forbids allowlist change before approval", () => {
    expect(validateTransition(app(), "allowlist", "added").ok).toBe(false);
  });

  it("allows allowlist pending -> added after approval", () => {
    expect(validateTransition(app({ reviewStatus: "approved" }), "allowlist", "added")).toEqual({ ok: true });
  });

  it("allows distribution failed -> sent retry after approval and allowlist", () => {
    expect(
      validateTransition(
        app({ reviewStatus: "approved", allowlistStatus: "added", distributionStatus: "failed" }),
        "distribution",
        "sent",
      ),
    ).toEqual({ ok: true });
  });

  // Runbook は「Allowlist 追加 → 配布」の直列。未登録アドレスへの転送はコントラクトが
  // 拒否するため、順序を守らない記録は実態と食い違う(Issue #112)。
  it("forbids recording a distribution before the allowlist is added", () => {
    for (const allowlistStatus of ["pending", "failed"] as const) {
      for (const toStatus of ["sent", "failed"]) {
        const result = validateTransition(app({ reviewStatus: "approved", allowlistStatus }), "distribution", toStatus);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toContain("Allowlist");
      }
    }
  });

  it("allows distribution once the allowlist is added", () => {
    expect(
      validateTransition(app({ reviewStatus: "approved", allowlistStatus: "added" }), "distribution", "sent"),
    ).toEqual({ ok: true });
    expect(
      validateTransition(app({ reviewStatus: "approved", allowlistStatus: "added" }), "distribution", "failed"),
    ).toEqual({ ok: true });
  });

  it("forbids leaving a terminal sent state", () => {
    expect(
      validateTransition(
        app({ reviewStatus: "approved", allowlistStatus: "added", distributionStatus: "sent" }),
        "distribution",
        "failed",
      ).ok,
    ).toBe(false);
  });

  // 再試行がまた失敗したときの理由を監査ログへ残せるようにする(Issue #20)。
  it("allows recording a repeated allowlist failure", () => {
    expect(
      validateTransition(app({ reviewStatus: "approved", allowlistStatus: "failed" }), "allowlist", "failed"),
    ).toEqual({ ok: true });
  });

  it("allows recording a repeated distribution failure", () => {
    expect(
      validateTransition(
        app({ reviewStatus: "approved", allowlistStatus: "added", distributionStatus: "failed" }),
        "distribution",
        "failed",
      ),
    ).toEqual({ ok: true });
  });

  // 完了状態の保護は維持する。added / sent から failed へは戻せない。
  it("forbids recording a failure after allowlist is added", () => {
    expect(
      validateTransition(app({ reviewStatus: "approved", allowlistStatus: "added" }), "allowlist", "failed").ok,
    ).toBe(false);
  });

  it("still forbids a repeated failure before approval", () => {
    expect(
      validateTransition(app({ reviewStatus: "pending", allowlistStatus: "failed" }), "allowlist", "failed").ok,
    ).toBe(false);
  });

  it("rejects an unknown status value", () => {
    expect(validateTransition(app(), "review", "banana").ok).toBe(false);
  });
});

describe("currentStatus", () => {
  it("returns the status of the given field", () => {
    const target = app({
      reviewStatus: "approved",
      allowlistStatus: "added",
      distributionStatus: "failed",
    });
    expect(currentStatus(target, "review")).toBe("approved");
    expect(currentStatus(target, "allowlist")).toBe("added");
    expect(currentStatus(target, "distribution")).toBe("failed");
  });
});
