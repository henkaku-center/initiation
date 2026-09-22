// ABOUTME: 申請の前提となるDiscord名を受け取る。問いへの回答ではないので、旅の質問とは別に置く。
// ABOUTME: アプリはDiscordを確認せず、承認時に運営が突き合わせる(Issue #117)。
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { saveDiscordUsername } from "@/app/members/actions";
import { DISCORD_USERNAME_MAX_LENGTH } from "@/lib/domain/discordUsername";

export function DiscordUsernameForm({ discordUsername }: { discordUsername: string | null }) {
  const [name, setName] = useState(discordUsername ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const router = useRouter();

  function save() {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await saveDiscordUsername(name);
        if (!result.ok) { setError(result.error ?? "Discordのユーザー名を保存できませんでした。"); return; }
        setSaved(true);
        router.refresh();
      } catch {
        setError("保存結果を確認できませんでした。入力を残したまま再試行できます。");
      } finally {
        busy.current = false;
      }
    });
  }

  return <form className="portal-discord" onSubmit={(event) => { event.preventDefault(); save(); }}>
    <label className="pd-mono" htmlFor="portal-discord-username">DISCORD / 連絡先</label>
    <input className="portal-field" id="portal-discord-username" name="discordUsername" value={name} autoComplete="off" disabled={pending}
      maxLength={DISCORD_USERNAME_MAX_LENGTH} placeholder="Discordのユーザー名"
      onChange={(event) => { setName(event.target.value); setSaved(false); }} />
    <p className="portal-muted">承認のあと、運営がDiscordで連絡します。質問への回答ではありません。アプリはDiscordを確認しないので、運営が見つけられる表記で書いてください。</p>
    <p className="portal-muted">入力したDiscord名は、申請の審査を担当する運営メンバーが申請一覧で見ます。他のメンバーには表示しません。</p>
    <button className="pd-primary pd-full" type="submit" disabled={pending}>
      {pending ? "保存中…" : discordUsername ? "Discord名を更新する" : "Discord名を登録する"}
    </button>
    {saved && <p className="portal-muted" role="status">保存しました。</p>}
    {error && <p className="portal-error" role="alert">{error}</p>}
  </form>;
}
