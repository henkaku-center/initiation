// ABOUTME: Show real initiation and application records in the adopted passport layout.
// ABOUTME: Unsupported NFT and membership operations remain unavailable.
import Link from "next/link";
import Image from "next/image";
import { ApplyForm } from "@/components/ApplyForm";
import { allowlistLabel, distributionLabel, reviewLabel } from "@/lib/applicationLabels";
import type { Application } from "@/lib/domain/types";
import { PortalWalletStatus } from "./PortalWalletStatus";

export function PortalPassport({ application, reviewReason, complete, displayName = null, signedIn = true }: { application: Application | null; reviewReason: string | null; complete: boolean; displayName?: string | null; signedIn?: boolean }) {
  const canApply = signedIn && complete && (!application || application.reviewStatus === "rejected");
  return <main className="pd-page pd-passport-page">
    <header className="pd-page-heading"><p className="pd-eyebrow">YOUR PLACE IN HENKAKU</p><h1>あなたの、はじまりのしるし。</h1><p>{complete ? `${displayName || "旅人"}さん、おかえりなさい。次の入口が開いています。` : "旅を終えた先に、あなたのパスポートが待っています。"}</p></header>
    <div className="pd-empty-journey"><span className="pd-empty-symbol">↗</span><div><h2>{complete ? "Initiation 完走" : "まずは、小さな旅に出よう。"}</h2><p>{complete ? "旅の完走を確認しました。運営への申請に進めます。" : "旅を最後まで進めると、Allowlist追加とHENKAKU配布を申請できます。"}</p></div><Link className="pd-primary" href={complete ? "/initiation?edit=1" : "/initiation"}>{complete ? "回答を見直す" : "Initiationへ"}<span>→</span></Link></div>
    <div className="pd-rewards-label"><span className="pd-mono">AFTER INITIATION / FOUR OPEN DOORS</span><span className="pd-tag">YOUR NEXT STEP</span></div>
    <div className="pd-reward-grid">
      <section className="pd-reward-card">
        <div className="pd-reward-step"><span>01 / PARTICIPANT</span><span>◇</span></div>
        <div className="pd-nft-art pd-nft-generated"><div className="pd-nft-lines" /><span className="pd-nft-top">HENKAKU<br />INITIATION</span><div className="pd-nft-bottom"><strong>{displayName || "TRAVELER"}</strong><span>CONCEPT / 未発行</span></div></div>
        <h2>参加のしるし</h2><p>この旅を通った、あなただけのNFTパスポート。発行機能は準備中です。</p><button className="pd-primary pd-full" type="button" disabled>NFT発行は準備中</button>
      </section>
      <section className="pd-reward-card">
        <div className="pd-reward-step"><span>02 / ALLOWLIST</span><span>↗</span></div>
        <div className="pd-reward-visual pd-generated-visual"><Image className="pd-passport-image" src="/demo-assets/passport-allowlist.webp" alt="" width={1024} height={1024} sizes="(max-width:620px) 90vw, (max-width:1100px) 42vw, 21vw" /></div>
        <h2>コミュニティへ申請</h2><p>参加の準備ができたら、Allowlistへの登録とHENKAKU配布を申請。</p>
        {application ? <dl className="portal-status-list">
          <div><dt>審査</dt><dd>{reviewLabel[application.reviewStatus]}</dd></div>
          {/* 却下・要追加情報は理由が判断の中身そのものなので、状態と並べて示す。 */}
          {reviewReason && application.reviewStatus !== "approved" && <div><dt>理由</dt><dd>{reviewReason}</dd></div>}
          {application.reviewStatus !== "rejected" && <div><dt>Allowlist</dt><dd>{allowlistLabel(application.allowlistStatus)}</dd></div>}
        </dl> : signedIn ? <p className="portal-muted">まだ申請していません。</p> : <Link className="pd-primary pd-full" href="/setup">サインインして申請状況を確認 ↗</Link>}
        {application?.reviewStatus === "needs_info" && <p className="portal-muted">追加確認の理由をご確認ください。この画面からの追加情報送信は準備中です。運営からの案内に沿ってご対応ください。</p>}
        {canApply && <ApplyForm key={application?.id ?? "unsubmitted"} reapply={application?.reviewStatus === "rejected"} />}
      </section>
      <section className="pd-reward-card">
        <div className="pd-reward-step"><span>03 / HENKAKU</span><span>⊕</span></div>
        <div className="pd-reward-visual pd-generated-visual"><Image className="pd-passport-image" src="/demo-assets/passport-token.webp" alt="" width={1024} height={1024} sizes="(max-width:620px) 90vw, (max-width:1100px) 42vw, 21vw" /></div>
        <h2>はじまりのHENKAKU</h2><p>承認されたら、コミュニティでの一歩を後押しするトークンを。運営が確認して手動で送付します。</p>
        <span className="pd-application-state">HENKAKU 配布：{application && application.reviewStatus !== "rejected" ? distributionLabel(application.distributionStatus, application.distributionTxId) : "申請後に確認できます"}</span>
        <button className="pd-primary pd-full" type="button" disabled>直接の受け取り機能は準備中</button>
      </section>
      <section className="pd-reward-card">
        <div className="pd-reward-step"><span>04 / MEMBERSHIP</span><span>✳</span></div>
        <div className="pd-reward-visual pd-generated-visual"><Image className="pd-passport-image" src="/demo-assets/passport-membership.webp" alt="" width={1024} height={1024} sizes="(max-width:620px) 90vw, (max-width:1100px) 42vw, 21vw" /></div>
        <h2>ここから、一緒に。</h2><p>次はあなたの活動が、新しく来る誰かの入口になります。</p><span className="pd-application-state">メンバーロールの付与は準備中です。</span><Link className="pd-primary pd-full" href="/community">コミュニティへ <span>↗</span></Link>
      </section>
    </div>
    <p className="pd-passport-disclaimer">NFT保有は申請条件ではありません。申請・配布の表示は運営の記録で、現在のトークン保有照会ではありません。準備中の操作で資産やロールは付与されません。</p>
    <div className="pd-passport-details"><section className="pd-panel"><div className="pd-panel-top"><span className="pd-mono">WALLET STATUS</span><Link className="pd-text-button" href="/setup">ウォレットを見る ↗</Link></div><PortalWalletStatus /></section><section className="pd-panel pd-your-signals"><span className="pd-mono">YOUR SIGNALS</span><h3>{displayName || "まだ名のない旅人"}</h3><p>まだ言葉になっていない好奇心も、ここに。</p><Link className="pd-text-button" href="/initiation">あなたの旅を振り返る ↗</Link></section></div>
  </main>;
}
