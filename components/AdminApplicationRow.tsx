// ABOUTME: 申請1件の行と、現在状態に応じた管理操作を表示する。
// ABOUTME: 状態変更はServer Actionへ委譲し、成功後に一覧を再取得する。配布の操作は Allowlist 追加後にだけ出す。
"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { AdminApplicationHistory } from "@/components/AdminApplicationHistory";
import { fieldLabel } from "@/lib/applicationEventLabels";
import type { EventByField } from "@/lib/domain/applicationEvents";
import type { ApplicationEvent, ApplicationWithMember, StatusField } from "@/lib/domain/types";
import { transitionApplication } from "@/app/admin/actions";
import { formatJst } from "@/lib/datetime";
import { buttonStyles, inputStyles } from "@/lib/ui";

const FIELDS: StatusField[] = ["review", "allowlist", "distribution"];

export function AdminApplicationRow({
  application,
  reasons = {},
  txIds = {},
  events = [],
}: {
  application: ApplicationWithMember;
  reasons?: EventByField;
  txIds?: EventByField;
  events?: ApplicationEvent[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState("");
  const [allowlistTxId, setAllowlistTxId] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(field: StatusField, toStatus: string, extra?: { reason?: string; txId?: string }) {
    setError(null);
    startTransition(async () => {
      const result = await transitionApplication({
        applicationId: application.id,
        field,
        toStatus,
        ...extra,
      });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "操作に失敗しました");
      }
    });
  }

  const review = application.reviewStatus;
  // Runbook の直列フロー(Allowlist 追加 → 配布)を画面でも守る(Issue #112)。
  const allowlistAdded = application.allowlistStatus === "added";
  const canRecordDistribution = review === "approved" && allowlistAdded && application.distributionStatus !== "sent";
  const recorded = FIELDS.map((field) => ({ field, reason: reasons[field], tx: txIds[field] })).filter(
    (entry) => entry.reason || entry.tx,
  );

  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <span className="font-mono text-xs text-foreground" title={application.walletAddress}>
          {application.walletAddress}
        </span>
        {application.displayName && <small className="mt-1 block text-muted">（{application.displayName}）</small>}
      </td>
      <td className="px-4 py-4 font-semibold text-foreground">{review}</td>
      <td className="px-4 py-4 font-semibold text-foreground">{application.allowlistStatus}</td>
      <td className="px-4 py-4 font-semibold text-foreground">{application.distributionStatus}</td>
      <td className="min-w-[28rem] px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {(review === "pending" || review === "needs_info") && (
            <>
            <button className={buttonStyles.primary} type="button" disabled={pending} onClick={() => run("review", "approved")}>
              承認
            </button>
            {/* 却下と要追加情報は理由が申請者へそのまま表示される(Issue #19)。
                承認は理由を使わないため、入力欄はこの2つの操作の隣に置く。 */}
            <label className="flex items-center gap-2 text-sm font-semibold text-muted">
              <span className="sr-only">却下・要追加情報の理由</span>
              <input
                className={`${inputStyles} inline-block w-64 text-sm`}
                type="text"
                value={reviewReason}
                onChange={(event) => setReviewReason(event.target.value)}
                placeholder="理由（申請者に表示）"
              />
            </label>
            <button
              className={buttonStyles.secondary}
              type="button"
              disabled={pending}
              onClick={() => run("review", "rejected", { reason: reviewReason })}
            >
              却下
            </button>
            {review === "pending" && (
              <button
                className={buttonStyles.quiet}
                type="button"
                disabled={pending}
                onClick={() => run("review", "needs_info", { reason: reviewReason })}
              >
                要追加情報
              </button>
            )}
            </>
          )}
          {review === "approved" && application.allowlistStatus !== "added" && (
            <>
              {/* Allowlist追加もオンチェーン操作なので、配布と同じくtx hashを確認記録として残す。
                  これがないとRunbookが求めるとおり運用ログへ手で書き写すことになる(Issue #33)。 */}
              <label className="flex items-center gap-2 text-sm font-semibold text-muted">
                <span className="sr-only">Allowlist tx hash</span>
                <input
                  className={`${inputStyles} inline-block w-64 text-sm`}
                  type="text"
                  value={allowlistTxId}
                  onChange={(event) => setAllowlistTxId(event.target.value)}
                  placeholder="Allowlist tx hash（0x…）"
                />
              </label>
              <button
                className={buttonStyles.secondary}
                type="button"
                disabled={pending}
                onClick={() => run("allowlist", "added", { txId: allowlistTxId })}
              >
                Allowlist 追加済みにする
              </button>
            </>
          )}
          {review === "approved" && !allowlistAdded && (
            <p className="basis-full text-sm text-muted">Allowlist 追加後に配布を記録できます。</p>
          )}
          {canRecordDistribution && (
            <>
              <label className="flex items-center gap-2 text-sm font-semibold text-muted">
                <span className="sr-only">配布 tx hash</span>
              <input
                className={`${inputStyles} inline-block w-64 text-sm`}
                type="text"
                value={txId}
                onChange={(event) => setTxId(event.target.value)}
                placeholder="0x…"
              />
              </label>
              <button
                className={buttonStyles.primary}
                type="button"
                disabled={pending}
                onClick={() => run("distribution", "sent", { txId })}
              >
                配布済みにする
              </button>
            </>
          )}
          {/* 完了状態(added / sent)に達するまでは、何度失敗しても記録できる(Issue #20)。
              完了ボタンの表示条件と同じ形にして、成功と失敗の記録が常に対になるようにする。 */}
          {review === "approved" &&
            (!allowlistAdded || application.distributionStatus !== "sent") && (
              <>
                <label className="flex items-center gap-2 text-sm font-semibold text-muted">
                  <span className="sr-only">失敗理由</span>
                  <input
                    className={`${inputStyles} inline-block w-64 text-sm`}
                    type="text"
                    value={failureReason}
                    onChange={(event) => setFailureReason(event.target.value)}
                    placeholder="失敗理由（失敗として記録する場合）"
                  />
                </label>
                {!allowlistAdded && (
                  <button
                    className={buttonStyles.quiet}
                    type="button"
                    disabled={pending}
                    onClick={() => run("allowlist", "failed", { reason: failureReason })}
                  >
                    Allowlist 失敗として記録
                  </button>
                )}
                {canRecordDistribution && (
                  <button
                    className={buttonStyles.quiet}
                    type="button"
                    disabled={pending}
                    onClick={() => run("distribution", "failed", { reason: failureReason })}
                  >
                    配布 失敗として記録
                  </button>
                )}
              </>
            )}
        </div>
        {/* 記録済みの理由と tx hash。applications 側の列は直近の1件で上書きされ、
            Allowlist の tx hash に至っては列自体がないため、いずれも
            application_events から field ごとの最新を受け取って表示する(Issue #19, #33)。 */}
        {recorded.length > 0 && (
          <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            {recorded.map(({ field, reason, tx }) => (
              <Fragment key={field}>
                {reason && (
                  <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-3">
                    <dt className="font-semibold text-muted">{fieldLabel(field)}の理由</dt>
                    <dd className="text-foreground">
                      {reason.reason}
                      <small className="ml-2 text-muted">
                        （{reason.toStatus} / {formatJst(reason.createdAt)}）
                      </small>
                    </dd>
                  </div>
                )}
                {tx && (
                  <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-3">
                    <dt className="font-semibold text-muted">{fieldLabel(field)}の tx hash</dt>
                    <dd className="break-all font-mono text-xs text-foreground">
                      {tx.txId}
                      <small className="ml-2 font-sans text-muted">
                        （{formatJst(tx.createdAt)}）
                      </small>
                    </dd>
                  </div>
                )}
              </Fragment>
            ))}
          </dl>
        )}
        {/* 上の dl は field ごとの最新1件だけを示す。再試行の経緯まで追うための全件は
            折りたたみで出す。これがないとDBへ直接繋ぐしかない(Issue #34)。 */}
        <AdminApplicationHistory events={events} />
        {error && <p className="mt-3 text-sm font-semibold text-rose-600 dark:text-rose-300" role="alert">{error}</p>}
      </td>
    </tr>
  );
}
