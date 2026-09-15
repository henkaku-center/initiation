// ABOUTME: wagmi v2 の共有設定。Polygon 単一チェーン + injected(MetaMask 基準)。
// ABOUTME: ウォレット操作で使うチェーンとトランスポートを一箇所に定義する。
import { createConfig, http } from "wagmi";
import { polygon } from "wagmi/chains";
import { injected } from "wagmi/connectors/injected";

export const wagmiConfig = createConfig({
  chains: [polygon],
  connectors: [injected()],
  // 未設定なら viem の既定RPC(polygon.drpc.org)。残高・Allowlistの読み取りにも使う(Issue #91)。
  transports: { [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || undefined) },
  // Persisted wallet state is restored after SSR hydration to keep the first HTML identical.
  ssr: true,
});
