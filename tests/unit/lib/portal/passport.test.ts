// ABOUTME: Display the real application's three status dimensions without simulated rewards.
// ABOUTME: Only rejected applications can be submitted again, after server completion.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PortalPassport } from "@/components/portal/PortalPassport";
import type { Application } from "@/lib/domain/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/apply/actions", () => ({ submitApplication: vi.fn() }));
const walletStatus = vi.hoisted(() => vi.fn(() => "Wallet readings"));
vi.mock("@/components/portal/PortalWalletStatus", () => ({ PortalWalletStatus: walletStatus }));

const application: Application = { id: "a1", memberId: "m1", reviewStatus: "approved", allowlistStatus: "pending", distributionStatus: "pending", distributionTxId: null, reason: null, createdAt: "2026-09-12", updatedAt: "2026-09-12" };
const render = (app: Application | null, complete = true, reason: string | null = null, allowlistTxId: string | null = null) => renderToStaticMarkup(createElement(PortalPassport, { application: app, complete, reviewReason: reason, allowlistTxId }));

describe("portal passport", () => {
  const renderWith = (props: Partial<Parameters<typeof PortalPassport>[0]>) =>
    renderToStaticMarkup(createElement(PortalPassport, { application: null, complete: true, reviewReason: null, allowlistTxId: null, ...props }));

  it("asks for the Discord name where the application is made, not among the journey questions", () => {
    // 問いへの回答ではなく参加の前提なので、申請が止まる場所で受け取る(Issue #117)。
    const html = renderWith({ discordUsername: null });
    expect(html).toContain("Discord");
    expect(html).toContain("portal-discord-username");
  });

  it("prefills the registered Discord name so it can be corrected", () => {
    expect(renderWith({ discordUsername: "traveler" })).toContain("traveler");
  });

  it("does not ask for the Discord name before the journey is finished", () => {
    expect(renderWith({ complete: false, discordUsername: null })).not.toContain("portal-discord-username");
  });

  it("does not ask signed-out visitors for a Discord name", () => {
    expect(renderWith({ signedIn: false, discordUsername: null })).not.toContain("portal-discord-username");
  });

  it("keeps the four illustrated doors and wallet details from the reference", () => {
    const html = render(null, false);
    expect(html).toContain("pd-reward-grid");
    expect(html).toContain("pd-nft-generated");
    for (const name of ["allowlist", "token", "membership"]) expect(html).toContain(`passport-${name}.webp`);
    expect(html).toContain("YOUR SIGNALS");
    expect(html).toContain("WALLET STATUS");
    expect(html).toContain("Wallet readings");
    expect(html).toContain("まずは、小さな旅に出よう。");
  });
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
  it("hands the application record and the Allowlist tx to the wallet status so mismatches can be explained", () => {
    walletStatus.mockClear();
    render(application, true, null, "0xallowlist");
    expect(walletStatus).toHaveBeenCalledWith(expect.objectContaining({ application, allowlistTxId: "0xallowlist" }), undefined);
    walletStatus.mockClear();
    render(null, false);
    expect(walletStatus).toHaveBeenCalledWith(expect.objectContaining({ application: null, allowlistTxId: null }), undefined);
  });
  it("allows reapplication after rejection", () => {
    expect(render({ ...application, reviewStatus: "rejected" })).toContain("もう一度申請する");
  });
  it("requires server completion to show the submit button", () => {
    expect(render(null, false)).not.toContain(">申請する<");
    expect(render(null, true)).toContain(">申請する<");
  });
});
