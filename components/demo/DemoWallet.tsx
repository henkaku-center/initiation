"use client";
import { useState } from "react";
import { walletSnapshot, type DemoState } from "@/lib/demo/state";
import { dispatchDemo, navigateDemo } from "@/lib/demo/useDemo";
import { DemoDialog } from "./DemoDialog";

export function WalletStatus({ state }: { state: DemoState }) {
  const status = walletSnapshot(state);
  const unavailable = {
    disconnected: "ウォレットを接続してください",
    loading: "確認しています…",
    error: "取得できませんでした",
    unsupported: "Polygonに切り替えてください",
  };
  return (
    <div
      className="pd-wallet-readings"
      aria-live="polite"
      aria-busy={status.kind === "loading"}
    >
      <div>
        <span className="pd-reading-label">
          <span className="pd-token-icon">H</span> HENKAKU TOKEN
        </span>
        <strong>
          {status.kind === "ready" ? (
            <>
              {status.balance.toLocaleString()} <small>HENKAKU</small>
            </>
          ) : (
            "—"
          )}
        </strong>
        <span
          className={`pd-reading-note ${status.kind === "ready" && status.balance > 0 ? "pd-success-text" : ""}`}
        >
          {status.kind === "ready"
            ? status.balance > 0
              ? "● 保有しています"
              : "まだ保有していません"
            : unavailable[status.kind]}
        </span>
      </div>
      <div>
        <span className="pd-reading-label">
          <span className="pd-token-icon pd-outline-token">✓</span> ALLOWLIST
        </span>
        <strong>
          {status.kind === "ready"
            ? status.allowlisted
              ? "登録済み"
              : "未登録"
            : "—"}
        </strong>
        <span
          className={`pd-reading-note ${status.kind === "ready" && status.allowlisted ? "pd-success-text" : ""}`}
        >
          {status.kind === "ready"
            ? status.allowlisted
              ? "● コミュニティへの参加準備OK"
              : "Initiationのあとに申請できます"
            : unavailable[status.kind]}
        </span>
      </div>
    </div>
  );
}

