// ABOUTME: 本番DBへ読み取り専用の軽量な問い合わせを行い、到達可能なら204、不可なら503を返す。
// ABOUTME: 本文は空でキャッシュしない。同時リクエストは1回の問い合わせを共有してDB負荷を抑える。
import { getRepositories } from "@/lib/repositories";

// 毎回DBへ問い合わせるため、ルートのキャッシュを使わない。
export const dynamic = "force-dynamic";

export const DB_HEALTH_TIMEOUT_MS = 5_000;

const HEADERS = { "Cache-Control": "no-store" };

// 実行中の問い合わせ。同じインスタンスへ同時に届いたリクエストはこれを待ち、
// 往復を重ねない。完了したら破棄するので、次のリクエストは新しく問い合わせる。
let inFlight: Promise<boolean> | null = null;

async function checkDatabase(): Promise<boolean> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("database health check timed out"));
    }, DB_HEALTH_TIMEOUT_MS);
  });
  try {
    // クライアントが中断に応じない場合も、タイムアウトで応答を返す。
    await Promise.race([getRepositories().health.ping(controller.signal), timeout]);
    return true;
  } catch (error) {
    // 応答には含めず、サーバーログに種類だけを残す。
    console.error("db health check failed:", error instanceof Error ? error.name : "unknown");
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  inFlight ??= checkDatabase().finally(() => {
    inFlight = null;
  });
  const healthy = await inFlight;
  return new Response(null, { status: healthy ? 204 : 503, headers: HEADERS });
}
