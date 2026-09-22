// ABOUTME: メンバーの表示名とDiscord名を保存するServer Action。/admin の申請一覧で申請者を識別するために使う。
// ABOUTME: Discord名は問いへの回答ではなく、承認後に運営が連絡するための参加の前提(Issue #117)。
"use server";

import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { normalizeDiscordUsername } from "@/lib/domain/discordUsername";
import { getRepositories } from "@/lib/repositories";

export async function saveDisplayName(
  displayName: string,
): Promise<{ ok: boolean; error?: string }> {
  const name = displayName.trim();
  if (name === "") {
    return { ok: false, error: "表示名を入力してください" };
  }

  try {
    const member = await requireMember();
    await getRepositories().members.updateDisplayName(member.id, name);
    return { ok: true };
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { ok: false, error: "サインインしてください" };
    }
    throw error;
  }
}

export async function saveDiscordUsername(
  discordUsername: string,
): Promise<{ ok: boolean; error?: string }> {
  // 実在確認はしない。アプリはDiscordを見ておらず、承認時に運営が突き合わせる。
  const name = normalizeDiscordUsername(discordUsername);
  if (name === null) {
    return { ok: false, error: "Discordのユーザー名を入力してください" };
  }

  try {
    const member = await requireMember();
    await getRepositories().members.updateDiscordUsername(member.id, name);
    return { ok: true };
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { ok: false, error: "サインインしてください" };
    }
    throw error;
  }
}
