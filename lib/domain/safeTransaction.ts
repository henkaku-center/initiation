// ABOUTME: Safeの取引が、申請のその工程で行うべき操作と一致し、成功して確定したかを判定する純粋関数(Issue #137)。
// ABOUTME: 外部の取得は行わない。照合できない取引を完了の根拠にしないため、一致しない点をすべて返す。
import { encodeFunctionData, isAddress, isAddressEqual, isHex, parseUnits, toEventSelector } from "viem";
import { SAFE_OPERATIONS } from "./safeHandoff";

export type SafeStep = "allowlist" | "distribution";
/** 運用入力の形。テストでは数量などを差し替えて実データと照合する。 */
export type SafeOperations = {
  [K in keyof typeof SAFE_OPERATIONS]: (typeof SAFE_OPERATIONS)[K] extends number ? number : string;
};

const TOKEN_DECIMALS = 18;
const SAFE_APP_HOST = "app.safe.global";
const SAFE_TX_PATH = "/transactions/tx";
const MULTISIG_ID = /^multisig_(0x[0-9a-fA-F]{40})_(0x[0-9a-fA-F]{64})$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;

const tokenWriteAbi = [
  {
    type: "function",
    name: "addWhitelistUser",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/** Safe v1.3.0 が実行結果として出すイベント。正式な2つのSafeはどちらも 1.3.0+L2。 */
export const EXECUTION_SUCCESS_TOPIC = toEventSelector("ExecutionSuccess(bytes32,uint256)");
export const EXECUTION_FAILURE_TOPIC = toEventSelector("ExecutionFailure(bytes32,uint256)");
const TRANSFER_TOPIC = toEventSelector("Transfer(address,address,uint256)");

function stepSafe(step: SafeStep, operations: SafeOperations): string {
  return step === "allowlist" ? operations.allowlistSafe : operations.distributionSafe;
}

function sameAddress(a: string, b: string): boolean {
  return isAddress(a, { strict: false }) && isAddress(b, { strict: false }) && isAddressEqual(a, b);
}

export type SafeTxUrlError =
  | "not_url"
  | "not_safe_app"
  | "not_transaction_link"
  | "wrong_network"
  | "wrong_safe"
  | "bad_id";

/**
 * Safe Walletの取引詳細URLから、Safeの提案ID(safeTxHash)を取り出す。
 * その工程の正式なSafeの、Polygon上の取引を指すリンクだけを受け付ける。
 * 形式: https://app.safe.global/transactions/tx?safe=matic:<Safe>&id=multisig_<Safe>_<safeTxHash>
 */
export function parseSafeTxUrl(
  input: string,
  step: SafeStep,
  operations: SafeOperations = SAFE_OPERATIONS,
): { ok: true; safeTxHash: `0x${string}` } | { ok: false; error: SafeTxUrlError } {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, error: "not_url" };
  }
  if (url.protocol !== "https:" || url.host !== SAFE_APP_HOST) return { ok: false, error: "not_safe_app" };
  if (url.pathname.replace(/\/$/, "") !== SAFE_TX_PATH) return { ok: false, error: "not_transaction_link" };

  const [prefix, safe = ""] = (url.searchParams.get("safe") ?? "").split(":");
  if (prefix !== operations.safeChainPrefix) return { ok: false, error: "wrong_network" };
  if (!sameAddress(safe, stepSafe(step, operations))) return { ok: false, error: "wrong_safe" };

  const id = (url.searchParams.get("id") ?? "").match(MULTISIG_ID);
  if (!id || !sameAddress(id[1], safe)) return { ok: false, error: "bad_id" };
  return { ok: true, safeTxHash: id[2].toLowerCase() as `0x${string}` };
}

/** Safe Transaction Serviceの応答のうち、照合に使う項目。 */
export type SafeServiceTx = {
  safe: string;
  to: string;
  value: string;
  data: string | null;
  /** 0 は通常の呼び出し、1 は delegatecall。 */
  operation: number;
  nonce: number;
  safeTxHash: string;
  transactionHash: string | null;
  blockNumber: number | null;
  isExecuted: boolean;
  isSuccessful: boolean | null;
  confirmationsRequired: number;
  confirmationCount: number;
};

