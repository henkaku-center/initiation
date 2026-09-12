import Link from "next/link";
import { buttonStyles, cardStyles } from "@/lib/ui";
import { PortalDemo } from "@/components/demo/PortalDemo";

export default function Home() {
  if (process.env.HENKAKU_DEMO_ONLY === "1") return <PortalDemo />;
  return (
    <main className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-border bg-card px-6 py-12 shadow-sm sm:px-10 sm:py-16">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">HENKAKU Community</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight text-foreground sm:text-5xl">
          HENKAKU Initiation
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
          ウォレットを準備して、コミュニティへの参加を一歩ずつ始めましょう。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className={buttonStyles.primary} href="/setup">
            ウォレットセットアップへ →
          </Link>
          <Link className={buttonStyles.secondary} href="/initiation">
            参加の流れを見る
          </Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["1", "準備", "ウォレットを接続してサインイン"],
          ["2", "参加", "質問とクエストでInitiation"],
          ["3", "継続", "チェックインして活動を記録"],
        ].map(([step, title, description]) => (
          <div className={cardStyles} key={step}>
            <span className="grid size-8 place-items-center rounded-full bg-brand text-sm font-bold text-white">
              {step}
            </span>
            <h2 className="mt-4 text-lg font-bold text-foreground">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
