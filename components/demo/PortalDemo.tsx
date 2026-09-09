"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  dispatchDemo,
  navigateDemo,
  useDemo,
  useDemoScreen,
} from "@/lib/demo/useDemo";
import type { DemoState } from "@/lib/demo/state";
import { DemoWallet } from "./DemoWallet";
import { DemoJourney } from "./DemoJourney";
import { DemoPassport } from "./DemoPassport";
import { CommunityCards, DemoCommunity } from "./DemoCommunity";
import { DemoDialog } from "./DemoDialog";
import "./portal-demo.css";
import "./experience.css";

export function DemoMark() {
  return (
    <svg
      className="pd-mark"
      viewBox="0 0 36 36"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 3 25 18 3 33l6-15L3 3Zm14 0 16 15-16 15 6-15-6-15Z" />
    </svg>
  );
}

export function PortalDemo() {
  const { state, persistent } = useDemo();
  const screen = useDemoScreen();
  const [still, setStill] = useState(false);
  const [sound, setSound] = useState(false);
  const [message, setMessage] = useState("");
  const [dialog, setDialog] = useState<"controls" | "reset" | "credits" | null>(
    null,
  );
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (state.readStatus !== "loading") return;
    const timeout = setTimeout(
      () => dispatchDemo({ type: "reading", status: "ready" }),
      800,
    );
    return () => clearTimeout(timeout);
  }, [state.readStatus, state.account, state.connected]);
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(timeout);
  }, [message]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.getElementById("demo-main")?.focus({ preventScroll: true });
    if (screen !== "journey") audioRef.current?.pause();
  }, [screen]);
  const toggleSound = async () => {
    const player = audioRef.current;
    if (!player) return;
    if (!player.paused) {
      player.pause();
      return;
    }
    player.volume = 0.22;
    try {
      await player.play();
    } catch {
      setMessage("音楽を再生できませんでした。もう一度お試しください。");
    }
  };
  const simulate = (
    scenario: "error" | "other" | "member" | "disconnected" | "normal",
  ) => {
    if (scenario === "disconnected") dispatchDemo({ type: "disconnect" });
    else if (scenario === "member")
      dispatchDemo({ type: "connect", account: "member" });
    else {
      if (!state.connected)
        dispatchDemo({ type: "connect", account: state.account });
      dispatchDemo({
        type: "network",
        network: scenario === "other" ? "other" : "polygon",
      });
      dispatchDemo({
        type: "reading",
        status: scenario === "error" ? "error" : "ready",
      });
    }
    setDialog(null);
    navigateDemo("setup");
  };

  return (
    <div
      className={
        "portal-demo " +
        (screen === "journey" ? "pd-dark " : "") +
        (still ? "pd-still" : "")
      }
    >
      <a
        className="pd-skip"
        href="#demo-main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("demo-main")?.focus();
        }}
      >
        本文へスキップ
      </a>
      <div className="pd-demo-notice">
        <span className="pd-live-dot" /> EXPERIENCE DEMO{" "}
        <span>
          ウォレット・申請・報酬は模擬体験です。入力はこのブラウザ内に保存されます。
        </span>
      </div>
      <header className="pd-header">
        <a href="#home" className="pd-brand" aria-label="HENKAKU ポータルへ">
          <DemoMark />
          <span>
            HENKAKU<span className="pd-brand-sub">COMMUNITY</span>
          </span>
        </a>
        <nav aria-label="デモのメインメニュー">
          <a
            href="#community"
            aria-current={screen === "community" ? "page" : undefined}
          >
            Community
          </a>
          <a
            href="#journey"
            aria-current={screen === "journey" ? "page" : undefined}
          >
            Initiation
          </a>
          <a
            className="pd-nav-passport"
            href="#passport"
            aria-current={screen === "passport" ? "page" : undefined}
          >
            My passport <span>↗</span>
          </a>
        </nav>
      </header>
      <main id="demo-main" tabIndex={-1}>
        {screen === "home" && (
          <Gateway state={state} still={still} setStill={setStill} />
        )}
        {screen === "setup" && <DemoWallet state={state} notify={setMessage} />}
        {screen === "journey" && (
          <DemoJourney
            state={state}
            audioRef={audioRef}
            sound={sound}
            toggleSound={toggleSound}
          />
        )}
        {screen === "passport" && (
          <DemoPassport state={state} notify={setMessage} />
        )}
        {screen === "community" && (
          <DemoCommunity state={state} notify={setMessage} />
        )}
      </main>
      <footer className="pd-footer">
        <span>HENKAKU COMMUNITY</span>
        <div>
          <button onClick={() => setDialog("credits")}>素材・クレジット</button>
          <span>IN PERPETUAL BETA. TOGETHER.</span>
        </div>
      </footer>
      <button
        className="pd-demo-controls"
        onClick={() => setDialog("controls")}
      >
        <span>◇</span> デモ操作
      </button>
      <div
        className={"pd-toast " + (message ? "is-visible" : "")}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
      {!persistent && (
        <div className="pd-storage-warning" role="status">
          このブラウザでは保存できないため、ページを閉じると体験がリセットされます。
        </div>
      )}
      <audio
        ref={audioRef}
        src="/demo-assets/breeze-zero.m4a"
        preload="none"
        loop
        onPlay={() => setSound(true)}
        onPause={() => setSound(false)}
        onError={() => {
          if (sound) setMessage("音楽の読み込みに失敗しました。");
        }}
      />
      {dialog === "controls" && (
        <DemoDialog
          title="いろいろな状態を試す"
          onClose={() => setDialog(null)}
        >
          <p className="pd-dialog-description">
            仮データを切り替えて、入口の見え方を確認できます。
          </p>
          <div className="pd-scenario-grid">
            <button onClick={() => simulate("normal")}>
              通常の状態 <span>↗</span>
            </button>
            <button onClick={() => simulate("error")}>
              取得に失敗したとき <span>↗</span>
            </button>
            <button onClick={() => simulate("other")}>
              別ネットワーク <span>↗</span>
            </button>
            <button onClick={() => simulate("disconnected")}>
              ウォレット未接続 <span>↗</span>
            </button>
            <button onClick={() => simulate("member")}>
              既存メンバーに切替 <span>↗</span>
            </button>
            <button onClick={() => setStill(!still)}>
              {still ? "動きを再開する" : "動きを止める"}{" "}
              <span>{still ? "▷" : "Ⅱ"}</span>
            </button>
          </div>
          <p className="pd-fineprint">
            アカウントを切り替えると進捗は新しくなります。審査の模擬操作はパスポートの申請後に表示されます。
          </p>
          <button
            className="pd-reset-button"
            onClick={() => setDialog("reset")}
          >
            新入りとして最初から体験する
          </button>
        </DemoDialog>
      )}
      {dialog === "reset" && (
        <DemoDialog
          title="最初の入口へ戻りますか？"
          onClose={() => setDialog(null)}
        >
          <p className="pd-dialog-description">
            このブラウザ内のデモ回答・進捗・パスポート・チェックインをリセットします。
          </p>
          <div className="pd-dialog-actions">
            <button className="pd-secondary" onClick={() => setDialog(null)}>
              戻る
            </button>
            <button
              className="pd-primary"
              onClick={() => {
                dispatchDemo({ type: "reset" });
                audioRef.current?.pause();
                setDialog(null);
                navigateDemo("home");
                setMessage("新しい旅をはじめられます。");
              }}
            >
              リセットする <span>→</span>
            </button>
          </div>
        </DemoDialog>
      )}
      {dialog === "credits" && (
        <DemoDialog
          title="このデモの素材について"
          onClose={() => setDialog(null)}
        >
          <div className="pd-credits">
            <h3>Backgrounds</h3>
            <p>
              夜の遺跡・夕暮れの都市：OpenAI image_genによる仮素材。HENKAKU
              portal demo / CC BY 4.0（権利が成立する範囲）。
            </p>
            <h3>Music</h3>
            <p>
              Breeze Zero / karawapo / CC BY 4.0
              <br />
              既存のMIDIから合成した試聴用音源です。
            </p>
            <h3>Design references</h3>
            <p>
              <a
                href="https://henkaku-ui.vercel.app/bubble-multi"
                target="_blank"
                rel="noreferrer"
              >
                複数バブルのGateway案 ↗
              </a>
              <br />
              <a
                href="https://claude.ai/code/artifact/f74311c1-d807-4972-a3d6-51e5547609b1"
                target="_blank"
                rel="noreferrer"
              >
                Game A Prototype ↗
              </a>
            </p>
            <p>
              泡と図形は独自実装です。参考Artifactの画像は収録していません。
            </p>
            <a
              href="/demo-assets/asset-provenance.json"
              target="_blank"
              rel="noreferrer"
            >
              素材の出典・生成プロンプトを見る ↗
            </a>
          </div>
        </DemoDialog>
      )}
    </div>
  );
}

