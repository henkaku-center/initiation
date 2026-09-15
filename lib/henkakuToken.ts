// ABOUTME: HENKAKU トークン(ERC20 / Polygon)の設定値。env から読み、利用前に検証する。
// ABOUTME: コントラクトアドレスや表示情報をコードにハードコードしない。
import { isAddress } from "viem";

export type HenkakuTokenConfig = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  image?: string;
};

export function henkakuTokenConfig(): HenkakuTokenConfig {
  const address = process.env.NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS;
  if (!address) throw new Error("NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS is required");
  if (!isAddress(address)) throw new Error(`invalid token address: ${address}`);

  const symbol = process.env.NEXT_PUBLIC_HENKAKU_TOKEN_SYMBOL ?? "HENKAKU";
  if (!symbol.trim()) throw new Error("HENKAKU token symbol must not be empty");

  const decimals = Number(process.env.NEXT_PUBLIC_HENKAKU_TOKEN_DECIMALS ?? "18");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new Error(`invalid token decimals: ${decimals}`);
  }

  return {
    address: address as `0x${string}`,
    symbol,
    decimals,
    image: process.env.NEXT_PUBLIC_HENKAKU_TOKEN_LOGO_URL || undefined,
  };
}

/**
 * 画面から読む関数だけを持つ最小ABI(henkaku-v2 `HenkakuToken.sol`)。
 * `isAllowed` は `onlyOwner` の view 関数で、`eth_call` の `from` に `owner()` を
 * 指定して読む(docs/decisions/2026-09-13-wallet-status-readings.md)。
 */
export const henkakuTokenAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "isAllowed",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
