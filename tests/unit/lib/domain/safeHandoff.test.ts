// ABOUTME: Safeへの受け渡しに使う値と、申請の現在の工程の判定を固定する(Issue #137)。
// ABOUTME: 値の正本はRunbookの運用入力なので、コード側の値がRunbookと食い違えば落とす。
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { handoffStage, SAFE_OPERATIONS, safeHomeUrl } from "@/lib/domain/safeHandoff";
import type { Application } from "@/lib/domain/types";

const runbook = readFileSync("docs/runbook-manual-operations.md", "utf8");

/** 運用入力の表から、項目名で始まる行の最初のコード表記を取り出す。 */
function runbookValue(label: string): string {
  const row = runbook.split("\n").find((line) => line.startsWith(`| ${label} |`));
  if (!row) throw new Error(`Runbookに「${label}」の行がありません`);
  const value = row.match(/`([^`]+)`/)?.[1];
  if (!value) throw new Error(`「${label}」の行に値がありません`);
  return value;
}

function application(overrides: Partial<Application> = {}): Application {
  return {
    id: "a1",
    memberId: "m1",
    reviewStatus: "approved",
    allowlistStatus: "pending",
    distributionStatus: "pending",
    distributionTxId: null,
    reason: null,
    createdAt: "2026-11-26T00:00:00Z",
    updatedAt: "2026-11-26T00:00:00Z",
    ...overrides,
  };
}

describe("SAFE_OPERATIONS", () => {
  it("matches the operational inputs in the Runbook", () => {
    expect(SAFE_OPERATIONS.tokenAddress).toBe(runbookValue("HENKAKUトークンコントラクト"));
    expect(SAFE_OPERATIONS.allowlistSafe).toBe(runbookValue("Allowlist追加の実行元 Safe"));
    expect(SAFE_OPERATIONS.distributionSafe).toBe(runbookValue("HENKAKU配布の実行元 Safe"));
    expect(runbookValue("Allowlist追加の呼び出し")).toContain(SAFE_OPERATIONS.allowlistMethod);
    expect(runbook).toContain(`申請者1名あたり **${SAFE_OPERATIONS.distributionAmount} HENKAKU**`);
    expect(runbook).toContain(`Polygon(chain ID ${SAFE_OPERATIONS.chainId})`);
  });

  it("keeps the two Safes distinct", () => {
    expect(SAFE_OPERATIONS.allowlistSafe).not.toBe(SAFE_OPERATIONS.distributionSafe);
  });
});

describe("safeHomeUrl", () => {
  it("opens the Safe on Polygon", () => {
    expect(safeHomeUrl(SAFE_OPERATIONS.allowlistSafe)).toBe(
      "https://app.safe.global/home?safe=matic:0x3F1D35bF5f182D7b4ef95a3f298f059BC33d2020",
    );
  });
});

describe("handoffStage", () => {
  it("has no stage before approval", () => {
    for (const reviewStatus of ["pending", "needs_info", "rejected"] as const) {
      expect(handoffStage(application({ reviewStatus }))).toBeNull();
    }
  });

  it("starts with the allowlist after approval", () => {
    expect(handoffStage(application())).toBe("allowlist");
  });

  it("stays on the allowlist while its attempt has failed", () => {
    expect(handoffStage(application({ allowlistStatus: "failed" }))).toBe("allowlist");
  });

  it("moves to distribution only after the allowlist is added", () => {
    expect(handoffStage(application({ allowlistStatus: "added" }))).toBe("distribution");
    expect(handoffStage(application({ allowlistStatus: "added", distributionStatus: "failed" }))).toBe("distribution");
  });

  it("is done once the distribution is sent", () => {
    expect(handoffStage(application({ allowlistStatus: "added", distributionStatus: "sent" }))).toBe("done");
  });
});
