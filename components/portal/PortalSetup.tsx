// ABOUTME: Connect the portal's wallet screen to the existing wallet and SIWE components.
// ABOUTME: Token and on-chain Allowlist readings remain explicitly unavailable.
import Link from "next/link";
import { ConnectWallet } from "@/components/ConnectWallet";
import { WalletSetup } from "@/components/WalletSetup";
import { SignInWithEthereum } from "@/components/SignInWithEthereum";

export function PortalSetup() {
  return <main className="pd-page pd-setup-page">
    <div className="pd-page-heading"><p className="pd-eyebrow">00 / BEFORE THE JOURNEY</p><h1>まずは、あなたの入口を。</h1><p>ウォレットを準備して、小さな旅をはじめましょう。</p></div>
    <div className="pd-setup-grid">
      <div className="pd-setup-main">
        <section className="pd-panel">
          <div className="pd-panel-top"><span className="pd-mono">YOUR WALLET</span></div>
          <h2>01 ウォレットを接続</h2><p className="portal-muted">接続だけではアプリへのサインインは完了しません。</p><ConnectWallet />
          <div className="portal-section"><h2>02 PolygonとHENKAKU</h2><p className="portal-muted">Polygonへ切り替えます。トークンの表示追加は任意で、保有や受領を意味しません。</p><WalletSetup /></div>
          <div className="portal-section"><h2>03 署名してサインイン</h2><p className="portal-muted">ウォレットの所有を署名で確認します。送金は行いません。</p><SignInWithEthereum /></div>
        </section>
        <section className="pd-panel portal-section" aria-label="ウォレットの状態確認">
          <div className="pd-wallet-readings"><div><span className="pd-reading-label">HENKAKU TOKEN</span><strong>準備中</strong><span className="pd-reading-note">保有状況・残高の取得は未対応です。</span></div><div><span className="pd-reading-label">ALLOWLIST</span><strong>準備中</strong><span className="pd-reading-note">オンチェーン登録状況の取得は未対応です。</span></div></div>
          <p className="portal-muted">アプリ内の申請状態はMy passportで確認できます。</p>
        </section>
      </div>
      <aside className="pd-panel"><p className="pd-eyebrow">YOUR NEXT STEP</p><h2>ここから、小さな旅へ。</h2><p className="portal-muted">サインインしたウォレットに回答と進捗を保存します。途中で離れても、続きを再開できます。</p><div className="portal-actions"><Link className="pd-primary" href="/initiation">Initiationをはじめる →</Link></div></aside>
    </div>
  </main>;
}
