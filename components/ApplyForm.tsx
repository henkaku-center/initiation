// ABOUTME: 申請実行ボタンを提供する。
// ABOUTME: 承認・Allowlist追加・HENKAKU送付は運営が手作業で行うことを明記する。
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { submitApplication } from "@/app/apply/actions";
import { buttonStyles } from "@/lib/ui";

export function ApplyForm({ reapply = false }: { reapply?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const busy = useRef(false);

  function submit() {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitApplication();
        if (result.ok) {
          router.refresh();
        } else {
          setError(result.error ?? "申請できませんでした");
        }
      } catch {
        setError("申請結果を確認できませんでした。状態を再取得してからお試しください。");
      } finally {
        busy.current = false;
      }
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="leading-7 text-muted">
        申請すると運営メンバーが内容を確認し、Allowlist追加とHENKAKUの送付を手作業で行います。
      </p>
      <button className={`${buttonStyles.primary} mt-5`} type="button" disabled={pending} onClick={submit}>
        {pending ? "申請中…" : reapply ? "もう一度申請する" : "申請する"}
      </button>
      {error && <p className="mt-3 text-sm font-semibold text-rose-600 dark:text-rose-300" role="alert">{error}</p>}
      {error && <button className={`${buttonStyles.secondary} mt-3`} type="button" onClick={() => router.refresh()}>状態を再取得</button>}
    </section>
  );
}
