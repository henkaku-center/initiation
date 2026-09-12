// ABOUTME: Exercise the real SIWE request sequence with a local fake signer and HTTP responses.
// ABOUTME: Wallet changes and rejected requests must never advance the authentication UI.
import { afterEach, describe, expect, it, vi } from "vitest";
import { signInWithWallet } from "@/lib/auth/signInWithWallet";

const address = "0x1111111111111111111111111111111111111111";
afterEach(() => vi.unstubAllGlobals());

function setup() {
  const request = vi.fn().mockResolvedValueOnce(Response.json({ nonce: "abcdefgh12345678" })).mockResolvedValueOnce(Response.json({ address }));
  vi.stubGlobal("fetch", request);
  let current = true;
  const options = {
    address, origin: "http://localhost:3102", isCurrent: () => current,
    signMessage: vi.fn().mockResolvedValue("0x1234"),
    refreshSession: vi.fn().mockResolvedValue({ address }),
    signOut: vi.fn().mockResolvedValue(undefined), onPhase: vi.fn(),
  };
  return { request, options, changeWallet: () => { current = false; } };
}

describe("portal SIWE", () => {
  it("requests a nonce, signs, verifies and confirms the server session", async () => {
    const { request, options } = setup();
    await signInWithWallet(options);
    expect(request.mock.calls.map(([url]) => url)).toEqual(["/api/auth/nonce", "/api/auth/verify"]);
    const body = JSON.parse(request.mock.calls[1][1].body);
    expect(body.message).toContain("Chain ID: 137");
    expect(body.message).toContain("localhost:3102");
    expect(body.signature).toBe("0x1234");
    expect(options.onPhase.mock.calls.flat()).toEqual(["nonce", "signing", "verifying"]);
    expect(options.refreshSession).toHaveBeenCalledOnce();
  });
  it("does not verify a refused signature", async () => {
    const { request, options } = setup();
    options.signMessage.mockRejectedValue({ code: 4001 });
    await expect(signInWithWallet(options)).rejects.toThrow("署名が拒否されました");
    expect(request).toHaveBeenCalledOnce();
    expect(options.refreshSession).not.toHaveBeenCalled();
  });
  it("does not sign when nonce retrieval fails", async () => {
    const { request, options } = setup();
    request.mockReset().mockResolvedValue(new Response(null, { status: 500 }));
    await expect(signInWithWallet(options)).rejects.toThrow("認証の準備に失敗");
    expect(options.signMessage).not.toHaveBeenCalled();
  });
  it("does not report a verification failure as authenticated", async () => {
    const { request, options } = setup();
    request.mockReset().mockResolvedValueOnce(Response.json({ nonce: "abcdefgh12345678" })).mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(signInWithWallet(options)).rejects.toThrow("認証に失敗");
    expect(options.refreshSession).not.toHaveBeenCalled();
  });
  it("stops if the wallet changes while the signature is pending", async () => {
    const { request, options, changeWallet } = setup();
    options.signMessage.mockImplementation(async () => { changeWallet(); return "0x1234"; });
    await expect(signInWithWallet(options)).rejects.toThrow("ウォレットが変更");
    expect(request).toHaveBeenCalledOnce();
  });
  it("clears a session that arrives after the wallet changed during verification", async () => {
    const { request, options, changeWallet } = setup();
    request.mockReset().mockResolvedValueOnce(Response.json({ nonce: "abcdefgh12345678" })).mockImplementationOnce(async () => { changeWallet(); return Response.json({ address }); });
    await expect(signInWithWallet(options)).rejects.toThrow("ウォレットが変更");
    expect(options.signOut).toHaveBeenCalledOnce();
    expect(options.refreshSession).not.toHaveBeenCalled();
  });
  it("requires the confirmed session to match the signing wallet", async () => {
    const { options } = setup();
    options.refreshSession.mockResolvedValue({ address: "0x2222222222222222222222222222222222222222" });
    await expect(signInWithWallet(options)).rejects.toThrow("サインイン状態を確認できません");
    expect(options.signOut).toHaveBeenCalledOnce();
  });
});
