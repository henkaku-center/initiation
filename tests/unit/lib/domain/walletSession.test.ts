// ABOUTME: ウォレットのずれ判定を検証する。
// ABOUTME: 有効なセッションを誤って破棄しないガード2つを固定する。
import { describe, expect, it } from "vitest";
import { normalizeAddress } from "@/lib/domain/address";
import {
  shouldDiscardSession,
  shouldDiscardSessionForChain,
  signInBlockedByChain,
} from "@/lib/domain/walletSession";

const SIGNED_IN = normalizeAddress("0x1111111111111111111111111111111111111111");
const OTHER = "0x2222222222222222222222222222222222222222";

describe("shouldDiscardSession", () => {
  it("discards when the connected wallet is a different account", () => {
    expect(shouldDiscardSession({ signedInAs: SIGNED_IN, connectedAddress: OTHER })).toBe(true);
  });

  it("keeps the session when the connected wallet is checksummed", () => {
    // wagmi はチェックサム表記で返す。揃えずに比較すると常に不一致になり、
    // サインインした直後にサインアウトされる。
    const checksummed = "0xAbCd567890123456789012345678901234567890";
    expect(
      shouldDiscardSession({
        signedInAs: normalizeAddress(checksummed),
        connectedAddress: checksummed,
      }),
    ).toBe(false);
  });

  it("keeps the session while the wallet is not connected", () => {
    // wagmi の再接続が終わるまで address は undefined を通る。ここで破棄すると
    // 有効なセッションを消してしまう。
    expect(shouldDiscardSession({ signedInAs: SIGNED_IN, connectedAddress: undefined })).toBe(false);
  });

  it("does nothing when there is no session to discard", () => {
    expect(shouldDiscardSession({ signedInAs: null, connectedAddress: OTHER })).toBe(false);
  });
});

describe("shouldDiscardSessionForChain", () => {
  const POLYGON = 137;

  it("discards when the signed-in wallet is connected to another chain", () => {
    // /setup の案内どおり 02 で署名すると、Polygon 以外に接続したままセッションが
    // 発行され、直後に破棄される(Issue #67)。破棄そのものは #44 の決定どおり。
    expect(
      shouldDiscardSessionForChain({
        signedInAs: SIGNED_IN,
        connectedAddress: SIGNED_IN,
        connectedChainId: 1,
        requiredChainId: POLYGON,
      }),
    ).toBe(true);
  });

  it("keeps the session while on the required chain", () => {
    expect(
      shouldDiscardSessionForChain({
        signedInAs: SIGNED_IN,
        connectedAddress: SIGNED_IN,
        connectedChainId: POLYGON,
        requiredChainId: POLYGON,
      }),
    ).toBe(false);
  });

  it("leaves another account's mismatch to the account guard", () => {
    // アカウントのずれは SessionStatus 側が全ページで見る。両方で見ると
    // /setup を開いている間だけ logout が二重に飛ぶ(#44 の決定)。
    expect(
      shouldDiscardSessionForChain({
        signedInAs: SIGNED_IN,
        connectedAddress: OTHER,
        connectedChainId: 1,
        requiredChainId: POLYGON,
      }),
    ).toBe(false);
  });

  it("keeps the session while the wallet is not connected", () => {
    expect(
      shouldDiscardSessionForChain({
        signedInAs: SIGNED_IN,
        connectedAddress: undefined,
        connectedChainId: undefined,
        requiredChainId: POLYGON,
      }),
    ).toBe(false);
  });

  it("does nothing when there is no session to discard", () => {
    expect(
      shouldDiscardSessionForChain({
        signedInAs: null,
        connectedAddress: SIGNED_IN,
        connectedChainId: 1,
        requiredChainId: POLYGON,
      }),
    ).toBe(false);
  });

  it("waits for the chain id before discarding a matching session", () => {
    // wagmi は接続直後 chainId が undefined を通る。ここで破棄すると、
    // Polygon にいる人のセッションまで消える。
    expect(
      shouldDiscardSessionForChain({
        signedInAs: SIGNED_IN,
        connectedAddress: SIGNED_IN,
        connectedChainId: undefined,
        requiredChainId: POLYGON,
      }),
    ).toBe(false);
  });
});

describe("signInBlockedByChain", () => {
  const POLYGON = 137;

  it("blocks sign-in while connected to another chain", () => {
    expect(signInBlockedByChain({ connectedChainId: 1, requiredChainId: POLYGON })).toBe(true);
  });

  it("does not block on the required chain", () => {
    expect(signInBlockedByChain({ connectedChainId: POLYGON, requiredChainId: POLYGON })).toBe(false);
  });

  it("says nothing until the chain id is known", () => {
    expect(signInBlockedByChain({ connectedChainId: undefined, requiredChainId: POLYGON })).toBe(false);
  });
});
