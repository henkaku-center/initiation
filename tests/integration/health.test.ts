// ABOUTME: DBヘルスチェックの問い合わせをローカルSupabaseで検証する。
// ABOUTME: 実DBへ読み取りで到達でき、中断済みのシグナルでは失敗として扱われることを確認する。
import { describe, expect, it } from "vitest";
import { getRepositories } from "@/lib/repositories";

describe("health (local supabase)", () => {
  it("reaches the database with a read-only query", async () => {
    await expect(getRepositories().health.ping(new AbortController().signal)).resolves.toBeUndefined();
  });

  it("fails when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(getRepositories().health.ping(controller.signal)).rejects.toBeDefined();
  });
});
