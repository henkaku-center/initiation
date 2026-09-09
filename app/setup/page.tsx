// ABOUTME: 新入り向けウォレットセットアップ導線を提供する。
// ABOUTME: 接続、SIWE、Polygon切替、HENKAKU追加を順番に案内する。
import Link from "next/link";
import { redirect } from "next/navigation";
import { ConnectWallet } from "@/components/ConnectWallet";
import { SignInWithEthereum } from "@/components/SignInWithEthereum";
import { WalletSetup } from "@/components/WalletSetup";
import { buttonStyles, cardStyles } from "@/lib/ui";

export default function SetupPage() {
  if (process.env.HENKAKU_DEMO_ONLY === "1") redirect("/");
  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Step 1</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          ウォレットセットアップ
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          接続、署名、Polygon切替の順に準備します。トークン追加はウォレット表示の補助機能です。
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className={cardStyles}>
          <p className="text-sm font-bold text-brand">01</p>
          <h2 className="mt-2 text-xl font-bold text-foreground">ウォレットを接続</h2>
          <p className="mt-2 text-sm leading-6 text-muted">MetaMaskなどのInjected Walletを接続します。</p>
          <div className="mt-5">
            <ConnectWallet />
          </div>
        </section>
        <section className={cardStyles}>
          <p className="text-sm font-bold text-brand">02</p>
          <h2 className="mt-2 text-xl font-bold text-foreground">署名してサインイン</h2>
          <p className="mt-2 text-sm leading-6 text-muted">ウォレットの所有を署名で確認します。</p>
          <div className="mt-5">
            <SignInWithEthereum />
          </div>
        </section>
        <section className={cardStyles}>
          <p className="text-sm font-bold text-brand">03</p>
          <h2 className="mt-2 text-xl font-bold text-foreground">PolygonとHENKAKU</h2>
          <p className="mt-2 text-sm leading-6 text-muted">ネットワークを切り替え、トークンを表示に追加します。</p>
          <div className="mt-5">
            <WalletSetup />
          </div>
        </section>
      </div>
      <section className="rounded-2xl border border-brand/20 bg-brand/5 p-6">
        <p className="font-semibold text-foreground">準備ができたら、Initiationへ進みましょう。</p>
        <Link className={`${buttonStyles.primary} mt-4`} href="/initiation">
          Initiationをはじめる →
        </Link>
      </section>
    </main>
  );
}
