// ABOUTME: チェックイン実行ボタン。同日2回目は「チェックイン済み」を表示する。
// ABOUTME: Server Action完了後に履歴を再取得して、画面に結果を反映する。
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { checkin } from "@/app/checkin/actions";
import { buttonStyles } from "@/lib/ui";

export function CheckinButton({ checked = false }: { checked?: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const busy = useRef(false);
  const [failed, setFailed] = useState(false);

  function submit() {
    if (busy.current || checked) return;
    busy.current = true;
    setMessage(null);
    setFailed(false);
    startTransition(async () => {
      try {
        const result = await checkin();
        if (!result.ok) {
          setFailed(true);
          setMessage(result.error ?? "チェックインに失敗しました");
        } else {
          setMessage(result.alreadyCheckedIn ? "今日はチェックイン済みです" : "チェックインしました！");
          router.refresh();
        }
      } catch {
        setFailed(true);
        setMessage("チェックイン結果を確認できませんでした。状態を再取得してからお試しください。");
      } finally {
        busy.current = false;
      }
    });
  }

  return (
    <div className="portal-checkin-action">
      <button className={`pd-checkin-button${checked ? " is-checked" : ""}`} type="button" disabled={pending || checked} onClick={submit} aria-label={pending ? "チェックイン中…" : checked ? "今日はチェックイン済みです" : "今日のチェックイン"}>
        <span aria-hidden="true">{checked ? "✓" : "+"}</span>{pending ? "CHECKING IN…" : checked ? "CHECKED IN" : "CHECK IN"}
      </button>
      {message && <p className="mt-3 text-sm font-semibold text-foreground" role={failed ? "alert" : "status"}>{message}</p>}
      {failed && <button className={`${buttonStyles.secondary} mt-3`} type="button" onClick={() => router.refresh()}>状態を再取得</button>}
    </div>
  );
}
