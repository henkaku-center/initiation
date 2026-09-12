// ABOUTME: Preserve the reference Setup arrangement around real wallet controls.
// ABOUTME: Wallet readings remain unavailable rather than showing fabricated balances.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PortalSetup } from "@/components/portal/PortalSetup";

vi.mock("@/components/ConnectWallet", () => ({ ConnectWallet: () => "Wallet connection" }));
vi.mock("@/components/WalletSetup", () => ({ WalletSetup: () => "Network and token setup" }));
vi.mock("@/components/SignInWithEthereum", () => ({ SignInWithEthereum: () => "SIWE sign in" }));

it("keeps the wallet main column, status aside and next-step row", () => {
  const html = renderToStaticMarkup(createElement(PortalSetup));
  const aside = html.match(/<aside[^>]*>([\s\S]*?)<\/aside>/)?.[1];
  expect(aside).toContain("YOUR CURRENT STATUS");
  expect(aside).toContain("HENKAKU TOKEN");
  expect(aside).toContain("ALLOWLIST");
  expect(aside).toContain("準備中");
  expect(html).toContain("pd-next-row");
  expect(html).toContain("pd-setup-step");
  expect(html).toContain("Wallet connection");
  expect(html).toContain("SIWE sign in");
});
