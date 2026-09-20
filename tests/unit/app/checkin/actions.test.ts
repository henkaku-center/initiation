// ABOUTME: チェックインServer Actionの結果変換と認証境界を検証する。
// ABOUTME: 初回・同日重複・未認証・Repository障害の扱いを確認する。
import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkinTodayMock, updateNoteMock, requireMemberMock, consumeMock, MockUnauthenticatedError } = vi.hoisted(() => {
  class MockUnauthenticatedError extends Error {}
  return {
    checkinTodayMock: vi.fn(),
    updateNoteMock: vi.fn(),
    requireMemberMock: vi.fn(),
    consumeMock: vi.fn(),
    MockUnauthenticatedError,
  };
});

vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({
    checkins: { checkinToday: checkinTodayMock, updateNote: updateNoteMock, listByMember: vi.fn() },
    rateLimits: { consume: consumeMock },
  }),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireMember: requireMemberMock,
  UnauthenticatedError: MockUnauthenticatedError,
}));

import { checkin } from "@/app/checkin/actions";
import { CHECKIN_NOTE_MAX_LENGTH } from "@/lib/domain/checkinNote";
import type { Address } from "@/lib/domain/types";

const MEMBER = "0x1111111111111111111111111111111111111111" as Address;

describe("checkin", () => {
  beforeEach(() => {
    checkinTodayMock.mockReset();
    updateNoteMock.mockReset();
    requireMemberMock.mockReset();
    requireMemberMock.mockResolvedValue({ id: "m1", walletAddress: MEMBER });
    consumeMock.mockReset();
    consumeMock.mockResolvedValue(true);
  });

  it("returns ok on first checkin of the day", async () => {
    checkinTodayMock.mockResolvedValue({ created: true, checkin: { id: "c1" } });
    expect(await checkin()).toEqual({ ok: true, alreadyCheckedIn: false });
    expect(checkinTodayMock).toHaveBeenCalledWith("m1");
  });

  it("reports already checked in on second call", async () => {
    checkinTodayMock.mockResolvedValue({ created: false, checkin: { id: "c1" } });
    expect(await checkin()).toEqual({ ok: true, alreadyCheckedIn: true });
  });

  it("stops the call before touching the repository when rate limited", async () => {
    consumeMock.mockResolvedValue(false);

    const result = await checkin();

    expect(result.ok).toBe(false);
    expect(result.error).toContain("チェックインが多すぎます");
    // 上限に達した呼び出しは、DBの一意制約まで届かせない。
    expect(checkinTodayMock).not.toHaveBeenCalled();
  });

  it("counts the attempt against the signed-in wallet address", async () => {
    checkinTodayMock.mockResolvedValue({ created: true, checkin: { id: "c1" } });

    await checkin();

    expect(consumeMock).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "checkin", subject: MEMBER, limit: 20 }),
    );
  });

  it("returns an authentication error when the member is not signed in", async () => {
    requireMemberMock.mockRejectedValueOnce(new MockUnauthenticatedError());
    expect(await checkin()).toEqual({ ok: false, error: "サインインしてください" });
    expect(checkinTodayMock).not.toHaveBeenCalled();
  });

  it("propagates repository failures for the server error boundary", async () => {
    checkinTodayMock.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(checkin()).rejects.toThrow("database unavailable");
  });

  it("saves the note with the first checkin of the day", async () => {
    checkinTodayMock.mockResolvedValue({ created: true, checkin: { id: "c1" } });
    expect(await checkin("Tone.jsで音を鳴らした")).toEqual({ ok: true, alreadyCheckedIn: false });
    expect(updateNoteMock).toHaveBeenCalledWith("m1", "c1", "Tone.jsで音を鳴らした");
  });

  it("writes the note onto the day already checked in", async () => {
    // 「押してから書く」を許す。その日のSignalは最新の一言で上書きする(Issue #119)。
    checkinTodayMock.mockResolvedValue({ created: false, checkin: { id: "c1" } });
    expect(await checkin("昼に動いた")).toEqual({ ok: true, alreadyCheckedIn: true });
    expect(updateNoteMock).toHaveBeenCalledWith("m1", "c1", "昼に動いた");
  });

  it("leaves an existing note untouched when the note is not sent", async () => {
    checkinTodayMock.mockResolvedValue({ created: false, checkin: { id: "c1" } });
    await checkin();
    expect(updateNoteMock).not.toHaveBeenCalled();
  });

  it("clears the note when a blank one is sent", async () => {
    checkinTodayMock.mockResolvedValue({ created: false, checkin: { id: "c1" } });
    expect(await checkin("   ")).toEqual({ ok: true, alreadyCheckedIn: true });
    expect(updateNoteMock).toHaveBeenCalledWith("m1", "c1", null);
  });

  it("rejects a note beyond the limit before checking in", async () => {
    const result = await checkin("あ".repeat(CHECKIN_NOTE_MAX_LENGTH + 1));
    expect(result.ok).toBe(false);
    expect(checkinTodayMock).not.toHaveBeenCalled();
    expect(updateNoteMock).not.toHaveBeenCalled();
  });

  it("counts a note-only update against the same limit before writing", async () => {
    consumeMock.mockResolvedValue(false);
    const result = await checkin("昼に動いた");
    expect(result.ok).toBe(false);
    expect(checkinTodayMock).not.toHaveBeenCalled();
    expect(updateNoteMock).not.toHaveBeenCalled();
  });
});
