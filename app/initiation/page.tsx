// ABOUTME: Initiation画面。ステップ一覧・進捗・回答フォームを表示する。
// ABOUTME: 未認証者にはウォレットセットアップへの導線を出し、完走者には申請へ案内する。
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";
import { journeySteps } from "@/lib/initiation/journey";
import { isJourneyComplete } from "@/lib/initiation/complete";
import type { ProgressEntry } from "@/lib/domain/types";
import { fieldWindowStart, type CommunityField } from "@/lib/domain/communityField";
import { PortalJourney } from "@/components/portal/PortalJourney";
import { MemberBoundary } from "@/components/portal/MemberBoundary";

export default async function InitiationPage({ searchParams }: { searchParams?: Promise<{ edit?: string }> } = {}) {
  let entries: ProgressEntry[];
  let address: string;
  let displayName: string | null;
  let field: CommunityField | null;
  try {
    const member = await requireMember();
    address = member.walletAddress;
    displayName = member.displayName;
    const repositories = getRepositories();
    // 入口の集計は添えもの。取得できなくても、Initiation自体は開けるようにする(Issue #132)。
    [entries, field] = await Promise.all([
      repositories.progress.listByMember(member.id),
      repositories.communityField.summary(fieldWindowStart(new Date())).catch((error: unknown) => {
        console.error("community field summary failed:", error instanceof Error ? error.name : "unknown");
        return null;
      }),
    ]);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return <PortalJourney steps={journeySteps} entries={[]} displayName={null} complete={false} signedIn={false} />;
    }
    throw error;
  }

  const complete = isJourneyComplete(entries);
  const review = (await searchParams)?.edit === "1";
  return <MemberBoundary address={address}><PortalJourney key={`${address}:${review}`} steps={journeySteps} entries={entries} displayName={displayName} complete={complete} review={review} field={field} /></MemberBoundary>;
}
