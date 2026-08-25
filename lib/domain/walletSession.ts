// ABOUTME: 署名したウォレットと操作中のウォレットのずれを判定する。
// ABOUTME: 画面から切り離して、比較と2つのガードだけをテストできる形にしている。
import type { Address } from "./types";

/**
 * 操作中のウォレットがサインイン済みのアドレスとずれていて、
 * サーバーのセッションを破棄すべきかどうか。
 *
 * `connectedAddress` は wagmi の `useAccount().address` をそのまま渡す。
 */
export function shouldDiscardSession({
  signedInAs,
  connectedAddress,
}: {
  signedInAs: Address | null;
  connectedAddress: string | undefined;
}): boolean {
  // 未サインインなら破棄するものがない。
  if (!signedInAs) return false;
  // ウォレット未接続では破棄しない。wagmi の再接続が終わるまでは address が
  // undefined を通るため、ここで破棄すると有効なセッションを消してしまう。
  if (!connectedAddress) return false;
  // セッション側は正規化済みの小文字、wagmi 側はチェックサム表記なので、
  // 揃えずに比較すると常に不一致になる(サインインした直後に破棄される)。
  return connectedAddress.toLowerCase() !== signedInAs;
}

/**
 * サインイン済みのウォレットが、必要なチェーン以外につながっていて
 * サーバーのセッションを破棄すべきかどうか。
 *
 * 見るのはチェーンのずれだけで、アカウントのずれは `shouldDiscardSession()` が
 * 全ページで見る。両方をここで見ると、`/setup` を開いている間だけ logout が
 * 二重に飛ぶ(Issue #44)。
 *
 * `connectedAddress` / `connectedChainId` は wagmi の `useAccount()` を
 * そのまま渡す。
 */
export function shouldDiscardSessionForChain({
  signedInAs,
  connectedAddress,
  connectedChainId,
  requiredChainId,
}: {
  signedInAs: Address | null;
  connectedAddress: string | undefined;
  connectedChainId: number | undefined;
  requiredChainId: number;
}): boolean {
  if (!signedInAs) return false;
  if (!connectedAddress) return false;
  // アカウントがずれているときは、チェーンを見ずにアカウント側の判定へ譲る。
  if (connectedAddress.toLowerCase() !== signedInAs) return false;
  // 接続直後は chainId が undefined を通る。ここで破棄すると、Polygon に
  // いる人の有効なセッションまで消える(address 側と同じ理由のガード)。
  if (connectedChainId === undefined) return false;
  return connectedChainId !== requiredChainId;
}

/**
 * 今つないでいるチェーンのままではサインインを完了できないかどうか。
 *
 * SIWE メッセージは `requiredChainId` を固定で載せるため署名とサーバー検証は
 * 通るが、直後に `shouldDiscardSessionForChain()` がセッションを破棄する。
 * 案内どおり署名した人が理由の分からないまま詰まらないよう、画面で説明する
 * ための判定(Issue #67)。
 */
export function signInBlockedByChain({
  connectedChainId,
  requiredChainId,
}: {
  connectedChainId: number | undefined;
  requiredChainId: number;
}): boolean {
  // 接続直後は undefined を通る。確定するまで警告は出さない。
  if (connectedChainId === undefined) return false;
  return connectedChainId !== requiredChainId;
}
