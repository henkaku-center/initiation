// ABOUTME: Present the adopted questionnaire within the original journey artwork.
// ABOUTME: Save before advancing and use the server's completion result for the passport.
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStep } from "@/app/initiation/actions";
import { saveDisplayName } from "@/app/members/actions";
import { readJourneyAnswer, type JourneyStep, type JourneyAnswer } from "@/lib/initiation/journey";
import type { ProgressEntry } from "@/lib/domain/types";
import { journeyScenes } from "@/lib/portal/journeyScenes";
import "@/components/demo/explorer-scene.css";

export function PortalJourney({ steps, entries, displayName, complete, signedIn = true, review = false }: {
  steps: JourneyStep[];
  entries: ProgressEntry[];
  displayName: string | null;
  complete: boolean;
  signedIn?: boolean;
  review?: boolean;
}) {
  const byId = new Map(entries.map((entry) => [entry.stepId, entry]));
  const saved = steps.filter((step) => readJourneyAnswer(step.id, byId.get(step.id)?.answer));
  const firstMissing = steps.findIndex((step) => !saved.includes(step));
  const [position, setPosition] = useState(review ? -1 : saved.length === 0 ? -2 : firstMissing < 0 ? steps.length : firstMissing);
  const [editing, setEditing] = useState(review);
  const [look, setLook] = useState(0);
  const [sound, setSound] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const showComplete = signedIn && complete && !editing;
  const stage = position === -2 ? 0 : position === -1 ? 1 : Math.min(4, position + 2);
  const interests = readJourneyAnswer("v2-interests", byId.get("v2-interests")?.answer);
  const scene = journeyScenes[stage];
  const step = steps[position];
  useEffect(() => { card.current?.focus({ preventScroll: true }); }, [position, showComplete]);
  function goTo(next: number) { setPosition(next); setLook(0); }

  async function toggleSound() {
    const player = audio.current;
    if (!player) return;
    setAudioError(false);
    if (!player.paused) { player.pause(); return; }
    player.volume = 0.22;
    try { await player.play(); } catch { setAudioError(true); }
  }

  return <main className={`pd-game ${showComplete ? "pd-game-complete" : "pd-game-journey"}`} aria-label="Initiationの旅">
    {showComplete && <><div className="pd-game-world pd-world-dusk" aria-hidden="true" /><div className="pd-game-shade" aria-hidden="true" /></>}
    <div className="pd-game-top">
      <Link className="pd-game-exit" href="/">← ポータルへ</Link>
      <div className="pd-game-progress" aria-label={signedIn ? `${saved.length}/${steps.length} 項目を保存済み` : "旅のプレビュー"}>
        {journeyScenes.map((item, index) => <span key={item.title} className={showComplete || index <= stage ? "is-reached" : ""} aria-current={!showComplete && index === stage ? "step" : undefined}><b>{String(index + 1).padStart(2, "0")}</b><i>{item.title}</i></span>)}
      </div>
      <button className="pd-sound" type="button" aria-pressed={sound} onClick={() => void toggleSound()}>{sound ? "Ⅱ" : "♫"}<span>SOUND {sound ? "ON" : "OFF"}</span></button>
    </div>
    <audio ref={audio} src="/demo-assets/breeze-zero.m4a" preload="none" loop onPlay={() => setSound(true)} onPause={() => setSound(false)} onError={() => setAudioError(true)} />
    {audioError && <p className="portal-error" role="alert">音楽を再生できませんでした。回答はそのまま進められます。</p>}
    {showComplete ? <div className="pd-welcome" ref={card} tabIndex={-1}>
      <div className="pd-welcome-symbol">✳</div><p className="pd-mono">THIS IS YOUR BEGINNING.</p><h1>WELCOME TO<br /><span>HENKAKU.</span></h1>
      <p>{displayName ? `${displayName}さん、` : ""}来てくれて、ありがとう。<br />あなたがいることで、この場所は少し変わりました。</p>
      <div className="pd-welcome-interests">{(interests?.status === "answered" && Array.isArray(interests.value) ? interests.value : ["CURIOSITY"]).map((value) => <span key={value}>{value}</span>)}</div>
      <Link className="pd-primary" href="/passport">あなたのパスポートへ ↗</Link>
      <p className="pd-game-small">旅の記録を保存しました。運営への申請に進めます。</p>
      <div className="portal-actions"><button type="button" className="pd-secondary" onClick={() => { goTo(-1); setEditing(true); }}>回答を見直す</button></div>
    </div> : <div className="pd-journey-layout">
      <div className="pd-journey-scene">
        <div className="pd-journey-viewport">
          <div className={`pd-scene-plane pd-scene-plane-${scene.image}`} style={{ transform: `translateX(${look * 3}%)` }}>
            <div className={`pd-game-world pd-world-${scene.image}`} aria-hidden="true" /><div className="pd-explorer-scene"><div className="pd-explorer-ground" aria-hidden="true" /><Image className="pd-explorer-image" src="/demo-assets/explorer.webp" alt="リュックを背負い、画面奥の世界を見つめて佇む探究者" width={265} height={720} sizes="(max-width:620px) 75px, 100px" preload /></div>
          </div>
          <div className="pd-game-shade" aria-hidden="true" /><div className="pd-scene-heading"><p className="pd-mono">STAGE {String(stage + 1).padStart(2, "0")} / 05</p><h1>{scene.title}</h1><p>{scene.japanese}</p></div>
        </div>
        <div className="pd-look-controls"><span className="pd-mono">LOOK AROUND</span><div><button type="button" aria-label="左を見る" onClick={() => setLook(Math.max(-1, look - 1))}>←</button><button type="button" aria-label="正面を見る" onClick={() => setLook(0)}>＋</button><button type="button" aria-label="右を見る" onClick={() => setLook(Math.min(1, look + 1))}>→</button></div><span className="pd-look-bearing pd-mono" aria-live="polite">{look < 0 ? "WEST / 新しい気配" : look > 0 ? "EAST / 遠くの灯り" : "A PATH NOT YET TAKEN"}</span><p>{scene.caption}</p></div>
      </div>
      <div className="pd-game-bottom"><div className="pd-game-card" ref={card} tabIndex={-1} role="group" aria-label={scene.japanese}>
        <div className="pd-game-card-label"><span>{stage === 4 ? `FINAL QUESTIONS / ${position - 1} OF 3` : `SIGNAL ${String(stage + 1).padStart(2, "0")}`}</span><span>任意で答えられます</span></div>
        {position === -2 ? <><h2>はじめまして、旅人。</h2><p>ここは、まだ決まった形のない場所。<br />問いを持った人たちが、集まっては何かをつくっています。</p><p>答えが見つからなくても大丈夫。<br />まずは、少し歩いてみませんか。</p>{!signedIn && <p className="pd-game-small">回答を保存するには、<Link className="pd-text-button" href="/setup">サインイン</Link>してください。</p>}<div className="pd-game-card-actions"><button className="pd-game-back" type="button" disabled>← 戻る</button><button className="pd-game-next" type="button" onClick={() => goTo(-1)}>NEXT →</button></div></> : position === -1 ? <Arrival displayName={displayName} signedIn={signedIn} onBack={() => goTo(-2)} onNext={() => goTo(0)} /> : step ? <StepAnswer key={step.id} step={step} last={position === steps.length - 1} signedIn={signedIn} entry={byId.get(step.id)} onBack={() => goTo(Math.max(-1, position - 1))} onNext={() => { goTo(position + 1); if (position === steps.length - 1) setEditing(false); }} /> : <div aria-live="polite"><h2>完走状態を確認しています…</h2><p>保存済みの記録を確認して、次の入口を表示します。</p><button className="pd-secondary" type="button" onClick={() => router.refresh()}>もう一度確認</button></div>}
      </div></div>
    </div>}
    <div className="pd-music-credit"><span>Music: Breeze Zero / karawapo · CC BY 4.0 · Synth preview</span></div>
  </main>;
}