/** 外部の応答を検証して照合用の形へ写す。期待した形でなければ null(取得できなかった扱いにする)。 */
export function toSafeServiceTx(raw: unknown): SafeServiceTx | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const nonce = typeof r.nonce === "number" ? r.nonce : typeof r.nonce === "string" && /^\d+$/.test(r.nonce) ? Number(r.nonce) : NaN;
  const valid =
    typeof r.safe === "string" && isAddress(r.safe, { strict: false }) &&
    typeof r.to === "string" && isAddress(r.to, { strict: false }) &&
    typeof r.value === "string" && /^\d+$/.test(r.value) &&
    (r.data === null || (typeof r.data === "string" && isHex(r.data))) &&
    (r.operation === 0 || r.operation === 1) &&
    Number.isSafeInteger(nonce) &&
    typeof r.safeTxHash === "string" && HASH.test(r.safeTxHash) &&
    (r.transactionHash === null || (typeof r.transactionHash === "string" && HASH.test(r.transactionHash))) &&
    (r.blockNumber === null || (typeof r.blockNumber === "number" && Number.isSafeInteger(r.blockNumber))) &&
    typeof r.isExecuted === "boolean" &&
    (r.isSuccessful === null || typeof r.isSuccessful === "boolean") &&
    typeof r.confirmationsRequired === "number" &&
    (r.confirmations === null || Array.isArray(r.confirmations));
  if (!valid) return null;
  return {
    safe: r.safe as string,
    to: r.to as string,
    value: r.value as string,
    data: r.data as string | null,
    operation: r.operation as number,
    nonce,
    safeTxHash: r.safeTxHash as string,
    transactionHash: r.transactionHash as string | null,
    blockNumber: r.blockNumber as number | null,
    isExecuted: r.isExecuted as boolean,
    isSuccessful: r.isSuccessful as boolean | null,
    confirmationsRequired: r.confirmationsRequired as number,
    confirmationCount: Array.isArray(r.confirmations) ? r.confirmations.length : 0,
  };
}

function distributionAmount(operations: SafeOperations): bigint {
  return parseUnits(operations.distributionAmount, TOKEN_DECIMALS);
}

/** その工程でSafeから行うべき呼び出し。受け渡しの表示と同じ運用入力から組み立てる。 */
export function expectedSafeCall(
  step: SafeStep,
  applicant: string,
  operations: SafeOperations = SAFE_OPERATIONS,
): { safe: string; to: string; data: `0x${string}` } {
  if (!isAddress(applicant, { strict: false })) throw new Error(`invalid applicant address: ${applicant}`);
  const data =
    step === "allowlist"
      ? encodeFunctionData({ abi: tokenWriteAbi, functionName: "addWhitelistUser", args: [applicant] })
      : encodeFunctionData({ abi: tokenWriteAbi, functionName: "transfer", args: [applicant, distributionAmount(operations)] });
  return { safe: stepSafe(step, operations), to: operations.tokenAddress, data };
}

export type ProposalField = "safeTxHash" | "safe" | "to" | "value" | "operation" | "data";

/**
 * 取引の内容が申請のその工程と一致しない点を返す。空なら一致。実行前の提案にも使える。
 * 操作内容はサービスが解釈した結果ではなく、calldataを全バイトで比べる。
 */
