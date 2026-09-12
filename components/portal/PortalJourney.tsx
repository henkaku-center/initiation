// ABOUTME: Present the four production steps within the adopted journey artwork.
// ABOUTME: Save before advancing and use the server's completion result for the passport.
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStep } from "@/app/initiation/actions";
import { saveDisplayName } from "@/app/members/actions";
import type { InitiationStep } from "@/lib/initiation/content";
import type { ProgressEntry } from "@/lib/domain/types";
import "@/components/demo/explorer-scene.css";

export function PortalJourney({ steps, entries, displayName, complete }: {
  steps: InitiationStep[];
  entries: ProgressEntry[];
  displayName: string | null;
  complete: boolean;
}) {
  const byId = new Map(entries.map((entry) => [entry.stepId, entry]));
  const firstMissing = steps.findIndex((step) => !byId.has(step.id));
  const [position, setPosition] = useState(entries.length === 0 ? -1 : firstMissing < 0 ? steps.length : firstMissing);
  const [editing, setEditing] = useState(false);
  const [look, setLook] = useState(0);
  const [sound, setSound] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const showComplete = complete && !editing;
  const step = steps[position];
  useEffect(() => { card.current?.focus({ preventScroll: true }); }, [position, showComplete]);

  async function toggleSound() {
    const player = audio.current;
    if (!player) return;
    setAudioError(false);
    if (!player.paused) { player.pause(); return; }
    player.volume = 0.22;
    try { await player.play(); } catch { setAudioError(true); }
  }

  return <main className={`pd-game ${showComplete ? "pd-game-complete" : "pd-game-journey"}`} aria-label="Initiationの旅">
    <div className="pd-game-top">
      <Link className="pd-game-exit" href="/">← ポータルへ</Link>
      <div className="pd-game-progress" aria-label={`${steps.filter((item) => byId.has(item.id)).length}/4 項目を保存済み`}>
        {steps.map((item, index) => <span key={item.id} className={byId.has(item.id) ? "is-reached" : ""} aria-current={index === position ? "step" : undefined}><b>{index + 1}</b><i>{item.title}</i></span>)}
      </div>
      <button className="pd-sound" type="button" aria-pressed={sound} onClick={() => void toggleSound()}>{sound ? "Ⅱ" : "♫"}<span>SOUND {sound ? "ON" : "OFF"}</span></button>
    </div>
    <audio ref={audio} src="/demo-assets/breeze-zero.m4a" preload="none" loop onPlay={() => setSound(true)} onPause={() => setSound(false)} onError={() => setAudioError(true)} />
    {audioError && <p className="portal-error" role="alert">音楽を再生できませんでした。回答はそのまま進められます。</p>}
    {showComplete ? <div className="pd-welcome" ref={card} tabIndex={-1}>
      <p className="pd-mono">THIS IS YOUR BEGINNING.</p><h1>WELCOME TO<br /><span>HENKAKU.</span></h1>
      <p>{displayName ? `${displayName}さん、` : ""}4項目の保存を確認しました。<br />運営への申請に進めます。</p>
      <Link className="pd-primary" href="/passport">あなたのパスポートへ ↗</Link>
      <div className="portal-actions"><button type="button" className="pd-secondary" onClick={() => { setPosition(0); setEditing(true); }}>回答を見直す</button></div>
    </div> : <div className="pd-journey-layout">
      <div className="pd-journey-scene">
        <div className="pd-journey-viewport">
          <div className="pd-scene-plane pd-scene-plane-night" style={{ transform: `translateX(${look * 3}%)` }}>
            <div className="pd-game-world pd-world-night" aria-hidden="true" /><div className="pd-explorer-scene"><div className="pd-explorer-ground" aria-hidden="true" /><Image className="pd-explorer-image" src="/demo-assets/explorer.webp" alt="旅の先を見つめる探究者" width={265} height={720} sizes="(max-width:620px) 75px, 100px" /></div>
          </div>
          <div className="pd-game-shade" aria-hidden="true" /><div className="pd-scene-heading"><p className="pd-mono">{position < 0 ? "ARRIVAL" : "INITIATION"}</p><h1>{step?.title ?? "小さな旅を、ここから。"}</h1></div>
        </div>
        <div className="pd-look-controls"><span className="pd-mono">LOOK AROUND</span><div><button type="button" aria-label="左を見る" onClick={() => setLook(-1)}>←</button><button type="button" aria-label="正面を見る" onClick={() => setLook(0)}>＋</button><button type="button" aria-label="右を見る" onClick={() => setLook(1)}>→</button></div></div>
      </div>
      <div className="pd-game-bottom"><div className="pd-game-card" ref={card} tabIndex={-1}>
        {position < 0 ? <Arrival displayName={displayName} onNext={() => setPosition(0)} /> : step ? <StepAnswer key={step.id} step={step} entry={byId.get(step.id)} onBack={() => setPosition(Math.max(0, position - 1))} canGoBack={position > 0} onNext={() => { setPosition(position + 1); if (position === steps.length - 1) setEditing(false); }} /> : <div aria-live="polite"><h2>完走状態を確認しています…</h2><p>保存済みの記録を確認して、次の入口を表示します。</p><button className="pd-secondary" type="button" onClick={() => router.refresh()}>もう一度確認</button></div>}
      </div></div>
    </div>}
  </main>;
}

