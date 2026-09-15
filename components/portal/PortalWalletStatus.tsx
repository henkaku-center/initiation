// ABOUTME: 接続中アドレスの HENKAKU 残高と Allowlist 登録を Polygon から読んで表示する。
// ABOUTME: 取得中・失敗・未保有/未追加・保有/追加済みを別表示にし、サインインは要求しない(Issue #91)。
"use client";

import { useAccount, useReadContract } from "wagmi";
import { polygon } from "wagmi/chains";
import { henkakuTokenAbi, henkakuTokenConfig } from "@/lib/henkakuToken";
import type { Application } from "@/lib/domain/types";
import {
  allowlistNote,
  allowlistReadingView,
  tokenReadingView,
  type ChainReading,
  type ReadingView,
} from "@/lib/domain/walletStatus";

// 配布直後の確認に使えれば十分。公開RPCへの呼び出しを増やさないため、フォーカス時の自動再取得は切る。
const QUERY = { staleTime: 30_000, refetchOnWindowFocus: false } as const;
// 契約の owner は実質固定値。isAllowed の from に使うだけなので長めに保持する。
const OWNER_QUERY = { ...QUERY, staleTime: 5 * 60_000 } as const;

function toReading<T>(result: { data?: T; isError: boolean }): ChainReading<T> {
  if (result.isError) return { status: "error" };
  if (result.data !== undefined) return { status: "ready", value: result.data };
  return { status: "loading" };
}

function safeTokenConfig() {
  try {
    return henkakuTokenConfig();
  } catch {
    return null;
  }
}

export function PortalWalletStatus({
  application = null,
  allowlistTxId = null,
}: {
  application?: Application | null;
  /** Allowlist 登録操作の tx hash(監査イベント由来)。配布 tx とは別物。 */
  allowlistTxId?: string | null;
}) {
  const { address } = useAccount();
  const token = safeTokenConfig();
  const connected = Boolean(address);
  const enabled = connected && token !== null;

  // クエリキーに args(アドレス)が入るため、アカウント切替では新しいキーの取得中表示になり、
  // 前のアドレスの値は残らない。placeholderData は使わない。
  const balance = useReadContract({
    abi: henkakuTokenAbi,
    address: token?.address,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: polygon.id,
    query: { ...QUERY, enabled },
  });
  const owner = useReadContract({
    abi: henkakuTokenAbi,
    address: token?.address,
    functionName: "owner",
    chainId: polygon.id,
    query: { ...OWNER_QUERY, enabled },
  });
  const allowed = useReadContract({
    abi: henkakuTokenAbi,
    address: token?.address,
    functionName: "isAllowed",
    args: address ? [address] : undefined,
    account: owner.data,
    chainId: polygon.id,
    query: { ...QUERY, enabled: enabled && owner.data !== undefined },
  });

  const tokenView: ReadingView = token
    ? tokenReadingView({ connected, balance: toReading(balance), decimals: token.decimals, symbol: token.symbol })
    : { state: "error", text: "トークンの設定がないため取得できません" };
  const allowlistView: ReadingView = token
    ? allowlistReadingView({ connected, allowed: owner.isError ? { status: "error" } : toReading(allowed) })
    : { state: "error", text: "トークンの設定がないため取得できません" };
  const onChain = allowlistView.state === "positive" ? true : allowlistView.state === "negative" ? false : null;
  const note = allowlistNote(onChain, application, allowlistTxId);

  const refetch = () => {
    void balance.refetch();
    void owner.refetch();
    void allowed.refetch();
  };

  return <div className="pd-wallet-readings">
    <div>
      <span className="pd-reading-label"><span className="pd-token-icon">H</span> HENKAKU TOKEN</span>
      <Reading view={tokenView} />
      <span className="pd-reading-note">Polygon上の状態です。{enabled && <button className="pd-text-button" type="button" onClick={refetch}>再取得</button>}</span>
    </div>
    <div>
      <span className="pd-reading-label"><span className="pd-token-icon pd-outline-token">✓</span> ALLOWLIST</span>
      <Reading view={allowlistView} />
      <span className="pd-reading-note">
        {note ? <>{note.text}{note.txId && <>{" "}<a className="pd-text-button" href={txUrl(note.txId)} target="_blank" rel="noopener noreferrer">登録txを確認 ↗</a></>}</> : "Polygon上の状態です。申請記録とは別に表示します。"}
      </span>
    </div>
  </div>;
}

/** 記録済みの Allowlist 登録 tx を Polygon のエクスプローラーで確認するリンク。 */
function txUrl(txId: string): string {
  return `${polygon.blockExplorers.default.url}/tx/${txId}`;
}

function Reading({ view }: { view: ReadingView }) {
  if (view.state === "positive" || view.state === "negative") {
    return <strong data-state={view.state}>{view.text} <small className={view.state === "positive" ? "pd-success-text" : undefined}>{view.verdict}</small></strong>;
  }
  return <strong data-state={view.state}><small role={view.state === "error" ? "alert" : undefined}>{view.text}</small></strong>;
}
