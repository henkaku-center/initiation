// ABOUTME: チェックインページ。今日のチェックインと履歴を表示する。
// ABOUTME: 履歴取得はServer Componentで行い、実行操作だけClient Componentに委譲する。
import { PortalCommunity } from "@/components/portal/PortalCommunity";
import { MemberBoundary } from "@/components/portal/MemberBoundary";
import type { Checkin } from "@/lib/domain/types";
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";

export default async function CheckinPage() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
  let history: Checkin[];
  let address: string;
  try {
    const member = await requireMember();
    address = member.walletAddress;
    history = await getRepositories().checkins.listByMember(member.id);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return <PortalCommunity history={[]} today={today} signedIn={false} />;
    }
    throw error;
  }

  return <MemberBoundary address={address}><PortalCommunity history={history} today={today} /></MemberBoundary>;
}
