// ABOUTME: Safeの取引を申請と照合する判定を、正式なSafeの実際の取引データで固定する(Issue #137)。
// ABOUTME: 照合できない取引を完了の根拠にしないことが目的なので、拒否する側のケースを厚くする。
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SAFE_OPERATIONS } from "@/lib/domain/safeHandoff";
import {
  EXECUTION_FAILURE_TOPIC,
  EXECUTION_SUCCESS_TOPIC,
  expectedSafeCall,
  parseSafeTxUrl,
  proposalMismatches,
  safeTxPhase,
  toSafeServiceTx,
  verifyExecution,
  type ExecutedSafeTx,
  type SafeReceipt,
  type SafeServiceTx,
} from "@/lib/domain/safeTransaction";

// 2026-11-26に Safe Transaction Service(Polygon)と polygon.drpc.org から取得した実データ。
const fixture = (name: string) => JSON.parse(readFileSync(`tests/support/fixtures/safe/${name}.json`, "utf8"));
const serviceTx = (raw: unknown): SafeServiceTx => {
  const tx = toSafeServiceTx(raw);
  if (!tx) throw new Error("fixture is not a Safe service transaction");
  return tx;
};
type RawReceipt = { transactionHash: string; status: string; blockNumber: string; logs: SafeReceipt["logs"] };
const toReceipt = (raw: RawReceipt): SafeReceipt => ({
  status: raw.status === "0x1" ? "success" : "reverted",
  blockNumber: BigInt(raw.blockNumber),
  logs: raw.logs,
});
const receipt = (name: string): SafeReceipt => toReceipt(fixture(name));

const ALLOWLIST_SAFE = SAFE_OPERATIONS.allowlistSafe;
const DISTRIBUTION_SAFE = SAFE_OPERATIONS.distributionSafe;
// Runbookの参考トランザクション 0x8b70…1fe9 でAllowlistへ追加されたアドレス。
const ALLOWLISTED = "0x8bC20c33DAB1AD9e51b6d94b79f150279319Db47";
const ALLOWLIST_SAFE_TX = "0xfd48a383b8021584acc34f3aeb296035b1f294a0c789eb6748dd1445365c8063";
// Runbookの参考トランザクション 0x7be6…1eaf7 の宛先。1つのトランザクションで6件のSafe取引が実行されている。
const RECIPIENT = "0xaD5a417910bb318B71E47816601CBCe078e98f72";
const FIFTY_SAFE_TX = "0x35fc373a5bc284832e216c61bef8bf60597975f7832249073145b8aa4148ad84";
// 実データの数量は10ではないため、数量だけ差し替えた運用入力で照合する。
const withAmount = (distributionAmount: string) => ({ ...SAFE_OPERATIONS, distributionAmount });

const allowlistTx = serviceTx(fixture("service-allowlist-executed"));
const batch: SafeServiceTx[] = fixture("service-distribution-batch").map(serviceTx);
const fiftyTx = batch.find((tx) => tx.safeTxHash === FIFTY_SAFE_TX)!;
const unexecuted: SafeServiceTx[] = fixture("service-allowlist-unexecuted").map(serviceTx);
// 上の未実行の取引と同じnonceで実行された取引。2026-11-27に `?nonce=<n>&executed=true` で取得した。
// レシートは同じ日に polygon.drpc.org から取得した。
const replacementReceipts: RawReceipt[] = fixture("receipts-allowlist-replacements");
const replacements: ExecutedSafeTx[] = fixture("service-allowlist-replacements")
  .map(serviceTx)
  .map((tx: SafeServiceTx) => ({
    tx,
    receipt: toReceipt(replacementReceipts.find((raw) => raw.transactionHash === tx.transactionHash)!),
  }));