export function proposalMismatches(input: {
  step: SafeStep;
  applicant: string;
  tx: SafeServiceTx;
  /** 紐付けに使った提案ID。応答が別の取引のものでないことを確かめる。 */
  safeTxHash: string;
  operations?: SafeOperations;
}): ProposalField[] {
  const { tx } = input;
  const expected = expectedSafeCall(input.step, input.applicant, input.operations);
  const mismatches: ProposalField[] = [];
  if (tx.safeTxHash.toLowerCase() !== input.safeTxHash.toLowerCase()) mismatches.push("safeTxHash");
  if (!sameAddress(tx.safe, expected.safe)) mismatches.push("safe");
  if (!sameAddress(tx.to, expected.to)) mismatches.push("to");
  if (tx.value !== "0") mismatches.push("value");
  if (tx.operation !== 0) mismatches.push("operation");
  if (tx.data?.toLowerCase() !== expected.data.toLowerCase()) mismatches.push("data");
  return mismatches;
}

export type SafeTxPhase =
  | "awaiting_confirmations"
  | "awaiting_execution"
  | "executed"
  | "failed"
  | "replacement_unconfirmed"
  | "replaced"
  | "unknown";

/** サービスが実行済みと返した取引と、その `transactionHash` のレシート。レシートを取得できなければ null。 */
export type ExecutedSafeTx = { tx: SafeServiceTx; receipt: SafeReceipt | null };

/** Safeのnonceと、取消・置換を確定させるための根拠。 */
export type SafeNonceEvidence = {
  /** Safeの現在のnonce。 */
  safeNonce: number;
  /** 同じSafe・同じnonceで実行済みとしてサービスが返した取引。取得していない・できなかった場合は null。 */
  executedAtNonce: readonly ExecutedSafeTx[] | null;
  /** `finalized` のブロック番号。取得できなければ null。 */
  finalizedBlock: bigint | null;
};

/**
 * サービスの応答から取引の段階を決める。`executed` はSafe内部の処理が成功したという
 * サービス側の報告で、完了の確定には verifyExecution でのオンチェーン確認が要る。
 *
 * 未実行のまま Safe の nonce が先へ進んでいても、それだけでは `replaced` にしない。
 * 元の提案自体が実行され、その結果がまだ応答に反映されていないだけの場合があり、
 * ここで新しい提案を案内すると同じ操作を二重に実行させてしまう。同じSafe・同じnonceで
 * 別の safeTxHash の実行が確定したときだけ `replaced` とし、それまでは `replacement_unconfirmed` に留める。
 * 置換先の実行はサービスの報告だけで信用せず、そのSafeが出した実行結果のイベントをレシートで確かめる。
 */
export function safeTxPhase(tx: SafeServiceTx, evidence: SafeNonceEvidence): SafeTxPhase {
  if (tx.isExecuted) {
    if (tx.isSuccessful === true) return "executed";
    if (tx.isSuccessful === false) return "failed";
    return "unknown";
  }
  if (tx.nonce >= evidence.safeNonce) {
    return tx.confirmationCount >= tx.confirmationsRequired ? "awaiting_execution" : "awaiting_confirmations";
  }

  const executed = (evidence.executedAtNonce ?? []).filter(
    ({ tx: other }) => sameAddress(other.safe, tx.safe) && other.nonce === tx.nonce && other.isExecuted,
  );
  // 元の提案が実行済みと返っているなら、レシートの有無にかかわらず置換にしない。
  if (executed.some(({ tx: other }) => sameHash(other.safeTxHash, tx.safeTxHash))) return "replacement_unconfirmed";

  const { finalizedBlock } = evidence;
  const replacedByFinalized = executed.some(
    ({ tx: other, receipt }) =>
      other.transactionHash !== null &&
      other.blockNumber !== null &&
      receipt !== null &&
      receipt.status === "success" &&
      receipt.blockNumber === BigInt(other.blockNumber) &&
      // Safe内部で失敗していても nonce は消費されるため、成功・失敗のどちらのイベントでもよい。
      receipt.logs.some((log) => isSafeExecutionLog(log, tx.safe) && sameHash(executionEventHash(log), other.safeTxHash)) &&
      finalizedBlock !== null &&
      receipt.blockNumber <= finalizedBlock,
  );
  return replacedByFinalized ? "replaced" : "replacement_unconfirmed";
}

