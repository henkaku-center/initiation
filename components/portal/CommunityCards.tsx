// ABOUTME: Present the portal's sample activity cards and their descriptions.
// ABOUTME: Participation remains unavailable until a real community service is connected.
"use client";
import { useState } from "react";
import Image from "next/image";
import { PortalDialog } from "./PortalDialog";

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

export function CommunityCards() {
  const [selected, setSelected] = useState<number | null>(null);
  const signal = selected === null ? null : communitySignals[selected];
  return (
    <>
      <div className="pd-community-grid">
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
            </div>
          </button>
        ))}
      </div>
      {signal && (
        <PortalDialog title={signal.title} onClose={() => setSelected(null)}>
          <Image className="pd-community-image" src={signal.image} alt="" width={1400} height={788} sizes="500px" />
          <p className="pd-eyebrow">{signal.tag}</p>
          <p className="pd-dialog-description">{signal.description}</p>
          <p className="pd-fineprint">
            この活動は、公開ビューを検討するためのサンプルです。実際の募集ではありません。
          </p>
          <button
            className="pd-primary pd-full"
            disabled
          >
            参加受付は準備中
          </button>
        </PortalDialog>
      )}
    </>
  );
}
