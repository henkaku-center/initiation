// ABOUTME: チェックイン実行ボタンと、その日のSignal(一言)の入力欄。
// ABOUTME: 「書いてから押す」「押してから書く」の両方を同じ欄で受ける(Issue #119)。
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { checkin } from "@/app/checkin/actions";
import { CHECKIN_NOTE_MAX_LENGTH } from "@/lib/domain/checkinNote";
import { buttonStyles } from "@/lib/ui";

export function CheckinButton({ checked = false, note = null }: { checked?: boolean; note?: string | null }) {
  const [text, setText] = useState(note ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const busy = useRef(false);
  const [failed, setFailed] = useState(false);

  function submit(source: "checkin" | "note") {
    if (busy.current) return;
    busy.current = true;
    setMessage(null);
    setFailed(false);
    startTransition(async () => {
      try {
        // 押すだけの操作では一言を送らない。送ると「一言の保存」として数えられ、
        // 空欄のときは書いてある一言を消してしまう(#46 / Issue #119)。
        const result = source === "note" ? await checkin(text) : await checkin();
        if (!result.ok) {
          setFailed(true);
          setMessage(result.error ?? "チェックインに失敗しました");
        } else {
          setMessage(!result.alreadyCheckedIn ? "チェックインしました！"
            : source === "note" ? "一言を保存しました" : "今日はチェックイン済みです");
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
      <button className={`pd-checkin-button${checked ? " is-checked" : ""}`} type="button" disabled={pending || checked} onClick={() => submit("checkin")} aria-label={pending ? "チェックイン中…" : checked ? "今日はチェックイン済みです" : "今日のチェックイン"}>
        <span aria-hidden="true">{checked ? "✓" : "+"}</span>{pending ? "CHECKING IN…" : checked ? "CHECKED IN" : "CHECK IN"}
      </button>
      <form className="portal-checkin-note" onSubmit={(event) => { event.preventDefault(); submit("note"); }}>
        <label className="pd-mono" htmlFor="portal-checkin-note">今日のSIGNAL（任意）</label>
        <textarea className="portal-field" id="portal-checkin-note" name="note" value={text} rows={2}
          maxLength={CHECKIN_NOTE_MAX_LENGTH} disabled={pending} placeholder="いま、何が動いている？"
          onChange={(event) => setText(event.target.value)} />
        {/* 入力欄で打ち切られる前に、残りが見えるようにする(#46)。 */}
        <small className="pd-fineprint">{text.length} / {CHECKIN_NOTE_MAX_LENGTH}</small>
        <button className={buttonStyles.secondary} type="submit" disabled={pending}>
          {checked ? "一言を保存" : "一言を添えてチェックイン"}
        </button>
      </form>
      {message && <p className="mt-3 text-sm font-semibold text-foreground" role={failed ? "alert" : "status"}>{message}</p>}
      {failed && <button className={`${buttonStyles.secondary} mt-3`} type="button" onClick={() => router.refresh()}>状態を再取得</button>}
    </div>
  );
}