export type SafeReceiptLog = { address: string; topics: readonly string[]; data: string };
export type SafeReceipt = { status: "success" | "reverted"; blockNumber: bigint; logs: readonly SafeReceiptLog[] };

export type ExecutionProblem =
  | "not_executed"
  | "receipt_failed"
  | "block_mismatch"
  | "no_execution_success"
  | "transfer_missing"
  | "not_allowed"
  | "not_finalized";

/** Safeが出した実行結果のイベントが指す提案ID。1.3.0はdataの先頭、1.4.1以降はindexed。 */
function executionEventHash(log: SafeReceiptLog): string {
  return (log.topics[1] ?? log.data.slice(0, 66)).toLowerCase();
}

function sameHash(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** そのSafeが出した、Safe取引の実行結果(成功・失敗)のイベントか。 */
function isSafeExecutionLog(log: SafeReceiptLog, safe: string): boolean {
  return (
    sameAddress(log.address, safe) &&
    (log.topics[0] === EXECUTION_SUCCESS_TOPIC || log.topics[0] === EXECUTION_FAILURE_TOPIC)
  );
}

function topicAddress(topic: string | undefined): string {
  return topic ? `0x${topic.slice(-40)}` : "";
}

/**
 * 実行結果をPolygonのレシートで確かめる。空なら、完了として反映してよい。
 * `not_finalized` だけが返った場合は、確定を待って再取得すれば通る。
 * 取引の内容の一致(proposalMismatches)は別に確かめること。
 */
export function verifyExecution(input: {
  step: SafeStep;
  applicant: string;
  tx: SafeServiceTx;
  receipt: SafeReceipt;
  /** `finalized` のブロック番号。取得できなければ null。 */
  finalizedBlock: bigint | null;
  /** Allowlistの工程で読んだ isAllowed(申請者)。読めなければ null。 */
  allowed?: boolean | null;
  operations?: SafeOperations;
}): ExecutionProblem[] {
  const { tx, receipt } = input;
  const operations = input.operations ?? SAFE_OPERATIONS;
  if (!tx.isExecuted || tx.isSuccessful !== true || tx.blockNumber === null) return ["not_executed"];

  const problems: ExecutionProblem[] = [];
  if (receipt.status !== "success") problems.push("receipt_failed");
  if (receipt.blockNumber !== BigInt(tx.blockNumber)) problems.push("block_mismatch");

  // 外側のトランザクションが成功していてもSafe内部の処理は失敗しうるため、
  // このSafeが、この提案IDについて出した ExecutionSuccess を探す。
  const safe = stepSafe(input.step, operations);
  const successIndex = receipt.logs.findIndex(
    (log) =>
      isSafeExecutionLog(log, safe) &&
      log.topics[0] === EXECUTION_SUCCESS_TOPIC &&
      sameHash(executionEventHash(log), tx.safeTxHash),
  );
  if (successIndex < 0) {
    problems.push("no_execution_success");
  } else if (input.step === "distribution") {
    // 1つのトランザクションで複数のSafe取引が実行されることがある。この提案が出した
    // Transfer だけを数えるため、直前のSafe取引の実行結果より後のログに限る。
    let start = successIndex - 1;
    while (start >= 0 && !isSafeExecutionLog(receipt.logs[start], safe)) start -= 1;
    const amount = distributionAmount(operations);
    const transferred = receipt.logs.slice(start + 1, successIndex).some(
      (log) =>
        sameAddress(log.address, operations.tokenAddress) &&
        log.topics[0] === TRANSFER_TOPIC &&
        sameAddress(topicAddress(log.topics[1]), safe) &&
        sameAddress(topicAddress(log.topics[2]), input.applicant) &&
        isHex(log.data) &&
        BigInt(log.data) === amount,
    );
    if (!transferred) problems.push("transfer_missing");
  }

  if (input.step === "allowlist" && input.allowed !== true) problems.push("not_allowed");
  if (input.finalizedBlock === null || receipt.blockNumber > input.finalizedBlock) problems.push("not_finalized");
  return problems;
}
