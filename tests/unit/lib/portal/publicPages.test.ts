// ABOUTME: Public visitors can see the reference experience before connecting a wallet.
// ABOUTME: Unauthenticated pages never load member repositories or expose submit controls.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import InitiationPage from "@/app/initiation/page";
import ApplyPage from "@/app/apply/page";
import CheckinPage from "@/app/checkin/page";
import { getRepositories } from "@/lib/repositories";

vi.mock("@/lib/auth/guards", () => {
  class UnauthenticatedError extends Error {}
  return { UnauthenticatedError, requireMember: vi.fn(async () => { throw new UnauthenticatedError(); }) };
});
vi.mock("@/lib/repositories", () => ({ getRepositories: vi.fn(() => { throw new Error("No member data in public preview"); }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/initiation/actions", () => ({ saveStep: vi.fn() }));
vi.mock("@/app/members/actions", () => ({ saveDisplayName: vi.fn() }));
vi.mock("@/app/apply/actions", () => ({ submitApplication: vi.fn() }));
vi.mock("@/app/checkin/actions", () => ({ checkin: vi.fn() }));

describe("public participation pages", () => {
  it.each([
    ["Initiation", InitiationPage, "pd-journey-scene"],
    ["Passport", ApplyPage, "pd-reward-grid"],
    ["Community", CheckinPage, "pd-community-grid"],
  ] as const)("renders %s artwork before authentication", async (_, page, expected) => {
    const html = renderToStaticMarkup(await page());
    expect(html).toContain(expected);
    expect(html).toContain("サインイン");
    expect(html).not.toContain(">申請する<");
    expect(getRepositories).not.toHaveBeenCalled();
  });
});
