// ABOUTME: Display the real application's three status dimensions without simulated rewards.
// ABOUTME: Only rejected applications can be submitted again, after server completion.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PortalPassport } from "@/components/portal/PortalPassport";
import type { Application } from "@/lib/domain/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/apply/actions", () => ({ submitApplication: vi.fn() }));

const application: Application = { id: "a1", memberId: "m1", reviewStatus: "approved", allowlistStatus: "pending", distributionStatus: "pending", distributionTxId: null, reason: null, createdAt: "2026-09-12", updatedAt: "2026-09-12" };
const render = (app: Application | null, complete = true, reason: string | null = null) => renderToStaticMarkup(createElement(PortalPassport, { application: app, complete, reviewReason: reason }));

describe("portal passport", () => {
  it("keeps approval distinct from adding to Allowlist and distributing tokens", () => {
    const html = render(application);
    expect(html).toContain("承認済み");
    expect(html).toContain("Allowlist");
    expect(html).not.toContain("100 HENKAKU");
    expect(html).not.toContain("受け取り済み");
    expect(html).not.toContain("デモ審査");
    expect(html).toContain("準備中");
  });
  it("shows needs_info and its actual reason without a simulated resubmit button", () => {
    const html = render({ ...application, reviewStatus: "needs_info" }, true, "回答を確認してください");
    expect(html).toContain("回答を確認してください");
    expect(html).not.toContain("もう一度申請する");
  });
  it("allows reapplication after rejection", () => {
    expect(render({ ...application, reviewStatus: "rejected" })).toContain("もう一度申請する");
  });
  it("requires server completion to show the submit button", () => {
    expect(render(null, false)).not.toContain(">申請する<");
    expect(render(null, true)).toContain(">申請する<");
  });
});
