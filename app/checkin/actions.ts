// ABOUTME: チェックインのServer Actionを提供する。
// ABOUTME: 1日1回(JST)の制約はRepositoryとDBの一意制約に委譲し、一言は同じ日の行へ上書きする。
"use server";

import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { consumeRateLimit, RateLimitedError } from "@/lib/auth/rateLimit";
import { readCheckinNote } from "@/lib/domain/checkinNote";
import { rateLimitMessage, rateLimitRules } from "@/lib/domain/rateLimits";
import { getRepositories } from "@/lib/repositories";

/**
 * 一言(`note`)を省くと、その日の一言は触らない。「押すだけ」の呼び出しが
 * 既に書いた一言を消さないようにするため、未指定と空文字を分けている。
 * 空文字は「一言なし」として保存し、書いたものを消す操作になる(Issue #119)。
 */
export async function checkin(note?: string): Promise<{ ok: boolean; alreadyCheckedIn?: boolean; error?: string }> {
  const parsed = note === undefined ? null : readCheckinNote(note);
  if (parsed && !parsed.ok) return { ok: false, error: parsed.error };

  try {
    const member = await requireMember();
    // 1日1回はDBの一意制約が担保しているが、2回目以降の呼び出し自体は
    // 無制限に通っていた。ここで数えるのはその繰り返しのほう。
    // 一言の書き換えも同じ枠で数える。止めたいのは繰り返しの書き込みで、
    // 押す操作と書く操作を分けても、止めたい相手は変わらない。
    await consumeRateLimit(rateLimitRules.checkin, member.walletAddress);

    const repositories = getRepositories();
    const result = await repositories.checkins.checkinToday(member.id);
    // checkinToday は必ずその日の行を返すので、更新先は日付を計算せずに決まる。
    if (parsed) await repositories.checkins.updateNote(member.id, result.checkin.id, parsed.note);
    return { ok: true, alreadyCheckedIn: !result.created };
  } catch (error) {
    if (error instanceof RateLimitedError) {
      return { ok: false, error: rateLimitMessage(error.rule) };
    }
    if (error instanceof UnauthenticatedError) {
      return { ok: false, error: "サインインしてください" };
    }
    throw error;
  }
}
