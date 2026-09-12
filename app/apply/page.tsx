// ABOUTME: 申請ページ。現在の申請状態を表示し、未申請なら申請フォームを出す。
// ABOUTME: 申請後のAllowlist追加とHENKAKU送付は運営が手作業で行う。
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplyForm } from "@/components/ApplyForm";
import { allowlistLabel, distributionLabel, reviewLabel } from "@/lib/applicationLabels";
import { latestReasonsByApplication } from "@/lib/domain/applicationEvents";
import type { Application } from "@/lib/domain/types";
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";
import { cardStyles } from "@/lib/ui";

export default async function ApplyPage() {
  if (process.env.HENKAKU_DEMO_ONLY === "1") redirect("/");
  let application: Application | null;
  let reviewReason: string | null = null;
  try {
    const member = await requireMember();
    const repositories = getRepositories();
    // 却下済みも取得する。除外すると申請フォームが再表示されるだけで、
    // 見送りになったことも理由も申請者へ伝わらない(Issue #19)。
    application = await repositories.applications.findLatestByMember(member.id);
    if (application) {
      const events = await repositories.applications.listEvents([application.id]);
      reviewReason = latestReasonsByApplication(events).get(application.id)?.review?.reason ?? null;
    }
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

  const isRejected = application?.reviewStatus === "rejected";

  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Step 4</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Allowlist と HENKAKU の申請
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          Initiation完走後、運営が内容を確認してAllowlist追加とHENKAKU送付を手動で行います。
        </p>
      </header>
      {application && (
        <section className={cardStyles}>
          <h2 className="text-xl font-bold text-foreground">申請の状態</h2>
          <dl className="mt-5 divide-y divide-border">
            <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <dt className="text-sm font-semibold text-muted">審査</dt>
              <dd className="font-semibold text-foreground">{reviewLabel[application.reviewStatus]}</dd>
            </div>
            {/* 却下・要追加情報は理由が判断の中身そのものなので、状態と並べて示す。 */}
            {reviewReason && application.reviewStatus !== "approved" && (
              <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                <dt className="text-sm font-semibold text-muted">理由</dt>
                <dd className="leading-7 text-foreground">{reviewReason}</dd>
              </div>
            )}
            {isRejected ? null : (
              <>
                <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                  <dt className="text-sm font-semibold text-muted">Allowlist</dt>
                  <dd className="font-semibold text-foreground">{allowlistLabel(application.allowlistStatus)}</dd>
                </div>
                <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                  <dt className="text-sm font-semibold text-muted">HENKAKU 配布</dt>
                  <dd className="font-semibold text-foreground">
                    {distributionLabel(application.distributionStatus, application.distributionTxId)}
                  </dd>
                </div>
              </>
            )}
          </dl>
          {isRejected && (
            <p className="mt-5 leading-7 text-muted">内容を見直して、もう一度申請できます。</p>
          )}
        </section>
      )}
      {(!application || isRejected) && <ApplyForm reapply={isRejected} />}
    </main>
  );
}
