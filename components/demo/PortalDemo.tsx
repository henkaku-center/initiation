"use client";

import { useEffect, useRef, useState } from "react";
import {
  dispatchDemo,
  navigateDemo,
  useDemo,
  useDemoScreen,
} from "@/lib/demo/useDemo";
import { DemoWallet } from "./DemoWallet";
import { DemoJourney } from "./DemoJourney";
import { DemoPassport } from "./DemoPassport";
import { DemoCommunity } from "./DemoCommunity";
import { DemoDialog } from "./DemoDialog";
import { ReferenceGateway } from "./ReferenceGatewayView";
import "./portal-demo.css";
import "./experience.css";
import "./reference-gateway.css";

export function DemoMark() {
  return (
    <svg
      className="pd-mark"
      viewBox="0 0 48 60"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M0 0 L48 37 L19 37 L0 60 Z" />
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
    const initialTarget = screen === "home" ? document.querySelector<HTMLButtonElement>(".pd-intro-enter") : null;
    (initialTarget ?? document.getElementById("demo-main"))?.focus({ preventScroll: true });
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
        (still ? "pd-still" : "") + (screen === "home" ? " pd-reference-home" : "")
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
        {screen === "home" && <ReferenceGateway />}
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
              夜の遺跡・夕暮れの都市、CommunityとPassportの画像：OpenAI image_genによる生成素材。HENKAKU
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
                href="https://henkaku-ui.vercel.app/liquid"
                target="_blank"
                rel="noreferrer"
              >
                Liquid / Bubble Decrypt Reveal ↗
              </a>
              <br />
              <a href="https://henkaku-ui.vercel.app/gateway-v1-claude" target="_blank" rel="noreferrer">
                Gatewayの通し版 ↗
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
              トップページは参照元のソースを基に構成し、元のライセンス表記を保持しています。
            </p>
            <a
              href="/demo-assets/polished-provenance.json"
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
