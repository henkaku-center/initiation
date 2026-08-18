// ABOUTME: WalletSetupの描画分岐を検証する。トークン設定の有無で消えてはいけない導線を守る。
// ABOUTME: Polygon切替はトークン設定と無関係なので、設定が欠けていても残ることを固定する(Issue #67)。
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const account = { chainId: 1, isConnected: true };

vi.mock("wagmi", () => ({
  useAccount: () => account,
  useSwitchChain: () => ({ switchChain: () => {}, error: null, isPending: false }),
  useWatchAsset: () => ({ watchAsset: () => {}, data: undefined, error: null, isPending: false }),
}));

const { WalletSetup } = await import("@/components/WalletSetup");

function render() {
  return renderToStaticMarkup(createElement(WalletSetup));
}

describe("WalletSetup", () => {
  beforeEach(() => {
    account.chainId = 1;
    account.isConnected = true;
    process.env.NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS =
      "0x1234567890123456789012345678901234567890";
  });

  it("offers the Polygon switch when connected to another chain", () => {
    expect(render()).toContain("Polygon に切り替える");
  });

  // トークン設定はトークン追加だけの前提条件。設定が欠けたときに切替ボタンまで消えると、
  // 別チェーンに繋いだ人が /setup から復帰できなくなる(Issue #67)。
  it("keeps the Polygon switch available when token config is missing", () => {
    delete process.env.NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS;
    expect(render()).toContain("Polygon に切り替える");
  });

  it("explains that only the token step is unavailable when token config is missing", () => {
    delete process.env.NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS;
    const html = render();
    expect(html).toContain("NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS");
    expect(html).toContain("進行に影響はありません");
  });

  it("disables the token step when token config is missing", () => {
    delete process.env.NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS;
    expect(render()).toMatch(/HENKAKU トークンをウォレットに追加[\s\S]*?/);
    expect(render()).toContain("disabled");
  });

  it("asks for a wallet connection before anything else", () => {
    account.isConnected = false;
    expect(render()).toContain("先にウォレットを接続してください");
  });
});
