// ABOUTME: shiniri 相当のウォレットセットアップ: Polygon 切替 → HENKAKU トークン追加。
// ABOUTME: watchAsset の成否は表示の補助情報であり、認証や完了条件にはしない。
"use client";

import { useAccount, useSwitchChain, useWatchAsset } from "wagmi";
import { polygon } from "wagmi/chains";
import { henkakuTokenConfig } from "@/lib/henkakuToken";
import { buttonStyles } from "@/lib/ui";

export function WalletSetup() {
  const { chainId, isConnected } = useAccount();
  const { switchChain, error: switchError, isPending: switching } = useSwitchChain();
  const {
    watchAsset,
    data: watched,
    error: watchError,
    isPending: watching,
  } = useWatchAsset();

  if (!isConnected) {
    return <p className="text-sm leading-6 text-muted">先にウォレットを接続してください。</p>;
  }

  let token: ReturnType<typeof henkakuTokenConfig> | null;
  try {
    token = henkakuTokenConfig();
  } catch {
    token = null;
  }

  const onPolygon = chainId === polygon.id;

  return (
    <ol className="space-y-3">
      <li className="rounded-lg border border-border bg-surface-hover p-3 text-sm">
        {onPolygon ? (
          <p className="font-semibold text-emerald-700 dark:text-emerald-300">✓ Polygon に接続済み</p>
        ) : (
          <button
            className={buttonStyles.secondary}
            type="button"
            disabled={switching}
            onClick={() => switchChain({ chainId: polygon.id })}
          >
            Polygon に切り替える
          </button>
        )}
        {switchError && (
          <p className="mt-2 text-sm font-semibold text-rose-600 dark:text-rose-300" role="alert">
            切り替えできませんでした。もう一度お試しください。
          </p>
        )}
      </li>
      <li className="rounded-lg border border-border bg-surface-hover p-3 text-sm">
        {token ? <>
        <button
          className={buttonStyles.secondary}
          type="button"
          disabled={!onPolygon || watching}
          onClick={() =>
            watchAsset({
              type: "ERC20",
              options: {
                address: token.address,
                symbol: token.symbol,
                decimals: token.decimals,
                image: token.image,
              },
            })
          }
        >
          HENKAKU トークンをウォレットに追加
        </button>
        {watched && (
          <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            追加リクエストを送りました（表示されない場合も進行に影響はありません）
          </p>
        )}
        {watchError && (
          <p className="mt-2 text-sm font-semibold text-rose-600 dark:text-rose-300" role="alert">
            追加できませんでした。スキップしても構いません。
          </p>
        )}
        </> : <p>トークン表示の追加は準備中です。接続とサインインは進められます。</p>}
      </li>
    </ol>
  );
}
