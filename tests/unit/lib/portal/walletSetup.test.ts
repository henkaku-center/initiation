// ABOUTME: Network setup must work without optional token display configuration.
// ABOUTME: A missing token definition cannot prevent Polygon authentication.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { WalletSetup } from "@/components/WalletSetup";

vi.mock("wagmi", () => ({
  useAccount: () => ({ isConnected: true, chainId: 1 }),
  useSwitchChain: () => ({ switchChain: vi.fn() }),
  useWatchAsset: () => ({ watchAsset: vi.fn() }),
}));
vi.mock("@/lib/henkakuToken", () => ({
  henkakuTokenConfig: () => { throw new Error("Token not configured"); },
}));

it("allows switching to Polygon while token display is unavailable", () => {
  const html = renderToStaticMarkup(createElement(WalletSetup));
  expect(html).toContain("Polygon に切り替える");
  expect(html).toContain("トークン表示の追加は準備中");
  expect(html).not.toContain("HENKAKU トークンをウォレットに追加</button>");
});
