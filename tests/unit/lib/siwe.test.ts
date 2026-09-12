// ABOUTME: 実署名を使って SIWE 検証の境界条件を確認する。
// ABOUTME: nonce・domain・uri・chainId・有効期限・署名の不一致を受け入れない契約を固定する。
import { describe, it, expect, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { SiweMessage } from "siwe";
import { MAX_SIWE_LIFETIME_MS, parseAllowedDomains, verifySiweMessage } from "@/lib/siwe";

const DOMAIN = "localhost:3000";
const ALLOWED = [DOMAIN];
const CHAIN_ID = 137;
const NONCE = "abcdefgh12345678";
const NOW = new Date("2026-08-09T00:00:00.000Z");

function minutesFromNow(minutes: number): string {
  return new Date(NOW.getTime() + minutes * 60 * 1000).toISOString();
}

async function buildSignedMessage(
  overrides: Partial<{
    nonce: string;
    domain: string;
    chainId: number;
    uri: string;
    expirationTime: string | undefined;
  }> = {},
) {
  const pk = generatePrivateKey();
  const account = privateKeyToAccount(pk);
  const domain = overrides.domain ?? DOMAIN;
  const message = new SiweMessage({
    domain,
    address: account.address,
    statement: "Sign in to HENKAKU Initiation",
    uri: overrides.uri ?? `http://${domain}`,
    version: "1",
    chainId: overrides.chainId ?? CHAIN_ID,
    nonce: overrides.nonce ?? NONCE,
    expirationTime: "expirationTime" in overrides ? overrides.expirationTime : minutesFromNow(10),
  }).prepareMessage();
  const signature = await account.signMessage({ message });
  return { message, signature, address: account.address };
}

async function verify(
  built: { message: string; signature: `0x${string}` },
  overrides: Partial<{ expectedNonce: string; allowedDomains: string[]; expectedChainId: number }> = {},
) {
  return verifySiweMessage({
    message: built.message,
    signature: built.signature,
    expectedNonce: overrides.expectedNonce ?? NONCE,
    allowedDomains: overrides.allowedDomains ?? ALLOWED,
    expectedChainId: overrides.expectedChainId ?? CHAIN_ID,
    now: NOW,
  });
}

describe("parseAllowedDomains", () => {
  it("splits, trims and lowercases entries", () => {
    expect(parseAllowedDomains(" localhost:3000 , Initiation.Example.Org ")).toEqual([
      "localhost:3000",
      "initiation.example.org",
    ]);
  });

  it("returns an empty list when unset or blank", () => {
    expect(parseAllowedDomains(undefined)).toEqual([]);
    expect(parseAllowedDomains(" , ")).toEqual([]);
  });
});

describe("verifySiweMessage", () => {
  it("accepts a valid message signed by the address", async () => {
    const built = await buildSignedMessage();
    const result = await verify(built);
    expect(result).toEqual({ ok: true, address: built.address });
  });

  it("accepts a domain listed among several allowed domains", async () => {
    const built = await buildSignedMessage({ domain: "initiation.example.org" });
    const result = await verify(built, {
      allowedDomains: ["localhost:3000", "initiation.example.org"],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects every message when no domain is configured", async () => {
    const built = await buildSignedMessage();
    const result = await verify(built, { allowedDomains: [] });
    expect(result).toEqual({ ok: false, reason: "domain not configured" });
  });

  it("rejects a nonce mismatch", async () => {
    const built = await buildSignedMessage();
    const result = await verify(built, { expectedNonce: "differentnonce00" });
    expect(result.ok).toBe(false);
  });

  it("rejects a domain outside the allowed list", async () => {
    const built = await buildSignedMessage({ domain: "evil.example.com" });
    const result = await verify(built);
    expect(result).toEqual({ ok: false, reason: "domain mismatch" });
  });

  it("rejects a chainId mismatch", async () => {
    const built = await buildSignedMessage({ chainId: 1 });
    const result = await verify(built);
    expect(result.ok).toBe(false);
  });

  it("rejects a uri pointing at another host", async () => {
    const built = await buildSignedMessage({ uri: "https://evil.example.com/callback" });
    const result = await verify(built);
    expect(result).toEqual({ ok: false, reason: "uri mismatch" });
  });

  it("rejects a uri with a non-http scheme", async () => {
    const built = await buildSignedMessage({ uri: `ftp://${DOMAIN}` });
    const result = await verify(built);
    expect(result).toEqual({ ok: false, reason: "uri mismatch" });
  });

  it("rejects a message without an expiration time", async () => {
    const built = await buildSignedMessage({ expirationTime: undefined });
    const result = await verify(built);
    expect(result).toEqual({ ok: false, reason: "expiration required" });
  });

  it("rejects an already expired message", async () => {
    const built = await buildSignedMessage({ expirationTime: minutesFromNow(-1) });
    const result = await verify(built);
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects an expiration beyond the server-side maximum", async () => {
    const beyondMax = new Date(NOW.getTime() + MAX_SIWE_LIFETIME_MS + 1000).toISOString();
    const built = await buildSignedMessage({ expirationTime: beyondMax });
    const result = await verify(built);
    expect(result).toEqual({ ok: false, reason: "expiration too long" });
  });

  it("rejects a tampered signature", async () => {
    const reported = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const built = await buildSignedMessage();
      const result = await verify({
        message: built.message,
        signature: ("0x" + "ab".repeat(65)) as `0x${string}`,
      });
      expect(result.ok).toBe(false);
      expect(reported).toHaveBeenCalledWith(expect.objectContaining({ code: "INVALID_ARGUMENT" }));
    } finally {
      reported.mockRestore();
    }
  });
});
