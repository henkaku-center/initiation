// ABOUTME: 申請Server Actionの完走条件と重複・認証エラー変換を検証する。
// ABOUTME: 申請作成前にInitiation進捗を確認し、Repositoryへ正しいmemberを渡すことを確認する。
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Address } from "@/lib/domain/types";
import { initiationSteps } from "@/lib/initiation/content";
import { journeySteps } from "@/lib/initiation/journey";

const { createMock, listByMemberMock, requireMemberMock, consumeMock, MockUnauthenticatedError } = vi.hoisted(() => {
  class MockUnauthenticatedError extends Error {}
  return {
    createMock: vi.fn(),
    listByMemberMock: vi.fn(),
    requireMemberMock: vi.fn(),
    consumeMock: vi.fn(),
    MockUnauthenticatedError,
  };
});

vi.mock("@/lib/repositories", async () => {
  const actual = await vi.importActual<typeof import("@/lib/repositories")>("@/lib/repositories");
  return {
    ...actual,
    getRepositories: () => ({
      applications: { create: createMock },
      progress: { listByMember: listByMemberMock },
      rateLimits: { consume: consumeMock },
    }),
  };
});

vi.mock("@/lib/auth/guards", () => ({
  requireMember: requireMemberMock,
  UnauthenticatedError: MockUnauthenticatedError,
}));

import { submitApplication } from "@/app/apply/actions";
import { DuplicateApplicationError } from "@/lib/repositories";

const MEMBER = "0x1111111111111111111111111111111111111111" as Address;

const allDone = initiationSteps.map((step) => ({
  stepId: step.id,
  answer: "x",
  completedAt: "t",
}));

describe("submitApplication", () => {
  beforeEach(() => {
    createMock.mockReset();
    listByMemberMock.mockReset();
    requireMemberMock.mockReset();
    requireMemberMock.mockResolvedValue({ id: "m1", walletAddress: MEMBER });
    consumeMock.mockReset();
    consumeMock.mockResolvedValue(true);
  });

  it("creates an application when initiation is complete", async () => {
    listByMemberMock.mockResolvedValue(allDone);
    createMock.mockResolvedValue({ id: "a1" });

    expect(await submitApplication()).toEqual({ ok: true });
    expect(listByMemberMock).toHaveBeenCalledWith("m1");
    expect(createMock).toHaveBeenCalledWith("m1");
  });

  it("accepts the adopted questionnaire after all five answers or skips are saved", async () => {
    listByMemberMock.mockResolvedValue(journeySteps.map((step) => ({ stepId: step.id, answer: '{"status":"skipped"}', completedAt: "t" })));
    createMock.mockResolvedValue({ id: "a1" });
    expect(await submitApplication()).toEqual({ ok: true });
  });

  it("rejects fabricated completion markers even when every current ID exists", async () => {
    listByMemberMock.mockResolvedValue(journeySteps.map((step) => ({ stepId: step.id, answer: '{"completed":true}', completedAt: "t" })));
    expect((await submitApplication()).ok).toBe(false);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("stops the call before the completion check when rate limited", async () => {
    consumeMock.mockResolvedValue(false);

    const result = await submitApplication();

    expect(result.ok).toBe(false);
    expect(result.error).toContain("申請の送信が多すぎます");
    // 完走判定より前で止める。止めたいのは弾かれ続ける呼び出しのほうなので、
    // ここでlistByMemberが呼ばれていると数え漏らす経路が残っていることになる。
    expect(listByMemberMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("counts the attempt against the signed-in wallet address", async () => {
    listByMemberMock.mockResolvedValue(allDone);
    createMock.mockResolvedValue({ id: "a1" });

    await submitApplication();

    expect(consumeMock).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "application_submit", subject: MEMBER, limit: 5 }),
    );
  });

  it("rejects when initiation is not complete", async () => {
    listByMemberMock.mockResolvedValue([]);

    const result = await submitApplication();

    expect(result).toEqual({ ok: false, error: "先に Initiation を完走してください" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("reports duplicate application as a user-facing error", async () => {
    listByMemberMock.mockResolvedValue(allDone);
    createMock.mockRejectedValue(new DuplicateApplicationError("dup"));

    const result = await submitApplication();

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/申請済み/);
  });

  it("returns an authentication error when the member is not signed in", async () => {
    requireMemberMock.mockRejectedValueOnce(new MockUnauthenticatedError());

    expect(await submitApplication()).toEqual({ ok: false, error: "サインインしてください" });
    expect(listByMemberMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("propagates repository failures for the server error boundary", async () => {
    listByMemberMock.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(submitApplication()).rejects.toThrow("database unavailable");
  });
});
