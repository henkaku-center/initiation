// ABOUTME: SIWE サインイン。Polygon 以外へ切り替えたらサーバーセッションを破棄する。
// ABOUTME: 破棄したときは理由と次の操作を画面に残す(Issue #67)。署名拒否も画面エラーにする。
"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConfig, useSignMessage } from "wagmi";
import { getConnection } from "wagmi/actions";
import { polygon } from "wagmi/chains";
import { shouldDiscardSessionForChain, signInBlockedByChain } from "@/lib/domain/walletSession";
import { buttonStyles } from "@/lib/ui";
import { useRefreshSession, useSession, useSignOut } from "@/lib/useSession";
import { signInWithWallet, type SignInPhase } from "@/lib/auth/signInWithWallet";

export function SignInWithEthereum() {
  const { address, chainId } = useAccount();
  const config = useConfig();
  const { signMessageAsync } = useSignMessage();
  // 表示の根拠はサーバーのセッション。Reactの状態だけで持つと、再読み込みで
  // サインイン済みが消え、期限切れ後も「サインイン済み」と出てしまう(Issue #40)。
  const { data: session, isPending, isError, refetch } = useSession();
  const refreshSession = useRefreshSession();
  const signOut = useSignOut();
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SignInPhase | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // セッションのアドレスは正規化済みの小文字、wagmi 側はチェックサム表記なので、
  // そのまま比較すると常に不一致になる。
  const signedInAs = session?.address ?? null;
  const connectedMatchesSession =
    signedInAs !== null && address?.toLowerCase() === signedInAs;

  // ここで見るのはチェーンのずれだけ。アカウントのずれはヘッダーの
  // SessionStatus が全ページで見ている(Issue #44)。両方で見ると、
  // /setup を開いている間だけ logout が二重に飛ぶ。
  useEffect(() => {
    if (
      !shouldDiscardSessionForChain({
        signedInAs,
        connectedAddress: address,
        connectedChainId: chainId,
        requiredChainId: polygon.id,
      })
    ) {
      return;
    }
    void signOut().catch(() => setError("サインアウトできませんでした。もう一度お試しください。"));
  }, [signedInAs, address, chainId, signOut]);

  async function signIn() {
    if (busy.current || !address || chainId !== polygon.id || isError) return;
    busy.current = true;
    setError(null);
    try {
      await signInWithWallet({
        address, origin: window.location.origin, signMessage: signMessageAsync,
        isCurrent: () => {
          const current = getConnection(config);
          return mounted.current && current.isConnected && current.address?.toLowerCase() === address.toLowerCase() && current.chainId === polygon.id;
        },
        refreshSession, signOut, onPhase: setPhase,
      });
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "認証の通信に失敗しました。もう一度お試しください。");
    } finally {
      busy.current = false;
      if (mounted.current) setPhase(null);
    }
  }

  if (!address) {
    return <p className="text-sm leading-6 text-muted">先にウォレットを接続してください。</p>;
  }
  if (isPending) {
    return <p className="text-sm leading-6 text-muted">サインイン状態を確認しています…</p>;
  }
  if (isError) return <div role="alert"><p>サインイン状態を取得できませんでした。</p><button type="button" className={buttonStyles.secondary} onClick={() => void refetch()}>再取得</button></div>;
  if (connectedMatchesSession && chainId === polygon.id) {
    return (
      <p className="break-all rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
        サインイン済み: {address}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* 署名しても直後にセッションが破棄される状態を、黙って通さずに説明する
          (Issue #67)。Polygon へ切り替えれば消える。 */}
      {signInBlockedByChain({ connectedChainId: chainId, requiredChainId: polygon.id }) && (
        <p
          className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 font-semibold text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
          role="alert"
        >
          Polygon以外のネットワークにつながっています。このまま署名してもサインインは完了しません。
          Polygonに切り替えてから、署名してください。
        </p>
      )}
      {chainId === undefined && <p role="status">ネットワークを確認しています…</p>}
      <button className={buttonStyles.primary} type="button" disabled={phase !== null || chainId !== polygon.id} onClick={signIn}>
        {phase === "nonce" ? "認証を準備しています…" : phase === "signing" ? "ウォレットでの署名を待っています…" : phase === "verifying" ? "署名を検証しています…" : "署名してサインイン"}
      </button>
      {error && (
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
