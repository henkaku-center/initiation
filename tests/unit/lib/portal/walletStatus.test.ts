// ABOUTME: PortalWalletStatus がオンチェーンの読み取りを4状態で表示することを固定する。
// ABOUTME: wagmi をモックし、アドレス切替で前の値が残らないことと isAllowed の読み方を検証する。
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application } from "@/lib/domain/types";

const ADDRESS_A = "0x1111111111111111111111111111111111111111";
const ADDRESS_B = "0x2222222222222222222222222222222222222222";
const OWNER = "0x5983c3bd118d29606466213d81ea478501b31b1e";
const ONE = BigInt(10) ** BigInt(18);
const TEN = BigInt(10) * ONE;
const ZERO = BigInt(0);

type Reading = { data?: unknown; isError?: boolean };
type ReadParams = { functionName: string; args?: readonly unknown[]; account?: unknown; chainId?: number; address?: string; query?: Record<string, unknown> };

const mocks = vi.hoisted(() => ({
  address: undefined as string | undefined,
  readings: {} as Record<string, Reading>,
  calls: [] as ReadParams[],
  refetch: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: mocks.address, isConnected: Boolean(mocks.address) }),
  useReadContract: (params: ReadParams) => {
    mocks.calls.push(params);
    const key = params.args?.length ? `${params.functionName}:${params.args[0]}` : params.functionName;
    const reading = params.query?.enabled === false ? {} : (mocks.readings[key] ?? {});
    return { data: reading.data, isError: Boolean(reading.isError), isPending: reading.data === undefined && !reading.isError, refetch: mocks.refetch };
  },
}));

import { PortalWalletStatus } from "@/components/portal/PortalWalletStatus";

const render = (application: Application | null = null, allowlistTxId: string | null = null) => renderToStaticMarkup(createElement(PortalWalletStatus, { application, allowlistTxId }));
const readyFor = (address: string, balance: bigint, allowed: boolean) => {
  mocks.readings.owner = { data: OWNER };
  mocks.readings[`balanceOf:${address}`] = { data: balance };
  mocks.readings[`isAllowed:${address}`] = { data: allowed };
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS = "0x0cc91a5FFC2E9370eC565Ab42ECE33bbC08C11a2";
  process.env.NEXT_PUBLIC_HENKAKU_TOKEN_SYMBOL = "HENKAKU";
  process.env.NEXT_PUBLIC_HENKAKU_TOKEN_DECIMALS = "18";
  mocks.address = ADDRESS_A;
  mocks.readings = {};
  mocks.calls = [];
});

