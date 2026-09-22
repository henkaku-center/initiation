// ABOUTME: 表示名を保存するServer Actionの入力検証とRepository委譲を検証する。
// ABOUTME: 保存経路のみを対象とし、どの画面から呼ぶかは Issue #72 / #46 の判断待ち。
import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateDisplayNameMock, updateDiscordUsernameMock, requireMemberMock, MockUnauthenticatedError } = vi.hoisted(() => {
  class MockUnauthenticatedError extends Error {}
  return {
    updateDisplayNameMock: vi.fn(),
    updateDiscordUsernameMock: vi.fn(),
    requireMemberMock: vi.fn(),
    MockUnauthenticatedError,
  };
});

vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({
    members: { updateDisplayName: updateDisplayNameMock, updateDiscordUsername: updateDiscordUsernameMock },
  }),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireMember: requireMemberMock,
  UnauthenticatedError: MockUnauthenticatedError,
}));

import { saveDiscordUsername, saveDisplayName } from "@/app/members/actions";
import { DISCORD_USERNAME_MAX_LENGTH } from "@/lib/domain/discordUsername";

describe("saveDisplayName", () => {
  beforeEach(() => {
    updateDisplayNameMock.mockReset();
    requireMemberMock.mockReset();
    requireMemberMock.mockResolvedValue({ id: "m1", walletAddress: "0x" + "11".repeat(20) });
  });

  it("saves the display name for the signed-in member", async () => {
    const result = await saveDisplayName("さくら");
    expect(result.ok).toBe(true);
    expect(updateDisplayNameMock).toHaveBeenCalledWith("m1", "さくら");
  });

  it("trims surrounding whitespace before saving", async () => {
    const result = await saveDisplayName("  さくら  ");
    expect(result.ok).toBe(true);
    expect(updateDisplayNameMock).toHaveBeenCalledWith("m1", "さくら");
  });

  it("rejects an empty name", async () => {
    // 空文字の扱い(未入力で消す/そもそも任意にする)は #72 の判断待ちなので、
    // 質問ステップと同じく「入力を求める」側に揃えて保存しない。
    const result = await saveDisplayName("   ");
    expect(result.ok).toBe(false);
    expect(updateDisplayNameMock).not.toHaveBeenCalled();
  });

  it("returns an authentication error when the member is not signed in", async () => {
    requireMemberMock.mockRejectedValueOnce(new MockUnauthenticatedError());
    const result = await saveDisplayName("さくら");
    expect(result).toEqual({ ok: false, error: "サインインしてください" });
    expect(updateDisplayNameMock).not.toHaveBeenCalled();
  });

  it("propagates repository failures for the server error boundary", async () => {
    updateDisplayNameMock.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(saveDisplayName("さくら")).rejects.toThrow("database unavailable");
  });
});

describe("saveDiscordUsername", () => {
  beforeEach(() => {
    updateDiscordUsernameMock.mockReset();
    requireMemberMock.mockReset();
    requireMemberMock.mockResolvedValue({ id: "m1", walletAddress: "0x" + "11".repeat(20) });
  });

  it("saves the Discord name for the signed-in member", async () => {
    expect(await saveDiscordUsername("traveler")).toEqual({ ok: true });
    expect(updateDiscordUsernameMock).toHaveBeenCalledWith("m1", "traveler");
  });

  it("trims surrounding whitespace before saving", async () => {
    expect(await saveDiscordUsername("  traveler  ")).toEqual({ ok: true });
    expect(updateDiscordUsernameMock).toHaveBeenCalledWith("m1", "traveler");
  });

  it("keeps the name as written because the application never checks Discord", async () => {
    // 表記ゆれ(@name / name#1234 / 表示名)は運営が承認時に突き合わせる前提で、
    // アプリは実在確認も正規化もしない(Issue #117)。
    expect(await saveDiscordUsername("@Traveler#1234")).toEqual({ ok: true });
    expect(updateDiscordUsernameMock).toHaveBeenCalledWith("m1", "@Traveler#1234");
  });

  it("rejects a blank name", async () => {
    const result = await saveDiscordUsername("   ");
    expect(result.ok).toBe(false);
    expect(updateDiscordUsernameMock).not.toHaveBeenCalled();
  });

  it("rejects a name longer than the stored limit", async () => {
    const result = await saveDiscordUsername("a".repeat(DISCORD_USERNAME_MAX_LENGTH + 1));
    expect(result.ok).toBe(false);
    expect(updateDiscordUsernameMock).not.toHaveBeenCalled();
  });

  it("returns an authentication error when the member is not signed in", async () => {
    requireMemberMock.mockRejectedValueOnce(new MockUnauthenticatedError());
    expect(await saveDiscordUsername("traveler")).toEqual({ ok: false, error: "サインインしてください" });
    expect(updateDiscordUsernameMock).not.toHaveBeenCalled();
  });

  it("propagates repository failures for the server error boundary", async () => {
    updateDiscordUsernameMock.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(saveDiscordUsername("traveler")).rejects.toThrow("database unavailable");
  });
});
