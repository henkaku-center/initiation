// ABOUTME: サーバーのセッションを画面から参照するためのクライアント側フック。
// ABOUTME: 画面の表示を React の状態ではなくサーバーの認識に合わせる(Issue #40)。
"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { Address } from "@/lib/domain/types";

export type SessionStatus = { address: Address; isAdmin: boolean } | null;

/** 同じキーを共有することで、ヘッダーと /setup が同じ結果を1回の取得で使う。 */
export const sessionQueryKey = ["session"] as const;

async function fetchSession({ signal }: { signal: AbortSignal }): Promise<SessionStatus> {
  const response = await fetch("/api/auth/me", { signal, cache: "no-store" });
  // 未サインインは異常ではないので、エラーではなく null として扱う。
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("セッションの取得に失敗しました");
  return (await response.json()) as SessionStatus;
}

export function useSession() {
  return useQuery({ queryKey: sessionQueryKey, queryFn: fetchSession });
}

/**
 * サインイン・サインアウトの直後に、画面の表示をサーバーへ合わせ直す。
 * useEffect の依存に入れられるよう、関数の同一性を保つ。
 */
export function useRefreshSession(): () => Promise<SessionStatus> {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    await queryClient.cancelQueries({ queryKey: sessionQueryKey });
    const session = await queryClient.fetchQuery({ queryKey: sessionQueryKey, queryFn: fetchSession, staleTime: 0 });
    router.refresh();
    return session;
  }, [queryClient, router]);
}

/**
 * サーバーのセッションを破棄して、画面の表示を合わせ直す。
 * 明示的なサインアウトと、ウォレットのずれを検知したときの両方から使う(Issue #44)。
 *
 * 古い取得結果とページ内の入力を先に無効にする。破棄の通信失敗は呼び出し元へ返す。
 */
export function useSignOut(): () => Promise<void> {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    await queryClient.cancelQueries({ queryKey: sessionQueryKey });
    queryClient.setQueryData(sessionQueryKey, null);
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error("サインアウトできませんでした。もう一度お試しください。");
    router.refresh();
  }, [queryClient, router]);
}
