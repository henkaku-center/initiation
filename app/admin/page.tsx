// ABOUTME: 管理者用の申請一覧を表示する。
// ABOUTME: requireAdminで保護し、一般メンバーや未認証者には404相当を返す。
import { AdminApplicationRow } from "@/components/AdminApplicationRow";
import { MemberBoundary } from "@/components/portal/MemberBoundary";
import { ForbiddenError, requireAdmin, UnauthenticatedError } from "@/lib/auth/guards";
import {
  eventsByApplication,
  latestReasonsByApplication,
  latestTxIdsByApplication,
} from "@/lib/domain/applicationEvents";
import { getRepositories } from "@/lib/repositories";
import { notFound, redirect } from "next/navigation";

export default async function AdminPage() {
  if (process.env.HENKAKU_DEMO_ONLY === "1") redirect("/");
  let address: string;
  try {
    ({ address } = await requireAdmin());
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof UnauthenticatedError) {
      notFound();
    }
    throw error;
  }

  const repositories = getRepositories();
  const applications = await repositories.applications.listAll();
  // 一覧の全申請分をまとめて1回で取得する(申請ごとに問い合わせない)。
  const events = await repositories.applications.listEvents(applications.map((item) => item.id));
  const reasons = latestReasonsByApplication(events);
  const txIds = latestTxIdsByApplication(events);
  const history = eventsByApplication(events);

  return (
    <MemberBoundary address={address}>
    <main className="space-y-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">運営</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">申請一覧</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          Allowlist と HENKAKU 配布の状態を確認し、運営操作を行います。
        </p>
      </header>
      {applications.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 leading-7 text-muted shadow-sm">
          申請はまだありません。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="min-w-[56rem] w-full border-collapse text-left text-sm">
            <caption className="px-4 py-4 text-left text-sm font-semibold text-muted">
              Allowlist と HENKAKU 配布の申請
            </caption>
            <thead className="border-y border-border bg-surface-hover text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold" scope="col">
                  アドレス
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  審査
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Allowlist
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  配布
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {applications.map((application) => (
                <AdminApplicationRow
                  key={application.id}
                  application={application}
                  reasons={reasons.get(application.id)}
                  txIds={txIds.get(application.id)}
                  events={history.get(application.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
    </MemberBoundary>
  );
}
