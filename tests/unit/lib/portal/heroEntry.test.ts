import { describe, expect, it } from "vitest";
import { heroScrollGateMs } from "@/lib/portal/heroScrollGate";

describe("Gateway hero handoff", () => {
  it("keeps the completed kanji visible for about 0.7 seconds on desktop", () => {
    expect(heroScrollGateMs(false)).toBe(1060);
  });

  it("preserves the narrow-screen assembly pause", () => {
    expect(heroScrollGateMs(true)).toBe(1710);
  });

});
