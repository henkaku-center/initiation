// ABOUTME: Allowlist追加とHENKAKU配布申請のServer Actionを提供する。
// ABOUTME: Initiation完走を確認し、重複申請は利用者向けの結果へ変換する。
"use server";

import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { consumeRateLimit, RateLimitedError } from "@/lib/auth/rateLimit";
import { rateLimitMessage, rateLimitRules } from "@/lib/domain/rateLimits";
import { isInitiationComplete } from "@/lib/initiation/complete";
import { DuplicateApplicationError, getRepositories } from "@/lib/repositories";

export async function submitApplication(): Promise<{ ok: boolean; error?: string }> {
  try {
    const member = await requireMember();
    // 完走判定より前に数える。止めたいのは、完走していない状態や重複で
    // 弾かれ続ける呼び出しのほうなので、成功した回数だけ数えても効かない。
    await consumeRateLimit(rateLimitRules.applicationSubmit, member.walletAddress);

    const repositories = getRepositories();
    const entries = await repositories.progress.listByMember(member.id);
    if (!isInitiationComplete(entries)) {
      return { ok: false, error: "先に Initiation を完走してください" };
    }
    // 承認後の連絡先がないまま申請を受けると、運営はウォレットアドレスしか
    // 持たないまま審査することになる(Issue #117)。完走条件ではなく申請の条件。
    if (!member.discordUsername) {
      return { ok: false, error: "Discordのユーザー名を登録してください" };
    }

    await repositories.applications.create(member.id);
    return { ok: true };
  } catch (error) {
    if (error instanceof DuplicateApplicationError) {
      return { ok: false, error: "すでに申請済みです。審査をお待ちください" };
    }
    if (error instanceof RateLimitedError) {
      return { ok: false, error: rateLimitMessage(error.rule) };
    }
    if (error instanceof UnauthenticatedError) {
      return { ok: false, error: "サインインしてください" };
    }
    throw error;
  }
}
