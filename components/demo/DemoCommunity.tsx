"use client";
import { useState } from "react";
import Image from "next/image";
import { type DemoState } from "@/lib/demo/state";
import { dispatchDemo } from "@/lib/demo/useDemo";
import { tokyoDate, useTokyoDate } from "@/lib/demo/useTokyoDate";
import { DemoDialog } from "./DemoDialog";

export const communitySignals = [
  {
    tag: "AI / EXPERIMENT",
    interest: "AI",
    title: "つくりながら、AIと話そう。",
    author: "AI / INITIATION INTEREST",
    image: "/demo-assets/community-ai.webp",
    description:
      "小さな道具や、まだ完成していないプロトタイプを持ち寄る場所。わからないことから、一緒に考えます。",
    initials: "AI",
    color: "blue",
  },
  {
    tag: "ART / CO-CREATION",
    interest: "ART",
    title: "違う得意を、持ち寄って。",
    author: "ART / INITIATION INTEREST",
    image: "/demo-assets/community-art.webp",
    description:
      "絵、音、コード、ことば。普段は出会わない表現を組み合わせて、まだ名前のない何かをつくる実験です。",
    initials: "✳",
    color: "orange",
  },
  {
    tag: "MUSIC / LISTENING",
    interest: "MUSIC",
    title: "今日の一曲から、つながる。",
    author: "MUSIC / INITIATION INTEREST",
    image: "/demo-assets/community-music.webp",
    description:
      "最近よく聴く一曲や、自分でつくった音を持ち寄ります。音楽の話から、思いがけない出会いが生まれるかもしれません。",
    initials: "♫",
    color: "green",
  },
];

export function CommunityCards({
  state,
  compact = false,
}: {
  state?: DemoState;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const signal = selected === null ? null : communitySignals[selected];
  return (
    <>
      <div
        className={`pd-community-grid ${compact ? "pd-community-compact" : ""}`}
      >
        {communitySignals.map((item, i) => (
          <button
            className="pd-community-card"
            key={item.tag}
            onClick={() => setSelected(i)}
          >
            <span className="pd-community-card-top">
              <span className="pd-mono">{item.tag}</span>
              <span>↗</span>
            </span>
            <Image className="pd-community-image" src={item.image} alt="" width={1400} height={788} sizes="(max-width: 620px) 90vw, (max-width: 800px) 42vw, 28vw" />
            <h3>{item.title}</h3>
            <div className="pd-community-card-bottom">
              <span className={`pd-avatar pd-avatar-${item.color}`}>
                {item.initials}
              </span>
              <span>{item.author}</span>
              {state?.answers.interests.includes(item.interest) && (
                <small>✓ 気になる</small>
              )}
            </div>
          </button>
        ))}
      </div>
      {signal && (
        <DemoDialog title={signal.title} onClose={() => setSelected(null)}>
          <Image className="pd-community-image" src={signal.image} alt="" width={1400} height={788} sizes="500px" />
          <p className="pd-eyebrow">{signal.tag}</p>
          <p className="pd-dialog-description">{signal.description}</p>
          <p className="pd-fineprint">
            この活動は、公開ビューを検討するためのサンプルです。実際の募集ではありません。
          </p>
          <button
            className="pd-primary pd-full"
            disabled={!state}
            onClick={() =>
              state && dispatchDemo({ type: "interest", value: signal.interest })
            }
          >
            {!state ? "参加受付は準備中" : state.answers.interests.includes(signal.interest)
              ? "気になるに追加済み ✓"
              : "この活動が気になる ↗"}
          </button>
        </DemoDialog>
      )}
    </>
  );
}

export function DemoCommunity({
  state,
  notify,
}: {
  state: DemoState;
  notify: (text: string) => void;
}) {
  const today = useTokyoDate();
  const checked = state.checkins.includes(today);
  return (
    <div className="pd-page">
      <section className="pd-daily-checkin" aria-labelledby="daily-checkin-title">
        <div className="pd-page-heading">
          <p className="pd-eyebrow">DAILY CHECK-IN</p>
          <h1 id="daily-checkin-title">今日も、どこかで動いている。</h1>
          <p>見ることから、話すことから。あなたなりの関わり方で。</p>
        </div>
        <div className="pd-checkin-panel">
          <div>
            <span className="pd-eyebrow">{today} / JST</span>
            <h2>
              {checked
                ? "今日のしるし、受け取りました。"
                : `${state.answers.name ? state.answers.name + "さん、" : ""}今日は、ここにいる。`}
            </h2>
            <p>
              {checked
                ? "また明日、気が向いたら。"
                : "ひと押しだけでも、参加のしるしになります。"}
            </p>
          </div>
          <button
            className={`pd-checkin-button ${checked ? "is-checked" : ""}`}
            disabled={checked}
            onClick={() => {
              dispatchDemo({ type: "checkin", date: tokyoDate() });
              notify("今日のチェックインを記録しました（このブラウザ内のみ）");
            }}
          >
            <span>{checked ? "✓" : "+"}</span>
            {checked ? "CHECKED IN" : "CHECK IN"}
          </button>
        </div>
        <section className="pd-checkin-history" aria-labelledby="footprints-title">
          <span className="pd-mono">YOUR FOOTPRINTS</span>
          <h2 id="footprints-title">ここにいた、あなたの記録。</h2>
          {state.checkins.length ? (
            <div className="pd-footprints">
              {[...state.checkins].reverse().map((date) => (
                <div key={date}>
                  <span>✳</span>
                  <strong>{date}</strong>
                  <small>CHECKED IN</small>
                </div>
              ))}
            </div>
          ) : (
            <p>最初のチェックインが、あなたの足あとになります。</p>
          )}
          <p className="pd-fineprint">
            1日1回（日本時間）。このブラウザだけのデモ記録です。
          </p>
        </section>
      </section>
      <div className="pd-section-heading">
        <div>
          <span className="pd-eyebrow">OPEN SIGNALS</span>
          <h2>好奇心が、交差するところ。</h2>
        </div>
        <span className="pd-tag">SAMPLE ACTIVITIES</span>
      </div>
      <CommunityCards state={state} />
    </div>
  );
}
