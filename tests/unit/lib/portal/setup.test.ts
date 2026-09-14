// ABOUTME: Preserve the reference Setup arrangement around real wallet controls.
// ABOUTME: On-chain wallet readings are rendered by PortalWalletStatus and mocked here.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PortalSetup } from "@/components/portal/PortalSetup";

vi.mock("@/components/ConnectWallet", () => ({ ConnectWallet: () => "Wallet connection" }));
vi.mock("@/components/WalletSetup", () => ({ WalletSetup: () => "Network and token setup" }));
vi.mock("@/components/SignInWithEthereum", () => ({ SignInWithEthereum: () => "SIWE sign in" }));
vi.mock("@/components/portal/PortalWalletStatus", () => ({ PortalWalletStatus: () => "Wallet readings" }));

it("keeps the wallet main column, status aside and next-step row", () => {
  const html = renderToStaticMarkup(createElement(PortalSetup));
  const aside = html.match(/<aside[^>]*>([\s\S]*?)<\/aside>/)?.[1];
  expect(aside).toContain("YOUR CURRENT STATUS");
  expect(aside).toContain("Wallet readings");
  expect(html).toContain("pd-next-row");
  expect(html).toContain("pd-setup-step");
  expect(html).toContain("Wallet connection");
  expect(html).toContain("SIWE sign in");
});
