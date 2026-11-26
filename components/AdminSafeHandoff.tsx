// ABOUTME: 承認済み申請の現在の工程について、開くSafe・入力する値・確認すること・次の操作を案内する(Issue #137)。
// ABOUTME: アプリはSafeの提案登録・署名・実行を行わない。値を渡し、済んだ工程のSafeは出さない。
"use client";

import { useState } from "react";
import { getAddress } from "viem";
import { handoffStage, SAFE_OPERATIONS, safeHomeUrl } from "@/lib/domain/safeHandoff";
import type { ApplicationWithMember } from "@/lib/domain/types";
import { buttonStyles } from "@/lib/ui";

function CopyButton({ label, value }: { label: string; value: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      // 権限やブラウザの制約でコピーできない場合は、表示している値を手で選択してもらう。
      setState("failed");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button className={buttonStyles.quiet} type="button" onClick={copy}>
        {label}
      </button>
      <span className="text-xs text-muted" role="status">
        {state === "copied" && "コピーしました"}
        {state === "failed" && "コピーできませんでした。値を選択してコピーしてください"}
      </span>
    </span>
  );
}

function HandoffValue({ name, value, copyLabel, mono = true }: { name: string; value: string; copyLabel: string; mono?: boolean }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-3">
      <dt className="font-semibold text-muted">{name}</dt>
      <dd className="text-foreground">
        <span className={mono ? "break-all font-mono text-xs" : undefined}>{value}</span>
        <span className="ml-1">
          <CopyButton label={copyLabel} value={value} />
        </span>
      </dd>
    </div>
  );
}

function SafeLink({ safeAddress, label }: { safeAddress: string; label: string }) {
  return (
    <a className={buttonStyles.secondary} href={safeHomeUrl(safeAddress)} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

const stepList = "list-decimal space-y-1 pl-5 leading-6 text-foreground";

export function AdminSafeHandoff({ application }: { application: ApplicationWithMember }) {
  const stage = handoffStage(application);
  if (!stage) return null;

  // コピーする値はチェックサム付きにして、貼り付け先で桁の欠落や取り違えに気づけるようにする。
  const applicant = getAddress(application.walletAddress);
  const allowlistDone = stage !== "allowlist";

  return (
    <section className="mb-4 space-y-3 rounded-xl border border-border bg-surface-hover p-4 text-sm" aria-label="Safeでの処理">
      <p className="font-semibold text-foreground">
        Safeでの処理
        <small className="ml-2 font-normal text-muted">提案・署名・実行はSafeで行います。このアプリは実行しません。</small>
      </p>
      <ol className="space-y-1 text-muted">
        <li className={stage === "allowlist" ? "font-semibold text-foreground" : undefined} aria-current={stage === "allowlist" ? "step" : undefined}>
          1. Allowlistへ追加 → 2. 追加結果を確認{allowlistDone ? "（完了）" : "（いまここ）"}
        </li>
        <li className={stage === "distribution" ? "font-semibold text-foreground" : undefined} aria-current={stage === "distribution" ? "step" : undefined}>
          3. HENKAKUを配布 → 4. 配布結果を確認
          {stage === "done" ? "（完了）" : stage === "distribution" ? "（いまここ）" : "（Allowlist追加の後）"}
        </li>
      </ol>

      {stage === "allowlist" && (
        <>
          <SafeLink safeAddress={SAFE_OPERATIONS.allowlistSafe} label="Allowlist用Safeを開く" />
          <dl className="space-y-1">
            <HandoffValue name="コントラクト" value={SAFE_OPERATIONS.tokenAddress} copyLabel="コントラクトをコピー" />
            <HandoffValue name="申請者アドレス" value={applicant} copyLabel="申請者アドレスをコピー" />
          </dl>
          <ol className={stepList}>
            <li>上のボタンでSafeを開き、ネットワークがPolygonであることを確認する。</li>
            <li>Apps から Transaction Builder を開き、コントラクトのアドレスを貼り付ける。</li>
            <li>
              メソッドに <code className="font-mono text-xs">{SAFE_OPERATIONS.allowlistMethod}</code> を選び、<code className="font-mono text-xs">user</code> に申請者アドレスを貼り付ける。
            </li>
            <li>コントラクトと申請者アドレスが上の値と全桁一致することを二者で確認してから、提案を作成し、Safeで署名・実行する。</li>
            <li>実行の成功を確認したら、下の欄にtx hashを入力して「Allowlist 追加済みにする」を選ぶ。</li>
          </ol>
        </>
      )}

      {stage === "distribution" && (
        <>
          <SafeLink safeAddress={SAFE_OPERATIONS.distributionSafe} label="配布用Safeを開く" />
          <dl className="space-y-1">
            <HandoffValue name="送付先" value={applicant} copyLabel="送付先をコピー" />
            <HandoffValue name="トークン" value={SAFE_OPERATIONS.tokenAddress} copyLabel="トークンをコピー" />
            <HandoffValue
              name="数量"
              value={SAFE_OPERATIONS.distributionAmount}
              copyLabel="数量をコピー"
              mono={false}
            />
          </dl>
          <ol className={stepList}>
            <li>上のボタンでSafeを開き、ネットワークがPolygonであることを確認する。</li>
            <li>Send tokens で HENKAKU を選ぶ。同名の別トークンではなく、上のトークンのアドレスと一致するものを選ぶ。</li>
            <li>宛先に送付先を貼り付け、数量に {SAFE_OPERATIONS.distributionAmount} を入力する（{SAFE_OPERATIONS.distributionAmount} HENKAKU。weiの桁数にしない）。</li>
            <li>送付先・トークン・数量が上の値と一致し、この申請へ送付済みでないことを二者で確認してから、提案を作成し、Safeで署名・実行する。</li>
            <li>実行の成功と送付先・数量を確認したら、下の欄にtx hashを入力して「配布済みにする」を選ぶ。</li>
          </ol>
        </>
      )}

      {stage === "done" && (
        <p className="leading-6 text-foreground">
          Allowlist追加と配布の記録が済んでいます。申請者の <code className="font-mono text-xs">/passport</code> の表示を確認し、
          {application.discordUsername ? `Discord（${application.discordUsername}）で` : "Discordで"}
          申請者へ完了を連絡してください。
        </p>
      )}
    </section>
  );
}