describe("PortalWalletStatus", () => {
  it("asks for a wallet connection instead of showing a dash", () => {
    mocks.address = undefined;
    const html = render();
    expect(html).toContain("ウォレットを接続すると表示します");
    expect(html).not.toContain("準備中");
    expect(html).not.toContain("<strong>—</strong>");
  });

  it("shows loading without pretending the wallet holds nothing", () => {
    const html = render();
    expect(html).toContain("取得中");
    expect(html).not.toContain("保有していない");
    expect(html).not.toContain("未追加");
  });

  it("shows failure with a retry control", () => {
    mocks.readings.owner = { isError: true };
    mocks.readings[`balanceOf:${ADDRESS_A}`] = { isError: true };
    const html = render();
    expect(html.match(/取得できませんでした/g)).toHaveLength(2);
    expect(html).toContain("再取得");
    expect(html).not.toContain("未追加");
  });

  it("shows holdings and Allowlist registration read from Polygon", () => {
    readyFor(ADDRESS_A, TEN, true);
    const html = render();
    expect(html).toContain("10 HENKAKU");
    expect(html).toContain("保有している");
    expect(html).toContain("追加済み");
    expect(html).toContain("Polygon上の状態");
  });

  it("shows an empty wallet and missing registration as values, not as blanks", () => {
    readyFor(ADDRESS_A, ZERO, false);
    const html = render();
    expect(html).toContain("0 HENKAKU");
    expect(html).toContain("保有していない");
    expect(html).toContain("未追加");
  });

  it("does not keep the previous account's values after switching accounts", () => {
    readyFor(ADDRESS_A, TEN, true);
    expect(render()).toContain("10 HENKAKU");
    mocks.address = ADDRESS_B;
    mocks.calls = [];
    const html = render();
    expect(html).not.toContain("10 HENKAKU");
    expect(html).not.toContain("追加済み");
    expect(html).toContain("取得中");
    for (const call of mocks.calls.filter((c) => c.args?.length)) expect(call.args?.[0]).toBe(ADDRESS_B);
  });

  it("reads isAllowed as the contract owner on Polygon and waits for owner first", () => {
    render();
    const isAllowed = mocks.calls.find((c) => c.functionName === "isAllowed");
    expect(isAllowed?.query?.enabled).toBe(false);
    mocks.calls = [];
    readyFor(ADDRESS_A, ONE, true);
    render();
    const enabled = mocks.calls.find((c) => c.functionName === "isAllowed");
    expect(enabled?.account).toBe(OWNER);
    expect(enabled?.query?.enabled).toBe(true);
    for (const call of mocks.calls) {
      expect(call.chainId).toBe(137);
      expect(call.address).toBe("0x0cc91a5FFC2E9370eC565Ab42ECE33bbC08C11a2");
      // owner は実質固定値なので長く保持してよいが、アドレス依存の読み取りは30秒で古くする。
      expect(call.query?.staleTime).toBe(call.functionName === "owner" ? 5 * 60_000 : 30_000);
      expect(call.query?.refetchOnWindowFocus).toBe(false);
      expect(call.query?.placeholderData).toBeUndefined();
    }
  });

  it("adds the mismatch note when an application record is given", () => {
    readyFor(ADDRESS_A, ONE, true);
    const application: Application = { id: "a1", memberId: "m1", reviewStatus: "approved", allowlistStatus: "pending", distributionStatus: "pending", distributionTxId: null, reason: null, createdAt: "2026-09-12", updatedAt: "2026-09-12" };
    expect(render(application)).toContain("Allowlistには登録済みです。申請記録は未更新です");
    expect(render()).not.toContain("申請記録は未更新です");
  });

  it("links the recorded Allowlist tx on Polygonscan when the chain does not confirm the record", () => {
    readyFor(ADDRESS_A, ZERO, false);
    const application: Application = { id: "a1", memberId: "m1", reviewStatus: "approved", allowlistStatus: "added", distributionStatus: "sent", distributionTxId: "0xdistribution", reason: null, createdAt: "2026-09-12", updatedAt: "2026-09-12" };
    const html = render(application, "0xallowlist");
    expect(html).toContain("オンチェーンで確認できません。運営に連絡してください");
    expect(html).toContain('href="https://polygonscan.com/tx/0xallowlist"');
    expect(html).not.toContain("0xdistribution");
  });

  it("omits the tx link when no Allowlist tx is recorded, without falling back to the distribution tx", () => {
    readyFor(ADDRESS_A, ZERO, false);
    const application: Application = { id: "a1", memberId: "m1", reviewStatus: "approved", allowlistStatus: "added", distributionStatus: "sent", distributionTxId: "0xdistribution", reason: null, createdAt: "2026-09-12", updatedAt: "2026-09-12" };
    const html = render(application, null);
    expect(html).toContain("オンチェーンで確認できません。運営に連絡してください");
    expect(html).not.toContain("/tx/");
    expect(html).not.toContain("0xdistribution");
  });

  it("explains a missing token configuration instead of failing the page", () => {
    delete process.env.NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS;
    const html = render();
    expect(html).toContain("トークンの設定がないため取得できません");
    expect(html).not.toContain("保有していない");
  });
});
