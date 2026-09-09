// ABOUTME: チェックインページ。今日のチェックインと履歴を表示する。
// ABOUTME: 履歴取得はServer Componentで行い、実行操作だけClient Componentに委譲する。
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckinButton } from "@/components/CheckinButton";
import type { Checkin } from "@/lib/domain/types";
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";
import { cardStyles } from "@/lib/ui";

export default async function CheckinPage() {
  if (process.env.HENKAKU_DEMO_ONLY === "1") redirect("/");
  let history: Checkin[];
  try {
    const member = await requireMember();
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

  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Step 3</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">チェックイン</h1>
        <p className="mt-3 leading-7 text-muted">今日の活動を記録して、コミュニティとの接点を残しましょう。</p>
      </header>
      <CheckinButton />
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-bold text-foreground">これまでのチェックイン</h2>
        {history.length > 0 ? (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {history.map((checkin) => (
              <li className="rounded-lg bg-surface-hover px-4 py-3 text-sm font-semibold text-foreground" key={checkin.id}>
                {checkin.checkinDate}
              </li>
          ))}
          </ul>
        ) : (
          <p className="mt-3 text-muted">まだ履歴はありません。</p>
        )}
      </section>
    </main>
  );
}
