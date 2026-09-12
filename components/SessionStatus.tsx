// ABOUTME: ヘッダーに出すサインイン状態・サインアウト・運営導線。
// ABOUTME: 表示はサーバーのセッションから決め、権限のない導線を出さない(Issue #40)。
"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { shortenAddress } from "@/lib/domain/address";
import { adminNavigation } from "@/lib/navigation";
import { buttonStyles } from "@/lib/ui";
import { useSession, useSignOut } from "@/lib/useSession";
import { useSignOutOnAccountChange } from "@/lib/useWalletSessionGuard";

export function SessionStatus() {
  const { data: session, isPending, isError, refetch } = useSession();
  const wallet = useAccount();
  const discardSession = useSignOut();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ウォレットのずれの検知をここへ置くのは、このコンポーネントだけが
  // ルートレイアウト経由で全ページに乗るため(Issue #44)。表示を出さない状態
  // (取得中・未サインイン)でも検知は動かす必要があるので、早期returnより前に呼ぶ。
  const guard = useSignOutOnAccountChange(session?.address ?? null);

  // セッションを確かめる前は何も出さない。未サインインの表示を一瞬見せてから
  // 差し替えると、サインイン済みの人には状態が揺れて見えるため。
  if (guard.error) return <li role="alert">{guard.error} <button type="button" onClick={() => void guard.retry()}>再試行</button></li>;
  if (error) return <li role="alert">{error} <button type="button" disabled={signingOut} onClick={signOut}>再試行</button></li>;
  if (isError) return <li role="alert">サインイン状態を取得できませんでした。 <button type="button" onClick={() => void refetch()}>再取得</button></li>;
  if (isPending || !session || !wallet.isConnected || wallet.address?.toLowerCase() !== session.address) return null;

  async function signOut() {
    setSigningOut(true);
    setError(null);
    try {
      await discardSession();
    } catch {
      setError("サインアウトできませんでした。もう一度お試しください。");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      {session.isAdmin &&
        adminNavigation.map((item) => (
          <li key={item.href}>
            <Link
              className="inline-flex min-h-9 items-center rounded-lg border border-border px-2.5 py-2 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              href={item.href}
            >
              {item.label}
            </Link>
          </li>
        ))}
      <li>
        <span
          className="inline-flex min-h-9 items-center rounded-lg px-2.5 py-2 font-mono text-xs text-muted"
          title={session.address}
        >
          {shortenAddress(session.address)}
        </span>
      </li>
      <li>
        <button className={buttonStyles.quiet} type="button" disabled={signingOut} onClick={signOut}>
          {signingOut ? "サインアウト中…" : "サインアウト"}
        </button>
      </li>
    </>
  );
}
