// ABOUTME: Initiation画面。ステップ一覧・進捗・回答フォームを表示する。
// ABOUTME: 未認証者にはウォレットセットアップへの導線を出し、完走者には申請へ案内する。
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";
import { initiationSteps } from "@/lib/initiation/content";
import { isInitiationComplete } from "@/lib/initiation/complete";
import type { ProgressEntry } from "@/lib/domain/types";
import { PortalJourney } from "@/components/portal/PortalJourney";
import { MemberBoundary } from "@/components/portal/MemberBoundary";

export default async function InitiationPage() {
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
      return (
        <main className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="leading-7 text-muted">
            先に <Link href="/setup">ウォレットセットアップ</Link> でサインインしてください。
          </p>
        </main>
      );
    }
    throw error;
  }

  const complete = isInitiationComplete(entries);
  return <MemberBoundary address={address}><PortalJourney key={address} steps={initiationSteps} entries={entries} displayName={displayName} complete={complete} /></MemberBoundary>;
}
