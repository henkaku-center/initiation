// ABOUTME: A page's saved props belong only to the authenticated wallet that loaded them.
// ABOUTME: Account changes, disconnection and failed session reads hide previous member data.
import { describe, expect, it } from "vitest";
import { canDisplayMemberData } from "@/lib/domain/walletSession";

const address = "0x1111111111111111111111111111111111111111";
describe("member data boundary", () => {
  it("shows data only when the wallet, session and server page agree", () => {
    expect(canDisplayMemberData({ pageAddress: address, sessionAddress: address, connectedAddress: address, connected: true, sessionError: false })).toBe(true);
  });
  it.each([
    { sessionAddress: null }, { connected: false }, { connectedAddress: undefined },
    { pageAddress: "0x2222222222222222222222222222222222222222" },
    { connectedAddress: "0x2222222222222222222222222222222222222222" }, { sessionError: true },
  ])("hides previous data when %j", (override) => {
    expect(canDisplayMemberData({ pageAddress: address, sessionAddress: address, connectedAddress: address, connected: true, sessionError: false, ...override })).toBe(false);
  });
});
