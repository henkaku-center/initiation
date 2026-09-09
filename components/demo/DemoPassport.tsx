"use client";
import { useState } from "react";
import { type DemoState } from "@/lib/demo/state";
import { dispatchDemo, navigateDemo } from "@/lib/demo/useDemo";
import { DemoDialog } from "./DemoDialog";
import { WalletStatus } from "./DemoWallet";

export function DemoPassport({
  state,
  notify,
}: {
  state: DemoState;
  notify: (text: string) => void;
}) {
  const [review, setReview] = useState(false);
  const canTransact =
    state.connected && state.signedIn && state.network === "polygon";
  const labels = {
    none: "未申請",
    pending: "審査待ち",
    needs_info: "確認事項あり",
    approved: "承認済み",
    rejected: "見送り",
  };
  const act = (type: "claimNFT" | "apply" | "claimReward", message: string) => {
    dispatchDemo({ type });
    notify(message);
  };
  return (
    <section className="pd-page pd-passport-page">
      <div className="pd-page-heading">
        <p className="pd-eyebrow">YOUR PLACE IN HENKAKU</p>
        <h1>あなたの、はじまりのしるし。</h1>
        <p>
          {state.completed
            ? `${state.answers.name || "旅人"}さん、おかえりなさい。次の入口が開いています。`
            : "旅を終えた先に、あなたのパスポートが待っています。"}
        </p>
      </div>
      {!state.completed && (
        <div className="pd-empty-journey">
          <span className="pd-empty-symbol">↗</span>
          <div>
            <h2>まずは、小さな旅に出よう。</h2>
            <p>5つの景色をめぐると、参加のしるしを受け取れます。</p>
          </div>
          <button
            className="pd-primary"
            onClick={() => navigateDemo("journey")}
          >
            {state.stage > 0 ? "旅のつづきへ" : "Initiationへ"}
            <span>→</span>
          </button>
        </div>
      )}
      <div className="pd-rewards-label">
        <span className="pd-mono">AFTER INITIATION / FOUR OPEN DOORS</span>
        <span className="pd-tag">CONCEPT DEMO</span>
      </div>
      <div className="pd-reward-grid">
        <article
          className={`pd-reward-card ${state.participantNFT ? "is-unlocked" : ""}`}
        >
          <div className="pd-reward-step">
            <span>01 / PARTICIPANT</span>
            <span>{state.participantNFT ? "✓" : "◇"}</span>
          </div>
          <div
            className={`pd-nft-art ${state.participantNFT ? "is-claimed" : ""}`}
          >
            <div className="pd-nft-lines" />
            <span className="pd-nft-top">
              HENKAKU
              <br />
              INITIATION
            </span>
            <span className="pd-nft-symbol">✳</span>
            <div className="pd-nft-bottom">
              <strong>{state.answers.name || "TRAVELER"}</strong>
              <span>PARTICIPANT / DEMO 001</span>
            </div>
          </div>
          <h2>参加のしるし</h2>
          <p>この旅を通った、あなただけのNFTパスポート。</p>
          <button
            className="pd-primary pd-full"
            disabled={!state.completed || state.participantNFT}
            onClick={() =>
              act("claimNFT", "参加のしるしを受け取りました（デモNFT）")
            }
          >
            {state.participantNFT ? "受け取り済み ✓" : "NFTを受け取る"}
          </button>
        </article>
        <article
          className={`pd-reward-card ${state.application === "approved" ? "is-unlocked" : ""}`}
        >
          <div className="pd-reward-step">
            <span>02 / ALLOWLIST</span>
            <span>{state.application === "approved" ? "✓" : "↗"}</span>
          </div>
          <div className="pd-reward-visual pd-allowlist-visual">
            <span className="pd-lines-card">
              <i />
              <i />
              <i />
              <b>✓</b>
            </span>
          </div>
          <h2>コミュニティへ申請</h2>
          <p>
            {state.application === "pending"
              ? "申請が届きました。デモ審査を開いて、この先を試せます。"
              : state.application === "needs_info"
                ? "内容を確認して、もう一度申請できます。"
                : state.application === "rejected"
                  ? "今回は見送りになりました。デモ操作から最初に戻して再体験できます。"
                  : "参加の準備ができたら、Allowlistへの登録を申請。"}
          </p>
          <span
            className={`pd-application-state ${state.application === "approved" ? "pd-success-text" : ""}`}
          >
            ● {labels[state.application]}
          </span>
          {state.application === "pending" ? (
            <button
              className="pd-primary pd-full"
              onClick={() => setReview(true)}
            >
              デモ審査を開く <span>→</span>
            </button>
          ) : !canTransact &&
            state.participantNFT &&
            !["approved", "rejected"].includes(state.application) ? (
            <button
              className="pd-secondary pd-full"
              onClick={() => navigateDemo("setup")}
            >
              サインインして申請 →
            </button>
          ) : (
            <button
              className="pd-primary pd-full"
              disabled={
                !state.participantNFT ||
                !canTransact ||
                ["approved", "rejected"].includes(state.application)
              }
              onClick={() => act("apply", "申請を受け付けました（デモ）")}
            >
              {state.application === "approved"
                ? "登録済み ✓"
                : state.application === "needs_info"
                  ? "確認して再申請"
                  : "登録を申請する"}
            </button>
          )}
        </article>
        <article
          className={`pd-reward-card ${state.rewardClaimed ? "is-unlocked" : ""}`}
        >
          <div className="pd-reward-step">
            <span>03 / HENKAKU</span>
            <span>{state.rewardClaimed ? "✓" : "⊕"}</span>
          </div>
          <div className="pd-reward-visual">
            <div className="pd-reward-coin">
              <span>H</span>
            </div>
          </div>
          <h2>はじまりのHENKAKU</h2>
          <p>承認されたら、コミュニティでの一歩を後押しするトークンを。</p>
          <span className="pd-reward-amount">
            100 <small>HENKAKU · DEMO</small>
          </span>
          {state.application === "approved" &&
          !canTransact &&
          !state.rewardClaimed ? (
            <button
              className="pd-secondary pd-full"
              onClick={() => navigateDemo("setup")}
            >
              サインインして受け取る →
            </button>
          ) : (
            <button
              className="pd-primary pd-full"
              disabled={
                state.application !== "approved" ||
                !canTransact ||
                state.rewardClaimed
              }
              onClick={() =>
                act(
                  "claimReward",
                  "100 HENKAKUとメンバーロールを受け取りました（デモ）",
                )
              }
            >
              {state.rewardClaimed ? "受け取り済み ✓" : "HENKAKUを受け取る"}
            </button>
          )}
        </article>
        <article
          className={`pd-reward-card ${state.rewardClaimed ? "is-unlocked" : ""}`}
        >
          <div className="pd-reward-step">
            <span>04 / MEMBERSHIP</span>
            <span>{state.rewardClaimed ? "✓" : "✳"}</span>
          </div>
          <div className="pd-reward-visual pd-membership-visual">
            <span>✳</span>
            <i>YOU BELONG HERE</i>
          </div>
          <h2>ここから、一緒に。</h2>
          <p>次はあなたの活動が、新しく来る誰かの入口になります。</p>
          <span className="pd-application-state">
            {state.rewardClaimed
              ? "● MEMBER / ロール獲得"
              : "メンバーロールを待っています"}
          </span>
          <button
            className="pd-primary pd-full"
            disabled={!state.rewardClaimed}
            onClick={() => navigateDemo("community")}
          >
            コミュニティへ <span>↗</span>
          </button>
        </article>
      </div>
      <p className="pd-passport-disclaimer">
        ここでのNFT発行・申請・トークン受領・ロール付与は構想を試すための模擬操作です。実際の資産や権限は付与されません。
      </p>
      <div className="pd-passport-details">
        <div className="pd-panel">
          <div className="pd-panel-top">
            <span className="pd-mono">WALLET STATUS / DEMO</span>
            <button
              className="pd-text-button"
              onClick={() => navigateDemo("setup")}
            >
              ウォレットを見る ↗
            </button>
          </div>
          <WalletStatus state={state} />
        </div>
        <div className="pd-panel pd-your-signals">
          <span className="pd-mono">YOUR SIGNALS</span>
          <h3>{state.answers.name || "まだ名のない旅人"}</h3>
          <div className="pd-signals-tags">
            {state.answers.interests.map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
          <p>
            {state.answers.curiosity ||
              "まだ言葉になっていない好奇心も、ここに。"}
          </p>
          {state.answers.contribution && (
            <span className="pd-signal-contribution">
              BRINGING / {state.answers.contribution}
            </span>
          )}
        </div>
      </div>
      {review && (
        <DemoDialog title="申請のその先を試す" onClose={() => setReview(false)}>
          <p className="pd-dialog-description">
            運営の審査結果を仮に切り替えます。この操作はデモ専用です。
          </p>
          <div className="pd-review-actions">
            {(
              [
                {
                  result: "approved",
                  title: "承認してAllowlistへ追加",
                  detail: "HENKAKUの受け取りに進めます。",
                },
                {
                  result: "needs_info",
                  title: "確認事項を返す",
                  detail: "再申請の流れを確認できます。",
                },
                {
                  result: "rejected",
                  title: "今回は見送る",
                  detail: "見送り時の表示を確認できます。",
                },
              ] as const
            ).map((item) => (
              <button
                className="pd-wallet-option"
                key={item.result}
                onClick={() => {
                  dispatchDemo({ type: "review", result: item.result });
                  setReview(false);
                  notify(
                    `審査結果を「${labels[item.result]}」にしました（デモ）`,
                  );
                }}
              >
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <span>→</span>
              </button>
            ))}
          </div>
        </DemoDialog>
      )}
    </section>
  );
}
