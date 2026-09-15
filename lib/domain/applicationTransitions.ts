// ABOUTME: 申請ステータスの遷移ルールを定義する。
// ABOUTME: 管理アクションは永続化前にこの純粋関数を通して状態を検証する。
import type { Application, StatusField } from "./types";

const REVIEW_TRANSITIONS: Record<string, string[]> = {
  pending: ["needs_info", "approved", "rejected"],
  needs_info: ["approved", "rejected"],
  approved: [],
  rejected: [],
};

// failed -> failed を許可しているのは、再試行がまた失敗したときの理由を
// application_events へ残せるようにするため(Issue #20)。状態は変わらないが、
// 「何回どう失敗したか」は追記型の監査ログにしか属さない情報で、Allowlist追加と
// HENKAKU配布は人手のオンチェーン操作なのでこの履歴が唯一の裏付けになる。
const EXECUTION_TRANSITIONS: Record<string, Record<string, string[]>> = {
  allowlist: {
    pending: ["added", "failed"],
    failed: ["added", "failed"],
    added: [],
  },
  distribution: {
    pending: ["sent", "failed"],
    failed: ["sent", "failed"],
    sent: [],
  },
};

export function currentStatus(app: Application, field: StatusField): string {
  if (field === "review") return app.reviewStatus;
  if (field === "allowlist") return app.allowlistStatus;
  return app.distributionStatus;
}

export function validateTransition(
  app: Application,
  field: StatusField,
  toStatus: string,
): { ok: true } | { ok: false; reason: string } {
  if (field === "review") {
    const allowed = REVIEW_TRANSITIONS[app.reviewStatus] ?? [];
    if (!allowed.includes(toStatus)) {
      return { ok: false, reason: `review: ${app.reviewStatus} -> ${toStatus} は許可されていません` };
    }
    return { ok: true };
  }

  if (app.reviewStatus !== "approved") {
    return { ok: false, reason: "承認前に実行状態は変更できません" };
  }

  // Runbook の「Allowlist 追加 → 配布」の直列を守る。未登録アドレスへの転送は
  // コントラクトが拒否するため、追加前の配布記録(成功・失敗とも)は実態と食い違う(Issue #112)。
  if (field === "distribution" && app.allowlistStatus !== "added") {
    return { ok: false, reason: "Allowlist 追加前に配布状態は変更できません" };
  }

  const transitions = EXECUTION_TRANSITIONS[field];
  if (!transitions) {
    return { ok: false, reason: `不明な状態フィールドです: ${field}` };
  }

  const current = currentStatus(app, field);
  const allowed = transitions[current] ?? [];
  if (!allowed.includes(toStatus)) {
    return { ok: false, reason: `${field}: ${current} -> ${toStatus} は許可されていません` };
  }
  return { ok: true };
}
