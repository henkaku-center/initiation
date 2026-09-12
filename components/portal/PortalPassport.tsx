// ABOUTME: Show real initiation and application records in the adopted passport layout.
// ABOUTME: Unsupported NFT and membership operations remain unavailable.
import Link from "next/link";
import { ApplyForm } from "@/components/ApplyForm";
import { allowlistLabel, distributionLabel, reviewLabel } from "@/lib/applicationLabels";
import type { Application } from "@/lib/domain/types";

export function PortalPassport({ application, reviewReason, complete }: { application: Application | null; reviewReason: string | null; complete: boolean }) {
  const canApply = complete && (!application || application.reviewStatus === "rejected");
  return <main className="pd-page pd-passport-page">
    <header className="pd-page-heading"><p className="pd-eyebrow">YOUR BEGINNING, YOUR PASSPORT</p><h1>あなたの、はじまりのしるし。</h1><p>Initiationの進捗と、運営への申請状態を確認できます。</p></header>
    <div className="portal-passport-grid">
      <section className="pd-reward-card"><p className="pd-eyebrow">01 / INITIATION</p><h2>{complete ? "Initiation 完走" : "旅の途中です"}</h2><p className="portal-muted">{complete ? "サーバーに保存された4項目の完了を確認しました。" : "4項目を保存すると、Allowlist追加とHENKAKU配布を申請できます。"}</p><Link className="pd-secondary" href="/initiation">{complete ? "回答を見直す" : "旅を続ける →"}</Link></section>
      <section className="pd-reward-card"><p className="pd-eyebrow">02 / APPLICATION</p><h2>Allowlist と HENKAKU の申請</h2>
        {application ? <dl className="portal-status-list">
          <div><dt>審査</dt><dd>{reviewLabel[application.reviewStatus]}</dd></div>
          {/* 却下・要追加情報は理由が判断の中身そのものなので、状態と並べて示す。 */}
          {reviewReason && application.reviewStatus !== "approved" && <div><dt>理由</dt><dd>{reviewReason}</dd></div>}
          {application.reviewStatus !== "rejected" && <><div><dt>Allowlist</dt><dd>{allowlistLabel(application.allowlistStatus)}</dd></div><div><dt>HENKAKU 配布</dt><dd>{distributionLabel(application.distributionStatus, application.distributionTxId)}</dd></div></>}
        </dl> : <p className="portal-muted">まだ申請していません。</p>}
        <p className="portal-muted">表示は運営が記録した申請・実行状態です。現在のトークン保有状況を照会したものではありません。</p>
        {application?.reviewStatus === "needs_info" && <p className="portal-muted">追加確認の理由をご確認ください。この画面からの追加情報送信は準備中です。運営からの案内に沿ってご対応ください。</p>}
        {canApply && <ApplyForm key={application?.id ?? "unsubmitted"} reapply={application?.reviewStatus === "rejected"} />}
      </section>
      <section className="pd-reward-card"><p className="pd-eyebrow">PARTICIPANT NFT</p><h2>準備中</h2><p className="portal-muted">NFTの発行機能は未対応です。今回の申請にNFT保有は必要ありません。</p></section>
      <section className="pd-reward-card"><p className="pd-eyebrow">MEMBERSHIP</p><h2>準備中</h2><p className="portal-muted">報酬のclaim・メンバーロール付与は未対応です。Allowlist追加とHENKAKU送付は、申請後に運営が確認して手動で行います。</p></section>
    </div>
  </main>;
}