function Arrival({ displayName, onNext }: { displayName: string | null; onNext: () => void }) {
  const [name, setName] = useState(displayName ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return <section><p className="pd-eyebrow">YOUR BEGINNING</p><h2>ここでは、なんと呼ばれたい？</h2><p className="portal-muted">呼び名は任意です。入力しなくても完走や申請に影響しません。</p>
    <form onSubmit={(event) => { event.preventDefault(); if (pending) return; setError(null); startTransition(async () => { try { const result = await saveDisplayName(name); if (!result.ok) { setError(result.error ?? "呼び名を保存できませんでした。"); return; } router.refresh(); onNext(); } catch { setError("呼び名を保存できませんでした。入力を残したまま再試行できます。"); } }); }}>
      <label htmlFor="portal-display-name">呼び名（任意）</label><input className="portal-field" id="portal-display-name" value={name} onChange={(event) => setName(event.target.value)} disabled={pending} />
      <div className="portal-actions"><button className="pd-primary" disabled={pending || !name.trim()} type="submit">{pending ? "保存中…" : "呼び名を保存してはじめる"}</button><button className="pd-secondary" type="button" disabled={pending} onClick={onNext}>名前を入力せずにはじめる</button></div>
    </form>{error && <p className="portal-error" role="alert">{error}</p>}
  </section>;
}

function StepAnswer({ step, entry, onNext, onBack, canGoBack }: { step: InitiationStep; entry?: ProgressEntry; onNext: () => void; onBack: () => void; canGoBack: boolean }) {
  const [answer, setAnswer] = useState(entry?.answer ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const router = useRouter();
  return <section><p className="pd-eyebrow">{entry ? "保存済みの項目" : "これからの項目"}</p><h2>{step.title}</h2><p>{step.kind === "question" ? step.prompt : step.description}</p>
    <form onSubmit={(event) => { event.preventDefault(); if (busy.current) return; busy.current = true; setError(null); startTransition(async () => { try { const result = await saveStep(step.id, step.kind === "question" ? answer : null); if (!result.ok) { setError(result.error ?? "保存できませんでした。"); return; } router.refresh(); onNext(); } catch { setError("保存できませんでした。入力を残したまま再試行できます。"); } finally { busy.current = false; } }); }}>
      {step.kind === "question" ? <><label htmlFor={`answer-${step.id}`}>回答</label><textarea className="portal-field" id={`answer-${step.id}`} value={answer} disabled={pending} onChange={(event) => setAnswer(event.target.value)} required /></> : <p className="portal-muted">ご自身で実施したことを確認してから、完了を保存してください。</p>}
      <div className="portal-actions">{canGoBack && <button className="pd-secondary" type="button" onClick={onBack} disabled={pending}>← 前の項目</button>}<button className="pd-primary" type="submit" disabled={pending || (step.kind === "question" && !answer.trim())}>{pending ? "保存中…" : step.kind === "question" ? "回答を保存して次へ →" : "完了を保存して次へ →"}</button></div>
    </form>{error && <p className="portal-error" role="alert">{error}</p>}
  </section>;
}
