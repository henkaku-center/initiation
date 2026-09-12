// ABOUTME: MetaMask(injected)接続ボタン。接続拒否は復帰可能なエラーとして表示する。
// ABOUTME: 接続済みのアドレスと切断操作を最小の UI で提供する。
"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { buttonStyles } from "@/lib/ui";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="space-y-3">
        <p className="break-all rounded-lg bg-surface-hover px-3 py-2 font-mono text-xs text-foreground" data-testid="address">
          {address}
        </p>
        <button className={buttonStyles.quiet} type="button" onClick={() => disconnect()}>
          切断
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        className={buttonStyles.primary}
        type="button"
        disabled={isPending || !connectors[0]}
        onClick={() => { if (connectors[0]) connect({ connector: connectors[0] }); }}
      >
        {isPending ? "ウォレットでの接続を待っています…" : "ウォレットを接続"}
      </button>
      {!connectors[0] && <p role="status">対応ウォレットが見つかりません。MetaMaskなどのウォレットを用意してください。</p>}
      {error && (
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-300" role="alert">
          接続できませんでした: {error.message}
        </p>
      )}
    </div>
  );
}
