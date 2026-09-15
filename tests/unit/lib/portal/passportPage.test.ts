// ABOUTME: /passport(/apply)が監査イベントから Allowlist 登録操作の tx を取り出して渡すことを固定する。
// ABOUTME: 配布txは別操作なので、Allowlist 登録txの代わりに使わない(PR #110 レビュー)。
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application, ApplicationEvent } from "@/lib/domain/types";

const passport = vi.hoisted(() => vi.fn(() => "Passport"));
const repos = vi.hoisted(() => ({ application: null as Application | null, events: [] as ApplicationEvent[] }));

vi.mock("@/components/portal/PortalPassport", () => ({ PortalPassport: passport }));
vi.mock("@/components/portal/MemberBoundary", () => ({ MemberBoundary: ({ children }: { children: unknown }) => children }));
vi.mock("@/lib/auth/guards", () => ({
  UnauthenticatedError: class extends Error {},
  requireMember: vi.fn(async () => ({ id: "m1", walletAddress: "0x1111111111111111111111111111111111111111", displayName: null, firstAuthenticatedAt: "2026-09-12" })),
}));
vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({
    progress: { listByMember: async () => [] },
    applications: { findLatestByMember: async () => repos.application, listEvents: async () => repos.events },
  }),
}));
vi.mock("@/lib/initiation/complete", () => ({ isInitiationComplete: () => true }));

import ApplyPage from "@/app/apply/page";

const application: Application = { id: "a1", memberId: "m1", reviewStatus: "approved", allowlistStatus: "added", distributionStatus: "sent", distributionTxId: "0xdistribution", reason: null, createdAt: "2026-09-12", updatedAt: "2026-09-12" };
const event = (patch: Partial<ApplicationEvent>): ApplicationEvent => ({ id: "e", applicationId: "a1", field: "review", fromStatus: null, toStatus: "approved", actorAddress: "0x2222222222222222222222222222222222222222", reason: null, txId: null, createdAt: "2026-09-12T00:00:00Z", ...patch });

beforeEach(() => {
  passport.mockClear();
  repos.application = application;
  repos.events = [];
});

describe("passport page", () => {
  it("passes the Allowlist registration tx, not the distribution tx", async () => {
    repos.events = [
      event({ id: "e1", field: "allowlist", fromStatus: "pending", toStatus: "added", txId: "0xallowlist", createdAt: "2026-09-12T01:00:00Z" }),
      event({ id: "e2", field: "distribution", fromStatus: "pending", toStatus: "sent", txId: "0xdistribution", createdAt: "2026-09-12T02:00:00Z" }),
    ];
    renderToStaticMarkup(await ApplyPage());
    expect(passport).toHaveBeenCalledWith(expect.objectContaining({ application, allowlistTxId: "0xallowlist" }), undefined);
  });

  it("passes null when only a distribution tx is recorded", async () => {
    repos.events = [event({ id: "e2", field: "distribution", fromStatus: "pending", toStatus: "sent", txId: "0xdistribution" })];
    renderToStaticMarkup(await ApplyPage());
    expect(passport).toHaveBeenCalledWith(expect.objectContaining({ application, allowlistTxId: null }), undefined);
  });

  it("passes null without an application", async () => {
    repos.application = null;
    renderToStaticMarkup(await ApplyPage());
    expect(passport).toHaveBeenCalledWith(expect.objectContaining({ application: null, allowlistTxId: null }), undefined);
  });
});