export function DemoWallet({
  state,
  notify,
}: {
  state: DemoState;
  notify: (text: string) => void;
}) {
  const [dialog, setDialog] = useState<"wallet" | "sign" | null>(null);
  return (
    <section className="pd-page pd-setup-page">
      <div className="pd-page-heading">
        <p className="pd-eyebrow">00 / BEFORE THE JOURNEY</p>
        <h1>まずは、あなたの入口を。</h1>
        <p>ウォレットを準備して、小さな旅をはじめましょう。</p>
      </div>
      <div className="pd-setup-grid">
        <div className="pd-setup-main">
          <div className="pd-panel">
            <div className="pd-panel-top">
              <span className="pd-mono">YOUR WALLET</span>
              <span className="pd-tag">SIMULATED</span>
            </div>
            <div className="pd-wallet-identity">
              <div
                className={`pd-identicon ${state.connected ? "is-connected" : ""}`}
              >
                <span>◇</span>
              </div>
              <div>
                <h2>
                  {state.connected
                    ? state.account === "member"
                      ? "Member wallet"
                      : "Your first wallet"
                    : "まだ、つながっていません"}
                </h2>
                <p>
                  {state.connected
                    ? state.account === "member"
                      ? "0xDEMO…0002"
                      : "0xDEMO…0001"
                    : "実際のウォレットは不要です"}
                </p>
              </div>
              {state.connected && (
                <span className="pd-status-pill">● CONNECTED</span>
              )}
            </div>
            <div className="pd-wallet-actions">
              {state.connected ? (
                <>
                  <button
                    className="pd-secondary"
                    onClick={() => setDialog("wallet")}
                  >
                    アカウントを切り替える
                  </button>
                  <button
                    className="pd-text-button"
                    onClick={() => dispatchDemo({ type: "disconnect" })}
                  >
                    接続を解除
                  </button>
                </>
              ) : (
                <button
                  className="pd-primary"
                  onClick={() => setDialog("wallet")}
                >
                  デモウォレットを接続 <span>↗</span>
                </button>
              )}
            </div>
            <div className="pd-setup-step">
              <span
                className={`pd-step-number ${state.signedIn ? "is-done" : ""}`}
              >
                {state.signedIn ? "✓" : "1"}
              </span>
              <div>
                <h3>ウォレットでサインイン</h3>
                <p>
                  {state.signedIn
                    ? "このデモでサインインしています。"
                    : "あなたの入口であることを、署名で確かめます。"}
                </p>
              </div>
              <button
                className="pd-secondary"
                disabled={
                  !state.connected ||
                  state.network !== "polygon" ||
                  state.signedIn
                }
                onClick={() => setDialog("sign")}
              >
                {state.signedIn ? "確認済み" : "署名する"}
              </button>
            </div>
            <div className="pd-setup-step">
              <span
                className={`pd-step-number ${state.connected && state.network === "polygon" ? "is-done" : ""}`}
              >
                {state.connected && state.network === "polygon" ? "✓" : "2"}
              </span>
              <div>
                <h3>Polygonにつなぐ</h3>
                <p>
                  {state.connected && state.network === "polygon"
                    ? "Polygonネットワークを選択しています。"
                    : "HENKAKUが使えるネットワークです。"}
                </p>
              </div>
              <button
                className="pd-secondary"
                disabled={!state.connected || state.network === "polygon"}
                onClick={() =>
                  dispatchDemo({ type: "network", network: "polygon" })
                }
              >
                {state.connected && state.network === "polygon"
                  ? "接続済み"
                  : "切り替える"}
              </button>
            </div>
            <div className="pd-setup-step">
              <span
                className={`pd-step-number ${state.tokenAdded ? "is-done" : ""}`}
              >
                {state.tokenAdded ? "✓" : "3"}
              </span>
              <div>
                <h3>
                  HENKAKUを表示に追加 <small>任意</small>
                </h3>
                <p>ウォレットの一覧で見つけやすくします。</p>
              </div>
              <button
                className="pd-secondary"
                disabled={
                  !state.connected ||
                  state.network !== "polygon" ||
                  state.tokenAdded
                }
                onClick={() => {
                  dispatchDemo({ type: "addToken" });
                  notify("HENKAKUをウォレット表示に追加しました（デモ）");
                }}
              >
                {state.tokenAdded ? "追加済み" : "追加する"}
              </button>
            </div>
          </div>
          <div className="pd-next-row">
            <button
              className="pd-primary"
              disabled={!state.signedIn || state.network !== "polygon"}
              onClick={() =>
                navigateDemo(state.completed ? "passport" : "journey")
              }
            >
              {state.completed ? "パスポートに戻る" : "Initiationへ進む"}
              <span>→</span>
            </button>
            {!state.signedIn && (
              <button
                className="pd-text-button"
                onClick={() => navigateDemo("journey")}
              >
                接続せずに体験を見る →
              </button>
            )}
          </div>
        </div>
        <aside>
          <div className="pd-panel pd-status-panel">
            <div className="pd-panel-top">
              <span className="pd-mono">YOUR CURRENT STATUS</span>
              <button
                className="pd-text-button"
                disabled={!state.connected || state.readStatus === "loading"}
                onClick={() =>
                  dispatchDemo({ type: "reading", status: "loading" })
                }
                aria-label="ウォレット状態を再確認"
              >
                ↻ 更新
              </button>
            </div>
            <WalletStatus state={state} />
            <p className="pd-fineprint">
              このデモ内の状態です。実際の残高や登録状況は取得していません。
            </p>
            {state.readStatus === "error" && (
              <button
                className="pd-secondary"
                onClick={() =>
                  dispatchDemo({ type: "reading", status: "loading" })
                }
              >
                もう一度確認する
              </button>
            )}
          </div>
          <div className="pd-aside-note">
            <span>↗</span>
            <h3>まだ持っていなくても、大丈夫。</h3>
            <p>
              HENKAKUは、参加の先に受け取るもの。好奇心があれば、ここからはじめられます。
            </p>
          </div>
        </aside>
      </div>
      {dialog === "wallet" && (
        <DemoDialog
          title="入口を選んでください"
          onClose={() => setDialog(null)}
        >
          <p className="pd-dialog-description">
            仮のアカウントで体験できます。切り替えると、このデモの進捗は新しくなります。
          </p>
          {(["newcomer", "member"] as const).map((account) => (
            <button
              key={account}
              className="pd-wallet-option"
              onClick={() => {
                dispatchDemo({ type: "connect", account });
                dispatchDemo({ type: "reading", status: "loading" });
                setDialog(null);
              }}
            >
              <span className="pd-option-symbol">
                {account === "newcomer" ? "↗" : "✳"}
              </span>
              <span>
                <strong>
                  {account === "newcomer"
                    ? "はじめてのメンバー"
                    : "すでに参加しているメンバー"}
                </strong>
                <small>
                  {account === "newcomer"
                    ? "残高 0 / Allowlist未登録"
                    : "残高 250 HENKAKU / Allowlist登録済み"}
                </small>
              </span>
              <span>→</span>
            </button>
          ))}
          <p className="pd-fineprint">
            実際のウォレットへの接続や資産の移動は行いません。
          </p>
        </DemoDialog>
      )}
      {dialog === "sign" && (
        <DemoDialog
          title="あなたの入口を確かめます"
          onClose={() => setDialog(null)}
        >
          <div className="pd-sign-symbol">✳</div>
          <p className="pd-dialog-description">
            HENKAKUへようこそ。このウォレットでサインインします。
          </p>
          <div className="pd-sign-details">
            <span>ACCOUNT</span>
            <strong>
              {state.account === "member" ? "0xDEMO…0002" : "0xDEMO…0001"}
            </strong>
            <span>NETWORK</span>
            <strong>Polygon · DEMO</strong>
          </div>
          <button
            className="pd-primary pd-full"
            onClick={() => {
              dispatchDemo({ type: "signIn" });
              setDialog(null);
              notify("サインインしました（模擬署名）");
            }}
          >
            模擬署名してサインイン <span>→</span>
          </button>
          <p className="pd-fineprint">このデモでは署名を作成・送信しません。</p>
        </DemoDialog>
      )}
    </section>
  );
}
