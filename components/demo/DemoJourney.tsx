"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import {
  contributionOptions,
  interestOptions,
  type DemoState,
} from "@/lib/demo/state";
import { dispatchDemo, navigateDemo } from "@/lib/demo/useDemo";
import "./explorer-scene.css";

import { journeyScenes as stages } from "@/lib/portal/journeyScenes";

export function DemoJourney({
  state,
  audioRef,
  sound,
  toggleSound,
}: {
  state: DemoState;
  audioRef: RefObject<HTMLAudioElement | null>;
  sound: boolean;
  toggleSound: () => void;
}) {
  const [look, setLook] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const showComplete = state.completed && !reviewing;
  const question = state.finalQuestion;
  const cardRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const target = showComplete ? welcomeRef.current : cardRef.current;
    target?.focus({ preventScroll: true });
  }, [state.stage, question, showComplete]);
  const scene = stages[state.stage];
  const update = (
    key: "name" | "curiosity" | "experience" | "readiness" | "contribution",
    value: string,
  ) => dispatchDemo({ type: "answer", key, value });
  const next = () => {
    dispatchDemo({
      type: state.stage === 4 && question === 2 ? "finish" : "nextStage",
    });
    if (state.stage === 4 && question === 2) setReviewing(false);
    setLook(0);
  };
  const back = () => {
    dispatchDemo({ type: "previousStage" });
    setLook(0);
  };
  const skip = () => {
    if (state.stage === 1) update("name", "");
    if (state.stage === 2)
      state.answers.interests.forEach((value) =>
        dispatchDemo({ type: "interest", value }),
      );
    if (state.stage === 3) update("curiosity", "");
    if (state.stage === 4)
      update(
        question === 0
          ? "experience"
          : question === 1
            ? "readiness"
            : "contribution",
        "",
      );
    next();
  };

  return (
    <section
      className={`pd-game ${showComplete ? "pd-game-complete" : "pd-game-journey"}`}
      aria-label="Initiationの旅"
    >
      {showComplete && (
        <>
          <div className="pd-game-world pd-world-dusk" aria-hidden="true" />
          <div className="pd-game-shade" aria-hidden="true" />
        </>
      )}
      <div className="pd-game-top">
        <button className="pd-game-exit" onClick={() => navigateDemo("home")}>
          ← ポータルへ
        </button>
        <div
          className="pd-game-progress"
          aria-label={`${showComplete ? 5 : state.stage + 1}/5 ステージ`}
        >
          {stages.map((s, i) => (
            <span
              key={s.title}
              className={
                showComplete || i <= state.stage ? "is-reached" : ""
              }
              aria-current={
                !showComplete && i === state.stage ? "step" : undefined
              }
            >
              <b>{String(i + 1).padStart(2, "0")}</b>
              <i>{s.title}</i>
            </span>
          ))}
        </div>
        <button
          className="pd-sound"
          onClick={toggleSound}
          aria-pressed={sound}
          aria-label={sound ? "音楽を止める" : "音楽を再生"}
        >
          {sound ? "Ⅱ" : "♫"} <span>SOUND {sound ? "ON" : "OFF"}</span>
        </button>
      </div>
      {showComplete ? (
        <div className="pd-welcome">
          <div className="pd-welcome-symbol">✳</div>
          <p className="pd-mono">THIS IS YOUR BEGINNING.</p>
          <h1 ref={welcomeRef} tabIndex={-1}>
            WELCOME TO
            <br />
            <span>HENKAKU.</span>
          </h1>
          <p>
            {state.answers.name ? `${state.answers.name}さん、` : ""}
            来てくれて、ありがとう。
            <br />
            あなたがいることで、この場所は少し変わりました。
          </p>
          <div className="pd-welcome-interests">
            {(state.answers.interests.length
              ? state.answers.interests
              : ["CURIOSITY"]
            ).map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
          <button
            className="pd-primary"
            onClick={() => navigateDemo("passport")}
          >
            あなたのパスポートへ <span>↗</span>
          </button>
          <button className="pd-text-button" onClick={() => {
            dispatchDemo({ type: "revisitJourney" });
            setReviewing(true);
            setLook(0);
          }}>回答を見直す</button>
          <p className="pd-game-small">
            ここまでの回答は、このブラウザ内に保存されています。
          </p>
        </div>
      ) : (
        <div className="pd-journey-layout">
          <div className="pd-journey-scene">
            <div className="pd-journey-viewport">
              <div
                className={`pd-scene-plane pd-scene-plane-${scene.image}`}
                style={{ transform: `translateX(${look * 3}%)` }}
              >
                <div
                  className={`pd-game-world pd-world-${scene.image}`}
                  aria-hidden="true"
                />
                <div className="pd-explorer-scene">
                  <div className="pd-explorer-ground" aria-hidden="true" />
                  <Image
                    className="pd-explorer-image"
                    src="/demo-assets/explorer.webp"
                    alt="リュックを背負い、画面奥の世界を見つめて佇む探究者"
                    width={265}
                    height={720}
                    sizes="(max-width: 620px) 75px, 100px"
                    preload
                  />
                </div>
              </div>
              <div className="pd-game-shade" aria-hidden="true" />
              <div className="pd-scene-heading">
                <p className="pd-mono">
                  STAGE {String(state.stage + 1).padStart(2, "0")} / 05
                </p>
                <h1>{scene.title}</h1>
                <p>{scene.japanese}</p>
              </div>
            </div>
            <div className="pd-look-controls">
              <span className="pd-mono">LOOK AROUND</span>
              <div>
                <button
                  aria-label="左を見る"
                  onClick={() => setLook(Math.max(-1, look - 1))}
                >
                  ←
                </button>
                <button aria-label="正面を見る" onClick={() => setLook(0)}>
                  ＋
                </button>
                <button
                  aria-label="右を見る"
                  onClick={() => setLook(Math.min(1, look + 1))}
                >
                  →
                </button>
              </div>
              <span className="pd-look-bearing pd-mono" aria-live="polite">
                {look < 0
                  ? "WEST / 新しい気配"
                  : look > 0
                    ? "EAST / 遠くの灯り"
                    : "A PATH NOT YET TAKEN"}
              </span>
              <p>{scene.caption}</p>
            </div>
          </div>
          <div className="pd-game-bottom">
            <div
              className="pd-game-card"
              ref={cardRef}
              role="group"
              tabIndex={-1}
              aria-label={scene.japanese}
              key={`${state.stage}-${question}`}
            >
              <div className="pd-game-card-label">
                <span>
                  {state.stage === 4
                    ? `FINAL QUESTIONS / ${question + 1} OF 3`
                    : `SIGNAL ${String(state.stage + 1).padStart(2, "0")}`}
                </span>
                <span>任意で答えられます</span>
              </div>
              {state.stage === 0 && (
                <>
                  <h2>はじめまして、旅人。</h2>
                  <p>
                    ここは、まだ決まった形のない場所。
                    <br />
                    問いを持った人たちが、集まっては何かをつくっています。
                  </p>
                  <p>
                    答えが見つからなくても大丈夫。
                    <br />
                    まずは、少し歩いてみませんか。
                  </p>
                </>
              )}
              {state.stage === 1 && (
                <>
                  <label className="pd-game-question" htmlFor="demo-name">
                    あなたを、なんとお呼びしたらいいですか？
                  </label>
                  <input
                    id="demo-name"
                    maxLength={40}
                    value={state.answers.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="呼ばれたい名前"
                    autoComplete="off"
                  />
                  <p className="pd-game-small">
                    ニックネームで大丈夫。空欄のままでも進めます。
                  </p>
                </>
              )}
              {state.stage === 2 && (
                <>
                  <h2>HENKAKUで、気になることは？</h2>
                  <p className="pd-game-small">いくつでも選べます。</p>
                  <div className="pd-game-options">
                    {interestOptions.map((v) => (
                      <button
                        key={v}
                        className={
                          state.answers.interests.includes(v)
                            ? "is-selected"
                            : ""
                        }
                        aria-pressed={state.answers.interests.includes(v)}
                        onClick={() =>
                          dispatchDemo({ type: "interest", value: v })
                        }
                      >
                        {v} {state.answers.interests.includes(v) && "↗"}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {state.stage === 3 && (
                <>
                  <label className="pd-game-question" htmlFor="demo-curiosity">
                    いま、気になっていることを教えてください。
                  </label>
                  <textarea
                    id="demo-curiosity"
                    rows={3}
                    maxLength={2000}
                    value={state.answers.curiosity}
                    onChange={(e) => update("curiosity", e.target.value)}
                    placeholder="たとえば、AIと音楽で何かつくってみたい。"
                  />
                  <p className="pd-game-small">まだ輪郭のないアイデアでも。</p>
                </>
              )}
              {state.stage === 4 && question === 0 && (
                <>
                  <label className="pd-game-question" htmlFor="demo-experience">
                    誰かと一緒に、何かを動かした経験はありますか？
                  </label>
                  <textarea
                    id="demo-experience"
                    rows={3}
                    maxLength={2000}
                    value={state.answers.experience}
                    onChange={(e) => update("experience", e.target.value)}
                    placeholder="どんな小さなことでも、あなたの言葉で。"
                  />
                </>
              )}
              {state.stage === 4 && question === 1 && (
                <>
                  <h2>HENKAKUで活動する準備は？</h2>
                  <div className="pd-game-options pd-game-options-stack">
                    {[
                      "はい、やってみたい！",
                      "まだ迷っている",
                      "今は静かに見たい",
                    ].map((v) => (
                      <button
                        key={v}
                        aria-pressed={state.answers.readiness === v}
                        className={
                          state.answers.readiness === v ? "is-selected" : ""
                        }
                        onClick={() => update("readiness", v)}
                      >
                        {v}
                        <span>{state.answers.readiness === v ? "✓" : "○"}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {state.stage === 4 && question === 2 && (
                <>
                  <h2>この場所に、何を持っていきますか？</h2>
                  <div className="pd-game-options">
                    {contributionOptions.map((v) => (
                      <button
                        key={v}
                        aria-pressed={state.answers.contribution === v}
                        className={
                          state.answers.contribution === v ? "is-selected" : ""
                        }
                        onClick={() =>
                          update(
                            "contribution",
                            state.answers.contribution === v ? "" : v,
                          )
                        }
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="pd-game-card-actions">
                <button
                  className="pd-game-back"
                  onClick={back}
                  disabled={state.stage === 0}
                >
                  ← 戻る
                </button>
                {state.stage > 0 && (
                  <button className="pd-game-skip" onClick={skip}>
                    まだ言葉にしない
                  </button>
                )}
                <button className="pd-game-next" onClick={next}>
                  {state.stage === 4 && question === 2 ? "旅を終える" : "NEXT"}{" "}
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="pd-music-credit">
        <span>Music: Breeze Zero / karawapo · CC BY 4.0 · Synth preview</span>
        {sound && (
          <button
            onClick={() => {
              if (audioRef.current)
                audioRef.current.volume =
                  audioRef.current.volume > 0.15 ? 0.1 : 0.3;
            }}
          >
            音量を切替
          </button>
        )}
      </div>
    </section>
  );
}
