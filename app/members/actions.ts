// ABOUTME: メンバーの表示名を保存するServer Action。/admin の申請一覧で申請者を識別するために使う。
// ABOUTME: 保存経路のみ。どの画面から呼ぶか(Initiation冒頭 / /setup / /apply)は Issue #72 の判断待ち。
"use server";

import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
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
