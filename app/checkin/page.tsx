// ABOUTME: チェックインページ。今日のチェックインと履歴を表示する。
// ABOUTME: 履歴取得はServer Componentで行い、実行操作だけClient Componentに委譲する。
import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalCommunity } from "@/components/portal/PortalCommunity";
import { MemberBoundary } from "@/components/portal/MemberBoundary";
import type { Checkin } from "@/lib/domain/types";
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";
import { cardStyles } from "@/lib/ui";

export default async function CheckinPage() {
  if (process.env.HENKAKU_DEMO_ONLY === "1") redirect("/");
  let history: Checkin[];
  let address: string;
  try {
    const member = await requireMember();
    address = member.walletAddress;
    history = await getRepositories().checkins.listByMember(member.id);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return (
        <main className={cardStyles}>
          <p className="leading-7 text-muted">
            先に <Link href="/setup">ウォレットセットアップ</Link> でサインインしてください。
          </p>
        </main>
      );
    }
    throw error;
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
  return <MemberBoundary address={address}><PortalCommunity history={history} today={today} /></MemberBoundary>;
}
