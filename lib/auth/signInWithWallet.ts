// ABOUTME: Run the existing nonce, SIWE signing and server verification sequence.
// ABOUTME: Check wallet identity across asynchronous steps before accepting a session.
import { SiweMessage } from "siwe";

export type SignInPhase = "nonce" | "signing" | "verifying";

function refused(cause: unknown): boolean {
  if (!cause || typeof cause !== "object") return false;
  const error = cause as { code?: number; name?: string; cause?: unknown };
  return error.code === 4001 || error.name === "UserRejectedRequestError" || refused(error.cause);
}

export async function signInWithWallet({ address, origin, isCurrent, signMessage, refreshSession, signOut, onPhase }: {
  address: string;
  origin: string;
  isCurrent: () => boolean;
  signMessage: (input: { message: string }) => Promise<string>;
  refreshSession: () => Promise<{ address: string } | null>;
  signOut: () => Promise<void>;
  onPhase: (phase: SignInPhase) => void;
}): Promise<void> {
  const checkWallet = () => {
    if (!isCurrent()) throw new Error("ウォレットが変更されました。接続中のアカウントでやり直してください。");
  };
  checkWallet();
  onPhase("nonce");
  const nonceResponse = await fetch("/api/auth/nonce", { cache: "no-store" });
  if (!nonceResponse.ok) throw new Error("認証の準備に失敗しました。もう一度お試しください。");
  const { nonce } = await nonceResponse.json();
  checkWallet();
  const message = new SiweMessage({
    domain: new URL(origin).host, address, statement: "Sign in to HENKAKU Initiation",
    uri: origin, version: "1", chainId: 137, nonce,
    expirationTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  }).prepareMessage();
  onPhase("signing");
  let signature: string;
  try {
    signature = await signMessage({ message });
  } catch (cause) {
    if (refused(cause)) throw new Error("署名が拒否されました。準備ができたらもう一度お試しください。");
    throw new Error("署名を取得できませんでした。ウォレットを確認してください。");
  }
  checkWallet();
  onPhase("verifying");
  try {
    const response = await fetch("/api/auth/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });
    checkWallet();
    if (!response.ok) throw new Error("認証に失敗しました。もう一度署名してください。");
    const session = await refreshSession();
    checkWallet();
    if (session?.address.toLowerCase() !== address.toLowerCase()) {
      await signOut();
      throw new Error("サインイン状態を確認できませんでした。もう一度お試しください。");
    }
  } catch (error) {
    // Verification may have already issued a cookie after the wallet changed.
    if (!isCurrent()) await signOut();
    throw error;
  }
}
