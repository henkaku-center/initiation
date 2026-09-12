// ABOUTME: Hide server-rendered member content as soon as the connected identity changes.
// ABOUTME: A subsequent authenticated server refresh supplies that member's own page data.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAccount } from "wagmi";
import { useSession } from "@/lib/useSession";
import { canDisplayMemberData } from "@/lib/domain/walletSession";

export function MemberBoundary({ address, children }: { address: string; children: ReactNode }) {
  const wallet = useAccount();
  const { data: session, isPending, isError, refetch } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session && session.address !== address && wallet.address?.toLowerCase() === session.address) router.refresh();
  }, [session, address, wallet.address, router]);
  if (canDisplayMemberData({ pageAddress: address, sessionAddress: session?.address ?? null, connectedAddress: wallet.address, connected: wallet.isConnected, sessionError: isError })) return children;
  return <section className="pd-panel" aria-live="polite">
    <p>{isPending || wallet.isReconnecting ? "サインインと接続状態を確認しています…" : isError ? "サインイン状態を取得できませんでした。" : "接続中のウォレットでサインインしてください。"}</p>
    <div className="portal-actions"><Link className="pd-primary" href="/setup">ウォレットセットアップへ</Link>{isError && <button className="pd-secondary" type="button" onClick={() => void refetch()}>再取得</button>}</div>
  </section>;
}
