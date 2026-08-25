// ABOUTME: SIWE サインイン。Polygon 以外へ切り替えたらサーバーセッションを破棄する。
// ABOUTME: 破棄したときは理由と次の操作を画面に残す(Issue #67)。署名拒否も画面エラーにする。
"use client";

import { useEffect, useState } from "react";
import { SiweMessage } from "siwe";
import { useAccount, useSignMessage } from "wagmi";
import { polygon } from "wagmi/chains";
import { shouldDiscardSessionForChain, signInBlockedByChain } from "@/lib/domain/walletSession";
import { buttonStyles } from "@/lib/ui";
import { useRefreshSession, useSession, useSignOut } from "@/lib/useSession";

export function SignInWithEthereum() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  // 表示の根拠はサーバーのセッション。Reactの状態だけで持つと、再読み込みで
  // サインイン済みが消え、期限切れ後も「サインイン済み」と出てしまう(Issue #40)。
  const { data: session, isPending } = useSession();
  const refreshSession = useRefreshSession();
  const signOut = useSignOut();
  const [error, setError] = useState<string | null>(null);

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
    void signOut();
  }, [signedInAs, address, chainId, signOut]);

  async function signIn() {
    setError(null);
    try {
      const nonceResponse = await fetch("/api/auth/nonce");
      if (!nonceResponse.ok) throw new Error("nonce の発行に失敗しました");
      const { nonce } = (await nonceResponse.json()) as { nonce: string };

      const message = new SiweMessage({
        domain: window.location.host,
        address: address!,
        statement: "Sign in to HENKAKU Initiation",
        uri: window.location.origin,
        version: "1",
        chainId: polygon.id,
        nonce,
        expirationTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }).prepareMessage();
      const signature = await signMessageAsync({ message });
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });
      if (!response.ok) throw new Error("サーバー検証に失敗しました");
      await refreshSession();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "署名がキャンセルされました");
    }
  }

  if (!address) {
    return <p className="text-sm leading-6 text-muted">先にウォレットを接続してください。</p>;
  }
  if (isPending) {
    return <p className="text-sm leading-6 text-muted">サインイン状態を確認しています…</p>;
  }
  if (connectedMatchesSession) {
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
          「03 PolygonとHENKAKU」でPolygonに切り替えてから、署名してください。
        </p>
      )}
      <button className={buttonStyles.primary} type="button" onClick={signIn}>
        署名してサインイン
      </button>
      {error && (
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
