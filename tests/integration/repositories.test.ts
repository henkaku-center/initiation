// ABOUTME: Supabase Repositoryの主要な永続化境界を検証する。
// ABOUTME: 重複申請、監査イベント、日次チェックインをローカルDBで確認する。
import { beforeEach, describe, expect, it } from "vitest";
import { normalizeAddress } from "@/lib/domain/address";
import {
  ConcurrentTransitionError,
  DuplicateApplicationError,
  getRepositories,
} from "@/lib/repositories";
import { testClient, truncateAll } from "@/tests/support/repositories";

const ADDR = normalizeAddress("0x1111111111111111111111111111111111111111");
const ADMIN = normalizeAddress("0x2222222222222222222222222222222222222222");

describe("repositories (local supabase)", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("upserts a member idempotently by address", async () => {
    const { members } = getRepositories();
    const first = await members.upsertByAddress(ADDR);
    const second = await members.upsertByAddress(ADDR);
    expect(second.id).toBe(first.id);
    expect(second.walletAddress).toBe(ADDR);
  });

  it("stores and overwrites a member display name", async () => {
    // 保存経路がないまま /admin の表示だけがあった状態を、テストで固定する(Issue #72)。
    const { members } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    expect(m.displayName).toBeNull();
    await members.updateDisplayName(m.id, "さくら");
    await members.updateDisplayName(m.id, "さくら(改名)");
    const found = await members.findByAddress(ADDR);
    expect(found?.displayName).toBe("さくら(改名)");
  });

  it("keeps the display name when the member is upserted again", async () => {
    // サインインのたびに upsertByAddress が走る。ここで表示名が消えると、
    // 保存しても次のサインインで失われる。
    const { members } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    await members.updateDisplayName(m.id, "さくら");
    await members.upsertByAddress(ADDR);
    const found = await members.findByAddress(ADDR);
    expect(found?.displayName).toBe("さくら");
  });

  it("saves and overwrites progress per step", async () => {
    const { members, progress } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    await progress.save(m.id, "q1", "最初の回答");
    await progress.save(m.id, "q1", "書き直した回答");
    const entries = await progress.listByMember(m.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ stepId: "q1", answer: "書き直した回答" });
  });

  it("prevents duplicate active applications", async () => {
    const { members, applications } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    await applications.create(m.id);
    await expect(applications.create(m.id)).rejects.toBeInstanceOf(DuplicateApplicationError);
  });

  it("allows re-application after rejection", async () => {
    const { members, applications } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    const app = await applications.create(m.id);
    await applications.transition({
      applicationId: app.id,
      field: "review",
      toStatus: "rejected",
      expectedStatus: "pending",
      actorAddress: ADMIN,
      reason: "情報不足",
    });
    const second = await applications.create(m.id);
    expect(second.id).not.toBe(app.id);
  });

  it("returns the rejected application from findLatestByMember", async () => {
    const { members, applications } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    const app = await applications.create(m.id);
    await applications.transition({
      applicationId: app.id,
      field: "review",
      toStatus: "rejected",
      expectedStatus: "pending",
      actorAddress: ADMIN,
      reason: "チェックイン履歴が見当たりませんでした",
    });

    // 申請者へ結果を伝えるための経路は却下を返す。却下が重複判定の対象外である
    // ことは "allows re-application after rejection" が押さえている。
    const latest = await applications.findLatestByMember(m.id);
    expect(latest?.id).toBe(app.id);
    expect(latest?.reviewStatus).toBe("rejected");
  });

  it("returns the newest application when an earlier one was rejected", async () => {
    const { members, applications } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    const first = await applications.create(m.id);
    await applications.transition({
      applicationId: first.id,
      field: "review",
      toStatus: "rejected",
      expectedStatus: "pending",
      actorAddress: ADMIN,
      reason: "情報不足",
    });
    const second = await applications.create(m.id);

    expect((await applications.findLatestByMember(m.id))?.id).toBe(second.id);
  });

  it("lists per-field reasons from the event history", async () => {
    const { members, applications } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    const app = await applications.create(m.id);
    await applications.transition({
      applicationId: app.id,
      field: "review",
      toStatus: "approved",
      expectedStatus: "pending",
      actorAddress: ADMIN,
    });
    await applications.transition({
      applicationId: app.id,
      field: "allowlist",
      toStatus: "failed",
      expectedStatus: "pending",
      actorAddress: ADMIN,
      reason: "ガス不足でrevert",
    });

    const events = await applications.listEvents([app.id]);
    expect(events).toHaveLength(2);
    // applications.reason は直近の1件で上書きされるが、履歴には両方が残る。
    const allowlistEvent = events.find((event) => event.field === "allowlist");
    expect(allowlistEvent).toMatchObject({
      applicationId: app.id,
      fromStatus: "pending",
      toStatus: "failed",
      actorAddress: ADMIN,
      reason: "ガス不足でrevert",
    });
  });

  it("returns no events without querying when given no ids", async () => {
    expect(await getRepositories().applications.listEvents([])).toEqual([]);
  });

  it("records an audit event on transition", async () => {
    const { members, applications } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    const app = await applications.create(m.id);
    await applications.transition({
      applicationId: app.id,
      field: "distribution",
      toStatus: "sent",
      expectedStatus: "pending",
      actorAddress: ADMIN,
      reason: "Safeで送付完了を確認",
      txId: "0xdeadbeef",
    });
    const listed = await applications.listAll();
    expect(listed[0].distributionStatus).toBe("sent");
    expect(listed[0].distributionTxId).toBe("0xdeadbeef");
    const { data } = await testClient().from("application_events").select("*").eq("application_id", app.id);
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({
      field: "distribution",
      from_status: "pending",
      to_status: "sent",
      actor_address: ADMIN,
      reason: "Safeで送付完了を確認",
      tx_id: "0xdeadbeef",
    });
  });

  // Allowlistのtx hashは applications 側に列がないため、履歴だけが記録先になる(Issue #33)。
  it("records an allowlist tx hash in the event history", async () => {
    const { members, applications } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    const app = await applications.create(m.id);
    await applications.transition({
      applicationId: app.id,
      field: "allowlist",
      toStatus: "added",
      expectedStatus: "pending",
      actorAddress: ADMIN,
      txId: "0xallowlist",
    });

    const events = await applications.listEvents([app.id]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ field: "allowlist", toStatus: "added", txId: "0xallowlist" });

    // 配布用のキャッシュ列は Allowlist の tx hash で汚さない。
    const listed = await applications.listAll();
    expect(listed[0].distributionTxId).toBeNull();
  });

  it("rejects a transition whose expected status is stale", async () => {
    const { members, applications } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    const app = await applications.create(m.id);

    // 管理者1がrejectedへ遷移させる
    await applications.transition({
      applicationId: app.id,
      field: "review",
      toStatus: "rejected",
      expectedStatus: "pending",
      actorAddress: ADMIN,
      reason: "運営判断",
    });

    // 管理者2はpendingを読んだ状態のまま、approvedへ遷移させようとする
    await expect(
      applications.transition({
        applicationId: app.id,
        field: "review",
        toStatus: "approved",
        expectedStatus: "pending",
        actorAddress: ADMIN,
      }),
    ).rejects.toBeInstanceOf(ConcurrentTransitionError);

    // 終端状態は上書きされず、監査ログにも不正な遷移が残らない
    const listed = await applications.listAll();
    expect(listed[0].reviewStatus).toBe("rejected");
    const { data } = await testClient()
      .from("application_events")
      .select("*")
      .eq("application_id", app.id);
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ from_status: "pending", to_status: "rejected" });
  });

  // Issue #21: 状態更新と監査イベントの記録は不可分でなければならない。
  // イベントのINSERTだけが失敗して状態が変わったままになると、管理者には
  // 操作が失敗したように見えるのに実際は遷移しており、監査証跡も残らない。
  it("rolls the status update back when the audit event cannot be written", async () => {
    const { members, applications } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    const app = await applications.create(m.id);

    // application_events.actor_address は not null なので、実行者不明のまま
    // 呼ぶとイベントINSERTだけが失敗する。UPDATEはこの時点で成功している。
    const { error } = await testClient().rpc("transition_application", {
      p_application_id: app.id,
      p_field: "review",
      p_to_status: "approved",
      p_expected_status: "pending",
      p_actor_address: null,
      p_reason: null,
      p_tx_id: null,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/actor_address/);

    // UPDATEも巻き戻り、状態と監査ログのどちらも動いていない
    const listed = await applications.listAll();
    expect(listed[0].reviewStatus).toBe("pending");
    const { data: events } = await testClient()
      .from("application_events")
      .select("*")
      .eq("application_id", app.id);
    expect(events).toHaveLength(0);
  });

  it("keeps the reason and tx id untouched when they are not supplied", async () => {
    const { members, applications } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    const app = await applications.create(m.id);

    await applications.transition({
      applicationId: app.id,
      field: "distribution",
      toStatus: "sent",
      expectedStatus: "pending",
      actorAddress: ADMIN,
      reason: "Safeで送付完了を確認",
      txId: "0xdeadbeef",
    });
    // 別フィールドの遷移では理由も配布tx hashも渡さない
    await applications.transition({
      applicationId: app.id,
      field: "allowlist",
      toStatus: "added",
      expectedStatus: "pending",
      actorAddress: ADMIN,
    });

    const listed = await applications.listAll();
    expect(listed[0].allowlistStatus).toBe("added");
    expect(listed[0].distributionTxId).toBe("0xdeadbeef");
    expect(listed[0].reason).toBe("Safeで送付完了を確認");
  });

  it("checks in once per day", async () => {
    const { members, checkins } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    const first = await checkins.checkinToday(m.id);
    const second = await checkins.checkinToday(m.id);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(await checkins.listByMember(m.id)).toHaveLength(1);
  });
});
