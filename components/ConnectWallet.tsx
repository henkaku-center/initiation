// ABOUTME: MetaMask(injected)接続ボタン。接続拒否は復帰可能なエラーとして表示する。
// ABOUTME: 接続済みのアドレスと切断操作を最小の UI で提供する。
"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortenAddress } from "@/lib/domain/address";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div>
        <div className="pd-wallet-identity"><div className="pd-identicon is-connected"><span>◇</span></div><div><h2>あなたのウォレット</h2><p data-testid="address" title={address}>{address ? shortenAddress(address) : "接続を確認しています…"}</p></div><span className="pd-status-pill">● CONNECTED</span></div>
        <div className="pd-wallet-actions"><button className="pd-text-button" type="button" onClick={() => disconnect()}>
          切断
        </button></div>
      </div>
    );
  }

  return (
    <div>
      <div className="pd-wallet-identity"><div className="pd-identicon"><span>◇</span></div><div><h2>まだ、つながっていません</h2><p>MetaMaskなどのウォレットを使います。</p></div></div>
      <div className="pd-wallet-actions">
      <button
        className="pd-primary"
        type="button"
        disabled={isPending || !connectors[0]}
        onClick={() => { if (connectors[0]) connect({ connector: connectors[0] }); }}
      >
        {isPending ? "ウォレットでの接続を待っています…" : "ウォレットを接続"}
      </button>
      </div>
      {!connectors[0] && <p role="status">対応ウォレットが見つかりません。MetaMaskなどのウォレットを用意してください。</p>}
      {error && (
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-300" role="alert">
          接続できませんでした: {error.message}
        </p>
      )}
    </div>
  );
}
