// ABOUTME: Connect the portal's wallet screen to the existing wallet and SIWE components.
// ABOUTME: Token and on-chain Allowlist readings remain explicitly unavailable.
import Link from "next/link";
import { ConnectWallet } from "@/components/ConnectWallet";
import { WalletSetup } from "@/components/WalletSetup";
import { SignInWithEthereum } from "@/components/SignInWithEthereum";
import { PortalWalletStatus } from "./PortalWalletStatus";

export function PortalSetup() {
  return <main className="pd-page pd-setup-page">
    <div className="pd-page-heading"><p className="pd-eyebrow">00 / BEFORE THE JOURNEY</p><h1>まずは、あなたの入口を。</h1><p>ウォレットを準備して、小さな旅をはじめましょう。</p></div>
    <div className="pd-setup-grid">
      <div className="pd-setup-main">
        <section className="pd-panel">
          <div className="pd-panel-top"><span className="pd-mono">YOUR WALLET</span></div>
          <ConnectWallet />
          <div className="pd-setup-step"><span className="pd-step-number">1</span><div><h3>Polygonにつなぐ</h3><p>HENKAKUが使えるネットワークです。</p></div><div className="portal-setup-control"><WalletSetup part="network" /></div></div>
          <div className="pd-setup-step"><span className="pd-step-number">2</span><div><h3>ウォレットでサインイン</h3><p>あなたの入口であることを、署名で確かめます。送金は行いません。</p></div><div className="portal-setup-control"><SignInWithEthereum /></div></div>
          <div className="pd-setup-step"><span className="pd-step-number">3</span><div><h3>HENKAKUを表示に追加 <small>任意</small></h3><p>ウォレットの一覧で見つけやすくします。</p></div><div className="portal-setup-control"><WalletSetup part="token" /></div></div>
        </section>
        <div className="pd-next-row"><Link className="pd-primary" href="/initiation">Initiationをはじめる <span>→</span></Link><p className="pd-fineprint">回答の保存にはサインインが必要です。</p></div>
      </div>
      <aside><section className="pd-panel pd-status-panel" aria-label="ウォレットの状態確認"><div className="pd-panel-top"><span className="pd-mono">YOUR CURRENT STATUS</span></div><PortalWalletStatus /><p className="pd-fineprint">アプリ内の申請状態はMy passportで確認できます。</p></section><div className="pd-aside-note"><span>↗</span><h3>まだ持っていなくても、大丈夫。</h3><p>HENKAKUは、参加の先に受け取るもの。好奇心があれば、ここからはじめられます。</p></div></aside>
    </div>
  </main>;
}
