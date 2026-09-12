// ABOUTME: Initiation画面。ステップ一覧・進捗・回答フォームを表示する。
// ABOUTME: 未認証者にはウォレットセットアップへの導線を出し、完走者には申請へ案内する。
import { redirect } from "next/navigation";
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";
import { journeySteps } from "@/lib/initiation/journey";
import { isJourneyComplete } from "@/lib/initiation/complete";
import type { ProgressEntry } from "@/lib/domain/types";
import { PortalJourney } from "@/components/portal/PortalJourney";
import { MemberBoundary } from "@/components/portal/MemberBoundary";

export default async function InitiationPage({ searchParams }: { searchParams?: Promise<{ edit?: string }> } = {}) {
  if (process.env.HENKAKU_DEMO_ONLY === "1") redirect("/");
  let entries: ProgressEntry[];
  let address: string;
  let displayName: string | null;
  try {
    const member = await requireMember();
    address = member.walletAddress;
    displayName = member.displayName;
    entries = await getRepositories().progress.listByMember(member.id);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return <PortalJourney steps={journeySteps} entries={[]} displayName={null} complete={false} signedIn={false} />;
    }
    throw error;
  }

  const complete = isJourneyComplete(entries);
  const review = (await searchParams)?.edit === "1";
  return <MemberBoundary address={address}><PortalJourney key={`${address}:${review}`} steps={journeySteps} entries={entries} displayName={displayName} complete={complete} review={review} /></MemberBoundary>;
}
