// ABOUTME: Connect the portal's daily participation screen to real check-in history.
// ABOUTME: Public community activity stays unavailable until its data and privacy rules exist.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckinButton } from "@/components/CheckinButton";
import type { Checkin } from "@/lib/domain/types";

export function PortalCommunity({ history, today }: { history: Checkin[]; today: string }) {
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
      <div className="pd-checkin-panel"><div><p className="pd-eyebrow">{today} / JST</p><h2>今日は、ここにいる。</h2><p>チェックインは日本時間で1日1回。記録は本人用の履歴に残ります。</p></div><CheckinButton key={today} checked={history.some((entry) => entry.checkinDate === today)} /></div>
      <section className="pd-checkin-history" aria-labelledby="footprints-title"><p className="pd-eyebrow">YOUR FOOTPRINTS</p><h2 id="footprints-title">これまでのチェックイン</h2>{history.length ? <ul className="portal-checkin-dates">{history.map((entry) => <li key={entry.id}><time dateTime={entry.checkinDate}>{entry.checkinDate}</time></li>)}</ul> : <p className="portal-muted">まだ履歴はありません。</p>}</section>
    </section>
    <section className="pd-panel portal-section"><p className="pd-eyebrow">COMMUNITY FIELD</p><h2>準備中</h2><p className="portal-muted">コミュニティの活動を紹介する画面は準備中です。チェックインや回答を他のメンバーへ公開する機能はありません。</p></section>
  </main>;
}
