// ABOUTME: Connect the portal's daily participation screen to real check-in history.
// ABOUTME: Public community activity stays unavailable until its data and privacy rules exist.
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckinButton } from "@/components/CheckinButton";
import type { Checkin } from "@/lib/domain/types";
import { CommunityCards } from "./CommunityCards";

export function PortalCommunity({ history, today, signedIn = true }: { history: Checkin[]; today: string; signedIn?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    // UTC 15:00 on the displayed date is the following midnight in Japan.
    const timeout = setTimeout(() => router.refresh(), Math.max(1000, Date.parse(`${today}T15:00:00Z`) - Date.now() + 1000));
    const onVisible = () => { if (!document.hidden) router.refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(timeout); document.removeEventListener("visibilitychange", onVisible); };
  }, [today, router]);
  return <main className="pd-page">
    <section className="pd-daily-checkin" aria-labelledby="daily-checkin-title">
      <header className="pd-page-heading"><p className="pd-eyebrow">DAILY CHECK-IN</p><h1 id="daily-checkin-title">今日も、どこかで動いている。</h1><p>見ることから、話すことから。あなたなりの関わり方で。</p></header>
      <div className="pd-checkin-panel"><div><p className="pd-eyebrow">{today} / JST</p><h2>今日は、ここにいる。</h2><p>チェックインは日本時間で1日1回。記録は本人用の履歴に残ります。</p>{!signedIn && <Link className="pd-text-button" href="/setup">サインインしてチェックイン ↗</Link>}</div>{signedIn ? <CheckinButton key={today} checked={history.some((entry) => entry.checkinDate === today)} /> : <button className="pd-checkin-button" type="button" disabled><span>✳</span>CHECK IN</button>}</div>
      <section className="pd-checkin-history" aria-labelledby="footprints-title"><span className="pd-mono">YOUR FOOTPRINTS</span><h2 id="footprints-title">ここにいた、あなたの記録。</h2>{!signedIn ? <p>サインインすると、あなたの記録を確認できます。</p> : history.length ? <div className="pd-footprints">{history.map((entry) => <div key={entry.id}><span>✳</span><strong><time dateTime={entry.checkinDate}>{entry.checkinDate}</time></strong><small>CHECKED IN</small></div>)}</div> : <p>まだ履歴はありません。最初のチェックインが、あなたの足あとになります。</p>}<p className="pd-fineprint">1日1回（日本時間）。サインインしたあなたの記録です。</p></section>
    </section>
    <div className="pd-section-heading"><div><span className="pd-eyebrow">OPEN SIGNALS</span><h2>好奇心が、交差するところ。</h2></div><span className="pd-tag">SAMPLE ACTIVITIES</span></div>
    <CommunityCards />
    <p className="pd-fineprint">これらの活動はサンプルです。実際の募集ではありません。参加受付は準備中です。</p>
  </main>;
}