describe("parseSafeTxUrl", () => {
  const url = (safe: string, hash: string, prefix = "matic") =>
    `https://app.safe.global/transactions/tx?safe=${prefix}:${safe}&id=multisig_${safe}_${hash}`;

  it("reads the Safe transaction hash from a transaction link of the step's Safe", () => {
    expect(parseSafeTxUrl(url(ALLOWLIST_SAFE, ALLOWLIST_SAFE_TX), "allowlist")).toEqual({
      ok: true,
      safeTxHash: ALLOWLIST_SAFE_TX,
    });
    expect(parseSafeTxUrl(`  ${url(DISTRIBUTION_SAFE, FIFTY_SAFE_TX)}  `, "distribution")).toEqual({
      ok: true,
      safeTxHash: FIFTY_SAFE_TX,
    });
  });

  it("accepts a lowercase Safe address", () => {
    const result = parseSafeTxUrl(url(ALLOWLIST_SAFE.toLowerCase(), ALLOWLIST_SAFE_TX), "allowlist");
    expect(result).toEqual({ ok: true, safeTxHash: ALLOWLIST_SAFE_TX });
  });

  it("rejects text that is not a Safe transaction link", () => {
    expect(parseSafeTxUrl("", "allowlist")).toEqual({ ok: false, error: "not_url" });
    expect(parseSafeTxUrl(ALLOWLIST_SAFE_TX, "allowlist")).toEqual({ ok: false, error: "not_url" });
    expect(parseSafeTxUrl(`https://app.safe.global/home?safe=matic:${ALLOWLIST_SAFE}`, "allowlist")).toEqual({
      ok: false,
      error: "not_transaction_link",
    });
  });

  it("rejects a look-alike host", () => {
    const fake = url(ALLOWLIST_SAFE, ALLOWLIST_SAFE_TX).replace("app.safe.global", "app.safe.global.example.com");
    expect(parseSafeTxUrl(fake, "allowlist")).toEqual({ ok: false, error: "not_safe_app" });
    const http = url(ALLOWLIST_SAFE, ALLOWLIST_SAFE_TX).replace("https://", "http://");
    expect(parseSafeTxUrl(http, "allowlist")).toEqual({ ok: false, error: "not_safe_app" });
  });

  it("rejects another network", () => {
    expect(parseSafeTxUrl(url(ALLOWLIST_SAFE, ALLOWLIST_SAFE_TX, "eth"), "allowlist")).toEqual({
      ok: false,
      error: "wrong_network",
    });
  });

  it("rejects the other step's Safe and any unknown Safe", () => {
    expect(parseSafeTxUrl(url(DISTRIBUTION_SAFE, FIFTY_SAFE_TX), "allowlist")).toEqual({ ok: false, error: "wrong_safe" });
    expect(parseSafeTxUrl(url(ALLOWLIST_SAFE, ALLOWLIST_SAFE_TX), "distribution")).toEqual({ ok: false, error: "wrong_safe" });
    expect(parseSafeTxUrl(url(RECIPIENT, ALLOWLIST_SAFE_TX), "allowlist")).toEqual({ ok: false, error: "wrong_safe" });
  });

  it("rejects an id that does not name a transaction of the same Safe", () => {
    const base = `https://app.safe.global/transactions/tx?safe=matic:${ALLOWLIST_SAFE}`;
    expect(parseSafeTxUrl(base, "allowlist")).toEqual({ ok: false, error: "bad_id" });
    expect(parseSafeTxUrl(`${base}&id=multisig_${ALLOWLIST_SAFE}_0x1234`, "allowlist")).toEqual({ ok: false, error: "bad_id" });
    expect(parseSafeTxUrl(`${base}&id=multisig_${DISTRIBUTION_SAFE}_${ALLOWLIST_SAFE_TX}`, "allowlist")).toEqual({
      ok: false,
      error: "bad_id",
    });
    expect(parseSafeTxUrl(`${base}&id=module_${ALLOWLIST_SAFE}_${ALLOWLIST_SAFE_TX}`, "allowlist")).toEqual({
      ok: false,
      error: "bad_id",
    });
  });
});

describe("toSafeServiceTx", () => {
  it("reads the fields used for matching from a service response", () => {
    expect(allowlistTx).toMatchObject({
      safe: ALLOWLIST_SAFE,
      to: SAFE_OPERATIONS.tokenAddress,
      value: "0",
      operation: 0,
      nonce: 380,
      safeTxHash: ALLOWLIST_SAFE_TX,
      transactionHash: "0x8b70c61edd3e4aa49f2ffd751c7aad86ca34303301256087dbeed4cc2ccd1fe9",
      blockNumber: 86472877,
      isExecuted: true,
      isSuccessful: true,
      confirmationsRequired: 2,
    });
  });

  it("returns null for a response without the expected shape", () => {
    expect(toSafeServiceTx(null)).toBeNull();
    expect(toSafeServiceTx({ detail: "No MultisigTransaction matches the given query." })).toBeNull();
    expect(toSafeServiceTx({ ...fixture("service-allowlist-executed"), operation: "0" })).toBeNull();
    expect(toSafeServiceTx({ ...fixture("service-allowlist-executed"), nonce: "abc" })).toBeNull();
  });
});