function Arrival({ displayName, signedIn, onNext, onBack }: { displayName: string | null; signedIn: boolean; onNext: () => void; onBack: () => void }) {
  const [name, setName] = useState(displayName ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const router = useRouter();
  function save(value: string) {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveDisplayName(value);
        if (!result.ok) { setError(result.error ?? "呼び名を保存できませんでした。"); return; }
        router.refresh();
        onNext();
      } catch { setError("呼び名を保存できませんでした。入力を残したまま再試行できます。"); }
      finally { busy.current = false; }
    });
  }
  if (!signedIn) return <><h2>あなたを、なんとお呼びしたらいいですか？</h2><p>呼び名や回答は、サインインしてから保存できます。</p><div className="pd-game-card-actions"><button className="pd-game-back" type="button" onClick={onNext}>質問を見る →</button><Link className="pd-game-next" href="/setup">サインイン ↗</Link></div></>;
  return <form onSubmit={(event) => { event.preventDefault(); save(name); }}>
    <label className="pd-game-question" htmlFor="portal-display-name">あなたを、なんとお呼びしたらいいですか？</label>
    <input id="portal-display-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="呼ばれたい名前" maxLength={40} autoComplete="off" disabled={pending} />
    <p className="pd-game-small">ニックネームで大丈夫。空欄のままでも進めます。</p>
    <div className="pd-game-card-actions"><button className="pd-game-back" type="button" disabled={pending} onClick={onBack}>← 戻る</button><button className="pd-game-next" disabled={pending} type="submit">{pending ? "保存中…" : "NEXT →"}</button></div>
    <button className="pd-game-skip" type="button" disabled={pending} onClick={() => save("")}>まだ言葉にしない</button>
    {error && <p className="portal-error" role="alert">{error}</p>}
  </form>;
}

