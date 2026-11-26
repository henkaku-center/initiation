// ABOUTME: 承認済み申請をSafeへ受け渡すときの値と、申請が今どの工程にあるかを定義する(Issue #137)。
// ABOUTME: 値の正本は docs/runbook-manual-operations.md の「運用入力」。変更は決定記録を追加してから行う。
import type { Application } from "./types";

/**
 * Runbookの運用入力と同じ値。すべて公開情報で、秘密鍵や署名者の情報は含めない。
 * Runbookと食い違うと tests/unit/lib/domain/safeHandoff.test.ts が落ちる。
 */
export const SAFE_OPERATIONS = {
  chainId: 137,
  /** Safe WalletのURLで使うPolygonの短縮名。 */
  safeChainPrefix: "matic",
  tokenAddress: "0x0cc91a5FFC2E9370eC565Ab42ECE33bbC08C11a2",
  allowlistSafe: "0x3F1D35bF5f182D7b4ef95a3f298f059BC33d2020",
  allowlistMethod: "addWhitelistUser",
  distributionSafe: "0x1C9D58eBd2A9F4952C2A4a8f9906FeF133056a33",
  /** Safeの「Send tokens」へ入力するトークン単位の数量(weiではない)。 */
  distributionAmount: "10",
} as const;

/** 指定したSafeをPolygonで開くSafe WalletのURL。 */
export function safeHomeUrl(safeAddress: string): string {
  return `https://app.safe.global/home?safe=${SAFE_OPERATIONS.safeChainPrefix}:${safeAddress}`;
}

export type HandoffStage = "allowlist" | "distribution" | "done";

/**
 * 申請が今どの工程にあるか。承認前と却下後は工程がない。
 * 配布はAllowlist追加の完了を記録してからにする(Runbookの直列フロー、Issue #112)。
 */
export function handoffStage(
  application: Pick<Application, "reviewStatus" | "allowlistStatus" | "distributionStatus">,
): HandoffStage | null {
  if (application.reviewStatus !== "approved") return null;
  if (application.allowlistStatus !== "added") return "allowlist";
  if (application.distributionStatus !== "sent") return "distribution";
  return "done";
}