function Gateway({
  state,
  still,
  setStill,
}: {
  state: DemoState;
  still: boolean;
  setStill: (value: boolean) => void;
}) {
  const moveBubbles = (event: PointerEvent<HTMLDivElement>) => {
    if (still || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--pd-pointer-x",
      `${(event.clientX - bounds.left - bounds.width / 2) * 0.18}px`,
    );
    event.currentTarget.style.setProperty(
      "--pd-pointer-y",
      `${(event.clientY - bounds.top - bounds.height / 2) * 0.15}px`,
    );
  };
  const resetBubbles = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--pd-pointer-x", "0px");
    event.currentTarget.style.setProperty("--pd-pointer-y", "0px");
  };
  return (
    <>
      <section className="pd-hero">
        <div className="pd-hero-top pd-mono">
          <span>PUBLIC GATEWAY / 001</span>
          <span>PEOPLE. IDEAS. POSSIBILITIES.</span>
        </div>
        <div className="pd-hero-grid">
          <div className="pd-hero-copy">
            <p className="pd-eyebrow">A COMMUNITY IN THE MAKING</p>
            <h1>
              集まって、
              <br />
              変わって、
              <br />
              <span>また、はじまる。</span>
            </h1>
            <p className="pd-hero-description">
              ひとつの問いから、まだない何かが生まれる。
              <br />
              あなたの好奇心を、HENKAKUへ。
            </p>
            <a
              className="pd-primary"
              href={
                state.completed
                  ? "#passport"
                  : state.stage > 0
                    ? "#journey"
                    : "#setup"
              }
            >
              {state.completed
                ? "あなたのパスポートへ"
                : state.stage > 0
                  ? "旅のつづきへ"
                  : "体験をはじめる"}
              <span>↗</span>
            </a>
          </div>
          <div
            className="pd-hero-art"
            onPointerMove={moveBubbles}
            onPointerLeave={resetBubbles}
            aria-hidden="true"
          >
            <div className="pd-art-word">HENKAKU</div>
            <div className="pd-shard" />
            <div className="pd-orbit" />
            <div className="pd-orbit pd-orbit-two" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span className={"pd-bubble pd-bubble-" + i} key={i} />
            ))}
            <span className="pd-art-coordinate pd-mono">
              PEOPLE → POSSIBILITIES
              <br />
              CONNECTED, NOT COMPLETED.
            </span>
          </div>
        </div>
        <div className="pd-hero-bottom">
          <span className="pd-mono">SCROLL TO EXPLORE ↓</span>
          <div className="pd-tags">
            <span>CO-CREATION</span>
            <span>ART</span>
            <span>AI</span>
            <span>DAO</span>
            <span>OPENNESS</span>
          </div>
          <button
            onClick={() => setStill(!still)}
            className="pd-text-button"
            aria-pressed={still}
          >
            {still ? "動きを再開" : "動きを止める"} {still ? "▷" : "Ⅱ"}
          </button>
        </div>
      </section>
      <section className="pd-home-community">
        <div className="pd-section-heading">
          <div>
            <span className="pd-eyebrow">01 / COMMUNITY PULSE</span>
            <h2>その好奇心の、となりに。</h2>
          </div>
          <a href="#community" className="pd-text-link">
            コミュニティを見る <span>↗</span>
          </a>
        </div>
        <p className="pd-section-intro">
          小さな実験が、あちこちではじまっています。
          <span className="pd-tag">SAMPLE ACTIVITIES</span>
        </p>
        <CommunityCards state={state} compact />
      </section>
      <section className="pd-journey-invitation">
        <div className="pd-invitation-image" aria-hidden="true" />
        <div className="pd-invitation-copy">
          <span className="pd-eyebrow">02 / THE INITIATION</span>
          <h2>
            まだ見ぬ世界の、
            <br />
            入口に立つ。
          </h2>
          <p>
            5つの景色をめぐる、小さな旅。
            <br />
            正解はありません。あなたのままで、進んでください。
          </p>
          <a className="pd-light-button" href="#journey">
            旅に出る <span>→</span>
          </a>
          <span className="pd-mono">5 STAGES / YOUR OWN PACE</span>
        </div>
      </section>
      <section className="pd-home-manifesto">
        <span className="pd-eyebrow">ALWAYS BECOMING.</span>
        <h2>
          ひとりの「やってみたい」が、
          <br />
          みんなの「はじまり」になる。
        </h2>
        <p>
          つくる人も、問いかける人も、そっと見守る人も。
          <br />
          違うまま、一緒にいられる場所を。
        </p>
        <a href="#setup" className="pd-text-link">
          HENKAKUに参加する <span>↗</span>
        </a>
        <div aria-hidden="true">↗</div>
      </section>
    </>
  );
}
