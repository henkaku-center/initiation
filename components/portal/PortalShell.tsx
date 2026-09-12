// ABOUTME: Share the adopted portal appearance across the normal application routes.
// ABOUTME: Authentication stays in the real Providers; only appearance is stored locally.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SessionStatus } from "@/components/SessionStatus";
import { DemoDialog } from "@/components/demo/DemoDialog";
import { portalRoutes } from "@/lib/portal/navigation";
import "@/components/demo/portal-demo.css";
import "@/components/demo/experience.css";
import "@/components/demo/reference-gateway.css";
import "./portal.css";

export function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [credits, setCredits] = useState(false);
  useEffect(() => {
    document.getElementById("portal-main")?.focus({ preventScroll: true });
  }, [pathname]);
  if (pathname === "/demo") return children;
  const demoScreen = pathname === "/apply" ? "passport" : pathname === "/checkin" ? "community" : Object.entries(portalRoutes).find(([, route]) => route === pathname)?.[0] ?? "home";
  return (
    <div className={`portal-demo portal-app${pathname === "/" ? " pd-reference-home" : ""}`}>
      <a className="pd-skip" href="#portal-main">本文へスキップ</a>
      <header className="pd-header">
        <Link href="/" className="pd-brand" aria-label="HENKAKU ポータルへ">
          <svg className="pd-mark" viewBox="0 0 48 60" fill="currentColor" aria-hidden="true"><path d="M0 0 L48 37 L19 37 L0 60 Z" /></svg>
          <span>HENKAKU<span className="pd-brand-sub">COMMUNITY</span></span>
        </Link>
        <nav aria-label="メインメニュー">
          {([
            [portalRoutes.setup, "Setup"], [portalRoutes.community, "Community"],
            [portalRoutes.journey, "Initiation"], [portalRoutes.passport, "My passport"],
          ] as const).map(([href, label]) => <Link key={href} href={href} className={href === "/passport" ? "pd-nav-passport" : undefined} aria-current={pathname === href || (href === "/passport" && pathname === "/apply") || (href === "/community" && pathname === "/checkin") ? "page" : undefined}>{label}{href === "/passport" && <span>↗</span>}</Link>)}
        </nav>
        <ThemeToggle />
      </header>
      <ul className="portal-session" aria-label="サインイン状態"><SessionStatus /></ul>
      <div id="portal-main" tabIndex={-1} className={pathname === "/" ? "portal-home" : "portal-content"}>{children}</div>
      <footer className="pd-footer">
        <span>HENKAKU COMMUNITY</span>
        <div>
          <a href="https://henkaku-center.github.io/initiation/privacy-policy">プライバシーポリシー</a>
          <button type="button" onClick={() => setCredits(true)}>素材・クレジット</button>
          <span>IN PERPETUAL BETA. TOGETHER.</span>
        </div>
      </footer>
      <Link className="pd-demo-controls" href={`/demo#${demoScreen}`}><span>◇</span> デモ操作</Link>
      {credits && <DemoDialog title="素材・クレジット" onClose={() => setCredits(false)}>
        <div className="pd-credits">
          <h3>Backgrounds</h3><p>夜の遺跡・夕暮れの都市、CommunityとPassportの画像：OpenAI image_genによる生成素材。HENKAKU portal demo / CC BY 4.0（権利が成立する範囲）。</p>
          <h3>Music</h3><p>Breeze Zero / karawapo / CC BY 4.0。既存のMIDIから合成した試聴用音源です。</p>
          <h3>Design references</h3>
          <p><a href="https://henkaku-ui.vercel.app/bubble-multi">Bubble Multi / 複数の泡</a><br /><a href="https://henkaku-ui.vercel.app/gateway-v1-claude">Gatewayの通し版</a><br /><a href="https://claude.ai/code/artifact/f74311c1-d807-4972-a3d6-51e5547609b1">Game A Prototype</a></p>
          <p>トップページは参照元のソースを基に構成し、元のライセンス・著作権表示を保持しています。公開動画の権利は各権利者に帰属します。</p>
          <p><a href="/demo-assets/CREDITS.md">素材のクレジット</a><br /><a href="/demo-assets/gateway/CREDITS.md">参照コード・Podcastのクレジット</a><br /><a href="/demo-assets/polished-provenance.json">素材の出典・生成プロンプト</a></p>
        </div>
      </DemoDialog>}
    </div>
  );
}
