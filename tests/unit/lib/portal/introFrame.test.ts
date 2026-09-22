// ABOUTME: The portal tells the intro frame when it is listening for link messages.
// ABOUTME: Until then the intro keeps its anchors' own navigation (Issue #123).
import { describe, expect, it } from "vitest";
import { isIntroReady, tellIntroListening } from "@/lib/portal/introFrame";

const origin = "http://localhost:3102";

describe("intro frame messages", () => {
  it("answers the intro frame with a listening message", () => {
    const sent: unknown[][] = [];
    tellIntroListening({ postMessage: (...args: unknown[]) => { sent.push(args); } }, origin);
    expect(sent).toEqual([[{ type: "henkaku:intro:listening" }, origin]]);
  });
  it("stays quiet when the intro frame has no window yet", () => {
    expect(() => tellIntroListening(null, origin)).not.toThrow();
    expect(() => tellIntroListening(undefined, origin)).not.toThrow();
  });
  it("recognises the ready message only from the intro frame on the same origin", () => {
    const frame = {};
    expect(isIntroReady({ source: frame, origin, data: { type: "henkaku:intro:ready" } }, frame, origin)).toBe(true);
    expect(isIntroReady({ source: {}, origin, data: { type: "henkaku:intro:ready" } }, frame, origin)).toBe(false);
    expect(isIntroReady({ source: frame, origin: "https://evil.example", data: { type: "henkaku:intro:ready" } }, frame, origin)).toBe(false);
    expect(isIntroReady({ source: frame, origin, data: { type: "henkaku:intro:navigate" } }, frame, origin)).toBe(false);
    expect(isIntroReady({ source: null, origin, data: { type: "henkaku:intro:ready" } }, null, origin)).toBe(false);
  });
});
