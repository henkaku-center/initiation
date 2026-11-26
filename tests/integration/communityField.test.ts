// ABOUTME: Community Fieldの集計が、メンバーをまたいで件数だけを返すことをローカルDBで確認する(Issue #132)。
// ABOUTME: 返り値にメンバーID・ウォレットアドレス・呼び名・回答本文が入らないことを固定する。
import { beforeEach, describe, expect, it } from "vitest";
import { normalizeAddress } from "@/lib/domain/address";
import { fieldWindowStart } from "@/lib/domain/communityField";
import { getRepositories } from "@/lib/repositories";
import { testClient, truncateAll } from "@/tests/support/repositories";

const A = normalizeAddress("0x1111111111111111111111111111111111111111");
const B = normalizeAddress("0x3333333333333333333333333333333333333333");
const C = normalizeAddress("0x4444444444444444444444444444444444444444");
const answered = (...tags: string[]) => JSON.stringify({ status: "answered", value: tags });
const daysAgo = (now: Date, days: number) => fieldWindowStart(new Date(now.getTime() + (6 - days) * 24 * 60 * 60 * 1000));

describe("community field (local supabase)", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("is all zeros before anyone arrives", async () => {
    const field = await getRepositories().communityField.summary(fieldWindowStart(new Date()));
    expect(field).toEqual({
      checkins: { days: 7, count: 0, members: 0 },
      interests: { respondents: 0, tags: [], combinations: [] },
    });
  });

  it("counts check-ins and the people behind them within the window only", async () => {
    const { members, checkins, communityField } = getRepositories();
    const now = new Date();
    const a = await members.upsertByAddress(A);
    const b = await members.upsertByAddress(B);
    const c = await members.upsertByAddress(C);
    await checkins.checkinToday(a.id);
    await checkins.checkinToday(b.id);
    const { error } = await testClient().from("checkins").insert([
      { member_id: a.id, checkin_date: daysAgo(now, 3) },
      { member_id: a.id, checkin_date: daysAgo(now, 6) },
      // 期間の外。数えない。
      { member_id: a.id, checkin_date: daysAgo(now, 7) },
      { member_id: c.id, checkin_date: daysAgo(now, 30) },
    ]);
    if (error) throw error;

    const field = await communityField.summary(fieldWindowStart(now));
    expect(field.checkins).toEqual({ days: 7, count: 4, members: 2 });
  });

  it("counts interest tags from everyone who answered, whether or not they applied", async () => {
    const { members, progress, applications, communityField } = getRepositories();
    const a = await members.upsertByAddress(A);
    const b = await members.upsertByAddress(B);
    const c = await members.upsertByAddress(C);
    await progress.save(a.id, "v2-interests", answered("AI", "EDUCATION"));
    await progress.save(b.id, "v2-interests", answered("EDUCATION", "AI", "MUSIC"));
    await progress.save(c.id, "v2-interests", JSON.stringify({ status: "skipped" }));
    await applications.create(a.id);

    const field = await communityField.summary(fieldWindowStart(new Date()));
    expect(field.interests.respondents).toBe(2);
    expect(field.interests.tags).toEqual([
      { tag: "AI", count: 2 },
      { tag: "EDUCATION", count: 2 },
      { tag: "MUSIC", count: 1 },
    ]);
    expect(field.interests.combinations[0]).toEqual({ tags: ["AI", "EDUCATION"], count: 2 });
  });

  it("returns numbers and tag names only, never who or what they wrote", async () => {
    const { members, progress, checkins, communityField } = getRepositories();
    const a = await members.upsertByAddress(A);
    await members.updateDisplayName(a.id, "さくら");
    await members.updateDiscordUsername(a.id, "sakura_d");
    await progress.save(a.id, "v2-interests", answered("AI", "EDUCATION"));
    await progress.save(a.id, "v2-curiosity", JSON.stringify({ status: "answered", value: "ひみつの計画" }));
    const { checkin } = await checkins.checkinToday(a.id);
    await checkins.updateNote(a.id, checkin.id, "今日のひとこと");

    const serialized = JSON.stringify(await communityField.summary(fieldWindowStart(new Date())));
    for (const secret of [a.id, A, A.slice(2), "さくら", "sakura_d", "ひみつの計画", "今日のひとこと", checkin.id]) {
      expect(serialized).not.toContain(secret);
    }
  });
});
