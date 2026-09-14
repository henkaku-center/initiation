// ABOUTME: オンチェーン読み取り(残高・Allowlist)と申請記録から画面の表示状態を組み立てる。
// ABOUTME: 取得中・取得失敗・未保有/未追加・保有/追加済みを別の状態として返す(Issue #91)。
import type { Application } from "./types";

/** wagmi などの取得結果を、ネットワークやフレームワークに依存しない形に写したもの。 */
export type ChainReading<T> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; value: T };

/**
 * 1つの読み取り欄の表示。`negative` と `positive` だけが実際の値を持つ。
 * `—` や空欄を「未保有・未追加」の意味で使わないため、他の状態にも文言を持たせる。
 */
export type ReadingView =
  | { state: "disconnected"; text: string }
  | { state: "loading"; text: string }
  | { state: "error"; text: string }
  | { state: "negative"; text: string; verdict: string }
  | { state: "positive"; text: string; verdict: string };

const DISCONNECTED = "ウォレットを接続すると表示します";
const LOADING = "取得中…";
const FAILED = "取得できませんでした";

/**
 * 残高を整数に切り捨てて千区切りで返す。0より大きく1未満は「1未満」とし、
 * 切り捨てで少額の保有が「0」に見えないようにする(決定記録 2026-09-13)。
 */
export function formatHenkakuBalance(balance: bigint, decimals: number): string {
  if (balance <= 0n) return "0";
  const whole = balance / 10n ** BigInt(decimals);
  if (whole === 0n) return "1未満";
  return whole.toLocaleString("en-US");
}

export function tokenReadingView(input: {
  connected: boolean;
  balance: ChainReading<bigint>;
  decimals: number;
  symbol: string;
}): ReadingView {
  if (!input.connected) return { state: "disconnected", text: DISCONNECTED };
  if (input.balance.status === "loading") return { state: "loading", text: LOADING };
  if (input.balance.status === "error") return { state: "error", text: FAILED };
  const text = `${formatHenkakuBalance(input.balance.value, input.decimals)} ${input.symbol}`;
  return input.balance.value > 0n
    ? { state: "positive", text, verdict: "保有している" }
    : { state: "negative", text, verdict: "保有していない" };
}

export function allowlistReadingView(input: {
  connected: boolean;
  allowed: ChainReading<boolean>;
}): ReadingView {
  if (!input.connected) return { state: "disconnected", text: DISCONNECTED };
  if (input.allowed.status === "loading") return { state: "loading", text: LOADING };
  if (input.allowed.status === "error") return { state: "error", text: FAILED };
  return input.allowed.value
    ? { state: "positive", text: "追加済み", verdict: "追加済み" }
    : { state: "negative", text: "未追加", verdict: "未追加" };
}

export type AllowlistNote = { text: string; txId: string | null };

/**
 * オンチェーンの登録状況と申請記録が食い違ったときの補足文。
 * 2つを統合せず、確認できた状態をそのまま伝える。承認を確約する表現は使わない。
 * `onChain` が null(取得中・失敗)のときは補足しない。
 */
export function allowlistNote(onChain: boolean | null, application: Application | null): AllowlistNote | null {
  if (onChain === null || !application) return null;
  const recorded = application.allowlistStatus;
  if (onChain) {
    return recorded === "added"
      ? null
      : { text: "Allowlistには登録済みです。申請記録は未更新です", txId: null };
  }
  if (recorded === "added") {
    return { text: "オンチェーンで確認できません。運営に連絡してください", txId: application.distributionTxId };
  }
  if (recorded === "failed") return null; // 申請記録の行に「運営が対応中です」が出る
  switch (application.reviewStatus) {
    case "pending":
    case "needs_info":
      return { text: "申請が承認されると、運営が追加します", txId: null };
    case "approved":
      return { text: "運営による追加を待っています", txId: null };
    case "rejected":
      return null; // 申請記録の行に「見送りになりました」が出る
  }
}