describe("expectedSafeCall", () => {
  it("builds the calldata the real allowlist transaction used", () => {
    expect(expectedSafeCall("allowlist", ALLOWLISTED)).toEqual({
      safe: ALLOWLIST_SAFE,
      to: SAFE_OPERATIONS.tokenAddress,
      data: allowlistTx.data,
    });
  });

  it("builds the calldata a real distribution used, in token units", () => {
    expect(expectedSafeCall("distribution", RECIPIENT, withAmount("50"))).toEqual({
      safe: DISTRIBUTION_SAFE,
      to: SAFE_OPERATIONS.tokenAddress,
      data: fiftyTx.data,
    });
  });

  it("asks for 10 HENKAKU in the smallest unit by default", () => {
    const { data } = expectedSafeCall("distribution", RECIPIENT);
    expect(BigInt(`0x${data.slice(-64)}`)).toBe(BigInt("10000000000000000000"));
  });
});

describe("proposalMismatches", () => {
  it("accepts the real allowlist transaction for the address it added", () => {
    expect(proposalMismatches({ step: "allowlist", applicant: ALLOWLISTED, tx: allowlistTx, safeTxHash: ALLOWLIST_SAFE_TX })).toEqual([]);
  });

  it("accepts a real distribution for its recipient and amount", () => {
    expect(
      proposalMismatches({ step: "distribution", applicant: RECIPIENT, tx: fiftyTx, safeTxHash: FIFTY_SAFE_TX, operations: withAmount("50") }),
    ).toEqual([]);
  });

  it("rejects a transaction for another applicant", () => {
    expect(proposalMismatches({ step: "allowlist", applicant: RECIPIENT, tx: allowlistTx, safeTxHash: ALLOWLIST_SAFE_TX })).toEqual(["data"]);
  });

  it("rejects a distribution of another amount", () => {
    expect(proposalMismatches({ step: "distribution", applicant: RECIPIENT, tx: fiftyTx, safeTxHash: FIFTY_SAFE_TX })).toEqual(["data"]);
  });

  it("rejects an allowlist transaction offered as a distribution and vice versa", () => {
    expect(proposalMismatches({ step: "distribution", applicant: ALLOWLISTED, tx: allowlistTx, safeTxHash: ALLOWLIST_SAFE_TX })).toEqual(
      expect.arrayContaining(["safe", "data"]),
    );
    expect(
      proposalMismatches({ step: "allowlist", applicant: RECIPIENT, tx: fiftyTx, safeTxHash: FIFTY_SAFE_TX }),
    ).toEqual(expect.arrayContaining(["safe", "data"]));
  });

  it("rejects a response for a different Safe transaction than the linked one", () => {
    expect(proposalMismatches({ step: "allowlist", applicant: ALLOWLISTED, tx: allowlistTx, safeTxHash: FIFTY_SAFE_TX })).toEqual(["safeTxHash"]);
  });

  it("rejects delegatecall, attached value, and another target contract", () => {
    const base = { step: "allowlist" as const, applicant: ALLOWLISTED, safeTxHash: ALLOWLIST_SAFE_TX };
    expect(proposalMismatches({ ...base, tx: { ...allowlistTx, operation: 1 } })).toEqual(["operation"]);
    expect(proposalMismatches({ ...base, tx: { ...allowlistTx, value: "1" } })).toEqual(["value"]);
    expect(proposalMismatches({ ...base, tx: { ...allowlistTx, to: RECIPIENT } })).toEqual(["to"]);
    expect(proposalMismatches({ ...base, tx: { ...allowlistTx, data: null } })).toEqual(["data"]);
  });

  it("rejects calldata with trailing bytes", () => {
    const tx = { ...allowlistTx, data: `${allowlistTx.data}00` };
    expect(proposalMismatches({ step: "allowlist", applicant: ALLOWLISTED, tx, safeTxHash: ALLOWLIST_SAFE_TX })).toEqual(["data"]);
  });
});

