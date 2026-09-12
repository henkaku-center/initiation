// ABOUTME: Initiation進捗のServer Actionsを提供する。
// ABOUTME: ステップ入力を検証して、認証済みmemberのRepositoryへ保存する。
"use server";

import { journeySteps, validateJourneyAnswer } from "@/lib/initiation/journey";
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";

export async function saveStep(
  stepId: string,
  answer: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const step = journeySteps.find((item) => item.id === stepId);
  if (!step) return { ok: false, error: "不明なステップです" };
  const validated = validateJourneyAnswer(stepId, answer);
  if (!validated) return { ok: false, error: "回答の形式を確認してください" };

  try {
    const member = await requireMember();
    await getRepositories().progress.save(member.id, stepId, JSON.stringify(validated));
    return { ok: true };
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { ok: false, error: "サインインしてください" };
    }
    throw error;
  }
}
