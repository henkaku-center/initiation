// ABOUTME: Initiation画面。ステップ一覧・進捗・回答フォームを表示する。
// ABOUTME: 未認証者にはウォレットセットアップへの導線を出し、完走者には申請へ案内する。
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";
import { initiationSteps } from "@/lib/initiation/content";
import { isInitiationComplete } from "@/lib/initiation/complete";
import type { ProgressEntry } from "@/lib/domain/types";
import { InitiationSteps } from "@/components/InitiationSteps";
import { buttonStyles } from "@/lib/ui";

export default async function InitiationPage() {
  if (process.env.HENKAKU_DEMO_ONLY === "1") redirect("/");
  let entries: ProgressEntry[];
  try {
    const member = await requireMember();
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
  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Step 2</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Initiation</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          一つずつ進めて、HENKAKUへの参加準備を整えましょう。回答と完了状態は自動で保存されます。
        </p>
      </header>
      <InitiationSteps steps={initiationSteps} entries={entries} />
      {complete && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="font-semibold text-emerald-900 dark:text-emerald-200">完走おめでとうございます！</p>
          <Link className={`${buttonStyles.primary} mt-4`} href="/apply">
            AllowlistとHENKAKUの申請へ →
          </Link>
        </section>
      )}
    </main>
  );
}