describe("safeTxPhase", () => {
  // Safeの現在のnonceが381で、同じnonceの実行済み取引をまだ取得していない状態。
  const at381 = { safeNonce: 381, executedAtNonce: null, finalizedBlock: null };

  it("reports a successful execution", () => {
    expect(safeTxPhase(allowlistTx, at381)).toBe("executed");
  });

  it("reports a failed Safe-internal execution separately", () => {
    expect(safeTxPhase({ ...allowlistTx, isSuccessful: false }, at381)).toBe("failed");
  });

  it("does not guess when the service marks an execution without a result", () => {
    expect(safeTxPhase({ ...allowlistTx, isSuccessful: null }, at381)).toBe("unknown");
  });

  it("separates waiting for signatures from waiting for execution", () => {
    const pending = { ...allowlistTx, isExecuted: false, isSuccessful: null, transactionHash: null, blockNumber: null, nonce: 381 };
    expect(safeTxPhase({ ...pending, confirmationCount: 1 }, at381)).toBe("awaiting_confirmations");
    expect(safeTxPhase({ ...pending, confirmationCount: 2 }, at381)).toBe("awaiting_execution");
    expect(safeTxPhase({ ...pending, confirmationCount: 2, nonce: 385 }, at381)).toBe("awaiting_execution");
  });

  describe("when the Safe's nonce has moved past an unexecuted transaction", () => {
    // Allowlist用Safeに残っている未実行の取引(nonce 282・284・287)と、同じnonceで実際に実行された取引。
    const replacementOf = (tx: SafeServiceTx) => replacements.filter((other) => other.tx.nonce === tx.nonce);
    const FINALIZED = BigInt(86472877);
    const allowlistExecuted: ExecutedSafeTx = { tx: allowlistTx, receipt: receipt("receipt-allowlist") };

    it("uses real pairs of an unexecuted transaction and the one executed at its nonce", () => {
      expect(unexecuted.length).toBeGreaterThan(0);
      for (const tx of unexecuted) {
        expect(tx.isExecuted).toBe(false);
        const [replacement, ...rest] = replacementOf(tx);
        expect(rest).toEqual([]);
        expect(replacement.tx.isExecuted).toBe(true);
        expect(replacement.tx.safeTxHash).not.toBe(tx.safeTxHash);
      }
    });

    it("reports replaced once another Safe transaction at the same nonce is executed and finalized", () => {
      for (const tx of unexecuted) {
        expect(safeTxPhase(tx, { safeNonce: 381, executedAtNonce: replacementOf(tx), finalizedBlock: FINALIZED })).toBe("replaced");
      }
    });

    it("does not report replaced from the nonce alone", () => {
      // 元の提案自体が実行されてnonceが進み、サービスの応答にまだ実行結果が反映されていない場合がある。
      // ここで置換と判定すると新しい提案を案内し、同じ操作を二重に実行させてしまう。
      for (const tx of unexecuted) {
        expect(safeTxPhase(tx, { safeNonce: 381, executedAtNonce: null, finalizedBlock: FINALIZED })).toBe("replacement_unconfirmed");
        expect(safeTxPhase(tx, { safeNonce: 381, executedAtNonce: [], finalizedBlock: FINALIZED })).toBe("replacement_unconfirmed");
      }
    });

    it("keeps checking when the transaction executed at that nonce is the original itself", () => {
      const stale = { ...allowlistTx, isExecuted: false, isSuccessful: null, transactionHash: null, blockNumber: null };
      expect(safeTxPhase(stale, { safeNonce: 381, executedAtNonce: [allowlistExecuted], finalizedBlock: FINALIZED })).toBe(
        "replacement_unconfirmed",
      );
      // 同じnonceに別の取引が並んでいても、元の提案の実行が見えている限り置換とは判定しない。
      const otherHash = `0x${"ab".repeat(32)}`;
      const other: ExecutedSafeTx = {
        tx: { ...allowlistTx, safeTxHash: otherHash },
        receipt: {
          ...allowlistExecuted.receipt!,
          logs: [{ address: ALLOWLIST_SAFE, topics: [EXECUTION_SUCCESS_TOPIC], data: `${otherHash}${"0".repeat(64)}` }],
        },
      };
      expect(safeTxPhase(stale, { safeNonce: 381, executedAtNonce: [other], finalizedBlock: FINALIZED })).toBe("replaced");
      expect(safeTxPhase(stale, { safeNonce: 381, executedAtNonce: [other, allowlistExecuted], finalizedBlock: FINALIZED })).toBe(
        "replacement_unconfirmed",
      );
      // レシートを取得できていなくても、サービスが元の提案を実行済みと返していれば置換にしない。
      expect(
        safeTxPhase(stale, { safeNonce: 381, executedAtNonce: [other, { tx: allowlistTx, receipt: null }], finalizedBlock: FINALIZED }),
      ).toBe("replacement_unconfirmed");
    });

    it("waits until the replacing execution is finalized", () => {
      const [tx] = unexecuted;
      const [replacement] = replacementOf(tx);
      const evidence = { safeNonce: 381, executedAtNonce: [replacement] };
      expect(safeTxPhase(tx, { ...evidence, finalizedBlock: null })).toBe("replacement_unconfirmed");
      expect(safeTxPhase(tx, { ...evidence, finalizedBlock: replacement.receipt!.blockNumber - BigInt(1) })).toBe(
        "replacement_unconfirmed",
      );
      expect(safeTxPhase(tx, { ...evidence, finalizedBlock: replacement.receipt!.blockNumber })).toBe("replaced");
    });

    it("ignores transactions that do not prove an execution at the same Safe and nonce", () => {
      const [tx] = unexecuted;
      const [replacement] = replacementOf(tx);
      const phase = (other: SafeServiceTx) =>
        safeTxPhase(tx, { safeNonce: 381, executedAtNonce: [{ ...replacement, tx: other }], finalizedBlock: FINALIZED });
      expect(phase({ ...replacement.tx, nonce: tx.nonce + 1 })).toBe("replacement_unconfirmed");
      expect(phase({ ...replacement.tx, safe: DISTRIBUTION_SAFE })).toBe("replacement_unconfirmed");
      expect(phase({ ...replacement.tx, isExecuted: false, isSuccessful: null, transactionHash: null, blockNumber: null })).toBe(
        "replacement_unconfirmed",
      );
      expect(phase({ ...replacement.tx, transactionHash: null })).toBe("replacement_unconfirmed");
    });

    describe("the replacing execution must be visible in its receipt", () => {
      const [tx] = unexecuted;
      const [replacement] = replacementOf(tx);
      const real = replacement.receipt!;
      const phase = (other: SafeReceipt | null) =>
        safeTxPhase(tx, { safeNonce: 381, executedAtNonce: [{ tx: replacement.tx, receipt: other }], finalizedBlock: FINALIZED });
      const mapExecutionLog = (change: (log: SafeReceipt["logs"][number]) => SafeReceipt["logs"][number]): SafeReceipt => ({
        ...real,
        logs: real.logs.map((log) => (log.topics[0] === EXECUTION_SUCCESS_TOPIC ? change(log) : log)),
      });

      it("finds the Safe's execution event for the replacing transaction in the real receipt", () => {
        expect(real.logs.filter((log) => log.topics[0] === EXECUTION_SUCCESS_TOPIC)).toHaveLength(1);
        expect(phase(real)).toBe("replaced");
      });

      it("does not rely on the service alone when the receipt is missing", () => {
        expect(phase(null)).toBe("replacement_unconfirmed");
      });

      it("rejects a reverted receipt and a receipt from another block", () => {
        expect(phase({ ...real, status: "reverted" })).toBe("replacement_unconfirmed");
        expect(phase({ ...real, blockNumber: real.blockNumber + BigInt(1) })).toBe("replacement_unconfirmed");
      });

      it("rejects a receipt without the Safe's execution event for the replacing transaction", () => {
        expect(phase({ ...real, logs: real.logs.filter((log) => log.topics[0] !== EXECUTION_SUCCESS_TOPIC) })).toBe(
          "replacement_unconfirmed",
        );
        // 別の提案IDの実行結果。
        expect(phase(mapExecutionLog((log) => ({ ...log, data: `0x${"cd".repeat(32)}${log.data.slice(66)}` })))).toBe(
          "replacement_unconfirmed",
        );
        // 別のコントラクトが出した同じ形のイベント。
        expect(phase(mapExecutionLog((log) => ({ ...log, address: DISTRIBUTION_SAFE })))).toBe("replacement_unconfirmed");
      });

      it("counts a replacing transaction that failed inside the Safe, because the nonce is consumed", () => {
        const failed = mapExecutionLog((log) => ({ ...log, topics: [EXECUTION_FAILURE_TOPIC, ...log.topics.slice(1)] }));
        expect(
          safeTxPhase(tx, {
            safeNonce: 381,
            executedAtNonce: [{ tx: { ...replacement.tx, isSuccessful: false }, receipt: failed }],
            finalizedBlock: FINALIZED,
          }),
        ).toBe("replaced");
      });
    });
  });
});

