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
    discordUsername: null,
    ...overrides,
  };
}
const render = (app: ApplicationWithMember) =>
  renderToStaticMarkup(createElement("table", null, createElement("tbody", null, createElement(AdminApplicationRow, { application: app }))));

describe("AdminApplicationRow", () => {
  it("shows the applicant's Discord name so operators can reach them", () => {
    // 承認後の連絡手段。Runbookが外部に置いていた連絡先をアプリ側に出す(Issue #117)。
    const html = render(application({ discordUsername: "traveler" }));
    expect(html).toContain("traveler");
  });

  it("marks the Discord name as missing rather than leaving the cell blank", () => {
    const html = render(application({ discordUsername: null }));
    expect(html).toContain("Discord 未登録");
  });

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

  // Safeへの受け渡し(Issue #137)。値の正本はRunbookの運用入力。
  const ALLOWLIST_SAFE = "0x3F1D35bF5f182D7b4ef95a3f298f059BC33d2020";
  const DISTRIBUTION_SAFE = "0x1C9D58eBd2A9F4952C2A4a8f9906FeF133056a33";
  const TOKEN = "0x0cc91a5FFC2E9370eC565Ab42ECE33bbC08C11a2";

  it("hands the allowlist step over to the allowlist Safe after approval", () => {
    const html = render(application());
    expect(html).toContain(`href="https://app.safe.global/home?safe=matic:${ALLOWLIST_SAFE}"`);
    expect(html).toContain("Allowlist用Safeを開く");
    expect(html).toContain("addWhitelistUser");
    expect(html).toContain(TOKEN);
    expect(html).toContain("申請者アドレスをコピー");
    expect(html).toContain("コントラクトをコピー");
  });

  it("does not offer the distribution Safe before the allowlist is added", () => {
    for (const allowlistStatus of ["pending", "failed"] as const) {
      const html = render(application({ allowlistStatus }));
      expect(html).not.toContain(DISTRIBUTION_SAFE);
      expect(html).not.toContain("配布用Safeを開く");
    }
  });

  it("hands the distribution step over to the distribution Safe once the allowlist is added", () => {
    const html = render(application({ allowlistStatus: "added" }));
    expect(html).toContain(`href="https://app.safe.global/home?safe=matic:${DISTRIBUTION_SAFE}"`);
    expect(html).toContain("配布用Safeを開く");
    expect(html).toContain("10 HENKAKU");
    expect(html).toContain("送付先をコピー");
    expect(html).toContain("数量をコピー");
    // 済んだ工程のSafeは出さない(配布用Safeとの取り違えを防ぐ)。
    expect(html).not.toContain(ALLOWLIST_SAFE);
    expect(html).not.toContain("Allowlist用Safeを開く");
  });

  it("opens Safe links in a new tab without leaking the admin page as opener", () => {
    const html = render(application());
    expect(html).toMatch(/target="_blank"[^>]*rel="noopener noreferrer"|rel="noopener noreferrer"[^>]*target="_blank"/);
  });

  it("points to the completion notice once distribution is sent", () => {
    const html = render(
      application({ allowlistStatus: "added", distributionStatus: "sent", distributionTxId: "0xabc", discordUsername: "traveler" }),
    );
    expect(html).toContain("申請者へ完了を連絡");
    expect(html).not.toContain(ALLOWLIST_SAFE);
    expect(html).not.toContain(DISTRIBUTION_SAFE);
  });

  it("shows no Safe handoff before approval or after rejection", () => {
    for (const reviewStatus of ["pending", "needs_info", "rejected"] as const) {
      const html = render(application({ reviewStatus }));
      expect(html).not.toContain("app.safe.global");
      expect(html).not.toContain("addWhitelistUser");
    }
  });

  it("shows no execution controls before approval", () => {
    const html = render(application({ reviewStatus: "pending" }));
    expect(html).toContain("承認");
    expect(html).not.toContain("Allowlist 追加済みにする");
    expect(html).not.toContain("配布済みにする");
  });
});
