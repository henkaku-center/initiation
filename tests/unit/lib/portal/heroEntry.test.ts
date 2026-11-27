import { describe, expect, it } from "vitest";
import { heroScrollGateMs } from "@/lib/portal/heroScrollGate";

describe("Gateway hero handoff", () => {
  it("keeps the completed kanji visible for about 0.45 seconds on desktop", () => {
    expect(heroScrollGateMs(false)).toBe(810);
  });

  it("keeps narrow-screen assembly intact with a shorter completed-kanji pause", () => {
    expect(heroScrollGateMs(true)).toBe(1460);
  });

});
