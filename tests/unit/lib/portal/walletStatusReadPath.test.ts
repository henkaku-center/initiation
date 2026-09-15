// ABOUTME: isAllowed の実際の読み取り経路で、トークン契約への呼び出し元が owner になることを固定する。
// ABOUTME: wagmi の返り値をモックせず、transport に届く JSON-RPC の eth_call を検証する(PR #106 レビュー)。
import { createConfig, custom } from "wagmi";
import { readContract } from "wagmi/actions";
import { polygon } from "wagmi/chains";
import { encodeFunctionResult, multicall3Abi, toFunctionSelector } from "viem";
import { describe, expect, it } from "vitest";
import { henkakuTokenAbi } from "@/lib/henkakuToken";

const TOKEN = "0x0cc91a5FFC2E9370eC565Ab42ECE33bbC08C11a2";
const OWNER = "0x5983c3bd118d29606466213d81ea478501b31b1e";
const USER = "0x1111111111111111111111111111111111111111";
const MULTICALL3 = polygon.contracts.multicall3.address;
const TRUE = `0x${"0".repeat(63)}1` as const;

type EthCall = { to?: string; from?: string; data?: string };

function configRecording(calls: EthCall[]) {
  const transport = custom({
    async request({ method, params }: { method: string; params?: unknown }) {
      if (method !== "eth_call") throw new Error(`unexpected ${method}`);
      const [request] = params as [EthCall];
      calls.push(request);
      // Multicall3 経由なら aggregate3 の戻り値の形で、直接呼び出しなら bool そのままで返す。
      if (request.to?.toLowerCase() === MULTICALL3.toLowerCase()) {
        return encodeFunctionResult({ abi: multicall3Abi, functionName: "aggregate3", result: [{ success: true, returnData: TRUE }] });
      }
      return TRUE;
    },
  });
  // lib/wagmi.ts と同じく batch は既定のまま(multicall 有効)。
  return createConfig({ chains: [polygon], transports: { [polygon.id]: transport } });
}

describe("isAllowed read path", () => {
  it("calls the token directly with the owner as msg.sender instead of going through Multicall3", async () => {
    const calls: EthCall[] = [];
    const allowed = await readContract(configRecording(calls), {
      abi: henkakuTokenAbi,
      address: TOKEN,
      functionName: "isAllowed",
      args: [USER],
      account: OWNER,
      chainId: polygon.id,
    });
    expect(allowed).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].to?.toLowerCase()).toBe(TOKEN.toLowerCase());
    expect(calls[0].from?.toLowerCase()).toBe(OWNER.toLowerCase());
    expect(calls[0].data?.startsWith(toFunctionSelector("isAllowed(address)"))).toBe(true);
  });

  it("would reach the token via Multicall3 without the account, which is why the owner must be passed", async () => {
    const calls: EthCall[] = [];
    await readContract(configRecording(calls), {
      abi: henkakuTokenAbi,
      address: TOKEN,
      functionName: "balanceOf",
      args: [USER],
      chainId: polygon.id,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].to?.toLowerCase()).toBe(MULTICALL3.toLowerCase());
    expect(calls[0].from).toBeUndefined();
  });
});
