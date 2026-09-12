// ABOUTME: 申請ページ。現在の申請状態を表示し、未申請なら申請フォームを出す。
// ABOUTME: 申請後のAllowlist追加とHENKAKU送付は運営が手作業で行う。
import { latestReasonsByApplication } from "@/lib/domain/applicationEvents";
import type { Application } from "@/lib/domain/types";
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";
import { PortalPassport } from "@/components/portal/PortalPassport";
import { MemberBoundary } from "@/components/portal/MemberBoundary";
import { isInitiationComplete } from "@/lib/initiation/complete";

export default async function ApplyPage() {
  let application: Application | null;
  let address: string;
  let complete: boolean;
  let displayName: string | null;
  let reviewReason: string | null = null;
  try {
    const member = await requireMember();
    const repositories = getRepositories();
    address = member.walletAddress;
    displayName = member.displayName;
    complete = isInitiationComplete(await repositories.progress.listByMember(member.id));
    // 却下済みも取得する。除外すると申請フォームが再表示されるだけで、
    // 見送りになったことも理由も申請者へ伝わらない(Issue #19)。
    application = await repositories.applications.findLatestByMember(member.id);
    if (application) {
      const events = await repositories.applications.listEvents([application.id]);
      reviewReason = latestReasonsByApplication(events).get(application.id)?.review?.reason ?? null;
    }
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return <PortalPassport application={null} complete={false} reviewReason={null} signedIn={false} />;
    }
    throw error;
  }

  return <MemberBoundary address={address}><PortalPassport application={application} complete={complete} reviewReason={reviewReason} displayName={displayName} /></MemberBoundary>;
}