function StepAnswer({ step, entry, signedIn, last, onNext, onBack }: { step: JourneyStep; entry?: ProgressEntry; signedIn: boolean; last: boolean; onNext: () => void; onBack: () => void }) {
  const stored = readJourneyAnswer(step.id, entry?.answer);
  const [answer, setAnswer] = useState<string | string[]>(stored?.status === "answered" ? stored.value : step.kind === "multiple" ? [] : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const router = useRouter();
  function save(skip = false) {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    const blank = typeof answer === "string" ? !answer.trim() : !answer.length;
    const value: JourneyAnswer = skip || blank ? { status: "skipped" } : { status: "answered", value: answer };
    startTransition(async () => {
      try {
        const result = await saveStep(step.id, value);
        if (!result.ok) { setError(result.error ?? "保存できませんでした。"); return; }
        router.refresh();
        onNext();
      } catch { setError("保存できませんでした。入力を残したまま再試行できます。"); }
      finally { busy.current = false; }
    });
  }
  return <>
    {step.kind === "text" ? <label className="pd-game-question" htmlFor={`answer-${step.id}`}>{step.title}</label> : <h2>{step.title}</h2>}
    {step.note && <p className="pd-game-small">{step.note}</p>}
    {signedIn ? <form onSubmit={(event) => { event.preventDefault(); save(); }}>
      {step.kind === "text" ? <textarea id={`answer-${step.id}`} rows={3} maxLength={2000} value={typeof answer === "string" ? answer : ""} placeholder={step.placeholder} disabled={pending} onChange={(event) => setAnswer(event.target.value)} /> : <div className={`pd-game-options ${step.id === "v2-readiness" ? "pd-game-options-stack" : ""}`}>
        {step.options.map((value) => {
          const selected = Array.isArray(answer) ? answer.includes(value) : answer === value;
          return <button key={value} type="button" className={selected ? "is-selected" : ""} aria-pressed={selected} disabled={pending} onClick={() => setAnswer(step.kind === "multiple" ? (Array.isArray(answer) ? selected ? answer.filter((item) => item !== value) : [...answer, value] : [value]) : selected ? "" : value)}>{value} {selected && "↗"}</button>;
        })}
      </div>}
      <div className="pd-game-card-actions"><button className="pd-game-back" type="button" onClick={onBack} disabled={pending}>← 戻る</button><button className="pd-game-next" type="submit" disabled={pending}>{pending ? "保存中…" : last ? "旅を終える →" : "NEXT →"}</button></div>
      <button className="pd-game-skip" type="button" disabled={pending} onClick={() => save(true)}>まだ言葉にしない</button>
    </form> : <><p className="pd-game-small">サインインすると、回答を保存して旅を再開できます。</p><div className="pd-game-card-actions"><button className="pd-game-back" type="button" onClick={onBack}>← 戻る</button><Link className="pd-game-next" href="/setup">サインイン ↗</Link></div></>}
    {error && <p className="portal-error" role="alert">{error}</p>}
  </>;
}
