// ABOUTME: /admin の申請行が状態に応じた操作だけを出すことを固定する。
// ABOUTME: 配布の操作は Allowlist 追加済みになるまで表示しない(Issue #112)。
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminApplicationRow } from "@/components/AdminApplicationRow";
import type { Address, ApplicationWithMember } from "@/lib/domain/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/admin/actions", () => ({ transitionApplication: vi.fn() }));

function application(overrides: Partial<ApplicationWithMember> = {}): ApplicationWithMember {
  return {
    id: "a1",
    memberId: "m1",
    reviewStatus: "approved",
    allowlistStatus: "pending",
    distributionStatus: "pending",
    distributionTxId: null,
    reason: null,
    createdAt: "2026-09-15T00:00:00Z",
    updatedAt: "2026-09-15T00:00:00Z",
    walletAddress: `0x${"11".repeat(20)}` as Address,
    displayName: null,
    ...overrides,
  };
}
const render = (app: ApplicationWithMember) =>
  renderToStaticMarkup(createElement("table", null, createElement("tbody", null, createElement(AdminApplicationRow, { application: app }))));

describe("AdminApplicationRow", () => {
  it("shows only the allowlist controls right after approval", () => {
    const html = render(application());
    expect(html).toContain("Allowlist 追加済みにする");
    expect(html).toContain("Allowlist 失敗として記録");
    expect(html).not.toContain("配布済みにする");
    expect(html).not.toContain("配布 失敗として記録");
    expect(html).not.toContain('placeholder="0x…"');
    expect(html).toContain("Allowlist 追加後に配布を記録できます");
  });

  it("keeps the distribution controls hidden while the allowlist attempt has failed", () => {
    const html = render(application({ allowlistStatus: "failed" }));
    expect(html).toContain("Allowlist 追加済みにする");
    expect(html).not.toContain("配布済みにする");
    expect(html).toContain("Allowlist 追加後に配布を記録できます");
  });

  it("shows the distribution controls once the allowlist is added", () => {
    const html = render(application({ allowlistStatus: "added" }));
    expect(html).not.toContain("Allowlist 追加済みにする");
    expect(html).toContain("配布済みにする");
    expect(html).toContain("配布 失敗として記録");
    expect(html).not.toContain("Allowlist 追加後に配布を記録できます");
  });

  it("allows retrying a failed distribution after the allowlist is added", () => {
    const html = render(application({ allowlistStatus: "added", distributionStatus: "failed" }));
    expect(html).toContain("配布済みにする");
    expect(html).toContain("配布 失敗として記録");
  });

  it("shows no execution controls once distribution is sent", () => {
    const html = render(application({ allowlistStatus: "added", distributionStatus: "sent", distributionTxId: "0xabc" }));
    expect(html).not.toContain("配布済みにする");
    expect(html).not.toContain("失敗として記録");
    expect(html).not.toContain("Allowlist 追加後に配布を記録できます");
  });

  it("shows no execution controls before approval", () => {
    const html = render(application({ reviewStatus: "pending" }));
    expect(html).toContain("承認");
    expect(html).not.toContain("Allowlist 追加済みにする");
    expect(html).not.toContain("配布済みにする");
  });
});