describe("verifyExecution", () => {
  const allowlistReceipt = receipt("receipt-allowlist");
  const batchReceipt = receipt("receipt-distribution-batch");
  const allowlistInput = {
    step: "allowlist" as const,
    applicant: ALLOWLISTED,
    tx: allowlistTx,
    receipt: allowlistReceipt,
    finalizedBlock: allowlistReceipt.blockNumber,
    allowed: true,
  };
  const distributionInput = {
    step: "distribution" as const,
    applicant: RECIPIENT,
    tx: fiftyTx,
    receipt: batchReceipt,
    finalizedBlock: batchReceipt.blockNumber + BigInt(10),
    operations: withAmount("50"),
  };

  it("knows the event the official Safes emit", () => {
    expect(EXECUTION_SUCCESS_TOPIC).toBe("0x442e715f626346e8c54381002da614f62bee8d27386535b2521ec8540898556e");
  });

  it("accepts the real allowlist execution", () => {
    expect(verifyExecution(allowlistInput)).toEqual([]);
  });

  it("accepts one distribution inside a real batch of six", () => {
    expect(verifyExecution(distributionInput)).toEqual([]);
  });

  it("waits while the block is not finalized or finality is unknown", () => {
    expect(verifyExecution({ ...allowlistInput, finalizedBlock: allowlistReceipt.blockNumber - BigInt(1) })).toEqual(["not_finalized"]);
    expect(verifyExecution({ ...allowlistInput, finalizedBlock: null })).toEqual(["not_finalized"]);
  });

  it("does not accept an allowlist execution unless the address reads as registered", () => {
    expect(verifyExecution({ ...allowlistInput, allowed: false })).toEqual(["not_allowed"]);
    expect(verifyExecution({ ...allowlistInput, allowed: null })).toEqual(["not_allowed"]);
  });

  it("rejects a receipt that does not carry this Safe transaction's success event", () => {
    // 同じSafeの別の取引のレシート(バッチ)を、Allowlistの取引の証拠として出された場合。
    expect(verifyExecution({ ...allowlistInput, receipt: { ...batchReceipt, blockNumber: allowlistReceipt.blockNumber } })).toEqual([
      "no_execution_success",
    ]);
  });

  it("rejects a success event emitted by another contract", () => {
    const forged = {
      ...allowlistReceipt,
      logs: allowlistReceipt.logs.map((log) =>
        log.topics[0] === EXECUTION_SUCCESS_TOPIC ? { ...log, address: RECIPIENT } : log,
      ),
    };
    expect(verifyExecution({ ...allowlistInput, receipt: forged })).toEqual(["no_execution_success"]);
  });

  it("rejects a reverted transaction and a receipt from another block", () => {
    expect(verifyExecution({ ...allowlistInput, receipt: { ...allowlistReceipt, status: "reverted" } })).toContain("receipt_failed");
    expect(
      verifyExecution({ ...allowlistInput, receipt: { ...allowlistReceipt, blockNumber: allowlistReceipt.blockNumber + BigInt(1) }, finalizedBlock: allowlistReceipt.blockNumber + BigInt(5) }),
    ).toEqual(["block_mismatch"]);
  });

  it("rejects a transaction the service has not marked as successfully executed", () => {
    expect(verifyExecution({ ...allowlistInput, tx: { ...allowlistTx, isSuccessful: false } })).toEqual(["not_executed"]);
    expect(verifyExecution({ ...allowlistInput, tx: { ...allowlistTx, isExecuted: false } })).toEqual(["not_executed"]);
  });

  it("does not credit a transfer made by another Safe transaction in the same batch", () => {
    // 同じバッチに同じ宛先への100 HENKAKUが3件あるが、0x35fc… が送ったのは50だけ。
    expect(verifyExecution({ ...distributionInput, operations: withAmount("100") })).toEqual(["transfer_missing"]);
  });

  it("does not credit a transfer to another recipient", () => {
    expect(verifyExecution({ ...distributionInput, applicant: ALLOWLISTED })).toEqual(["transfer_missing"]);
  });

  it("rejects a matching transfer when the token did not emit it", () => {
    const forged = {
      ...batchReceipt,
      logs: batchReceipt.logs.map((log) =>
        log.address.toLowerCase() === SAFE_OPERATIONS.tokenAddress.toLowerCase() ? { ...log, address: RECIPIENT } : log,
      ),
    };
    expect(verifyExecution({ ...distributionInput, receipt: forged })).toEqual(["transfer_missing"]);
  });
});
