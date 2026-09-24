// ABOUTME: 認証後のServer Actionに設ける上限を、入口ごとの値として1箇所に定義する。
// ABOUTME: 数え方はDB側(consume_rate_limit)が持ち、ここは「何回まで」だけを持つ。

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

export type RateLimitRule = {
  /** rate_limits.bucket に入る識別子。 */
  bucket: string;
  limit: number;
  windowSeconds: number;
  /** 上限に達したことを利用者へ伝えるときの主語。 */
  label: string;
};

/**
 * 値は「自動化された連打だけを止め、人間の正当な操作は届かない」水準で決めている。
 *
 * 状態更新が1時間120回なのは、運営が申請30件をまとめて捌く場合を想定したもの
 * (1件あたり審査・Allowlist・配布で3操作 = 90回)。ここを絞りすぎると、
 * ノイズを減らす代わりに正当なまとめ作業を弾いてしまう。
 */
export const rateLimitRules = {
  applicationSubmit: {
    bucket: "application_submit",
    limit: 5,
    windowSeconds: DAY,
    label: "申請の送信",
  },
  checkin: {
    bucket: "checkin",
    limit: 20,
    windowSeconds: DAY,
    label: "チェックイン",
  },
  /**
   * 一言は「押す」とは別に数える。同じ枠だと、押した直後に書き足そうとして
   * 弾かれることがあり、「押してから書ける」が成立しなくなる(#46 / Issue #119)。
   */
  checkinNote: {
    bucket: "checkin_note",
    limit: 60,
    windowSeconds: DAY,
    label: "一言の保存",
  },
  applicationTransition: {
    bucket: "application_transition",
    limit: 120,
    windowSeconds: HOUR,
    label: "申請の状態更新",
  },
} as const satisfies Record<string, RateLimitRule>;

/**
 * 上限に達したときの画面表示。何回までなのかを添えるのは、
 * 「しばらく待て」だけだと利用者が再試行の見当を付けられないため。
 */
export function rateLimitMessage(rule: RateLimitRule): string {
  const window = rule.windowSeconds % DAY === 0
    ? `${rule.windowSeconds / DAY}日`
    : `${rule.windowSeconds / HOUR}時間`;
  return `${rule.label}が多すぎます。${window}あたり${rule.limit}回までです。時間をおいてからお試しください`;
}
