import { describe, expect, it } from "vitest";
import { createHeroScrollPacer } from "@/lib/portal/heroScrollPacer";

describe("hero scroll pacing", () => {
  it("limits a large flick without retaining a long scroll backlog", () => {
    const pacer = createHeroScrollPacer();
    pacer.push(100000, 1800);
    expect(pacer.advance(16, 1800)).toBeCloseTo(18);
    let total = 18;
    for (let i = 0; i < 20; i++) total += pacer.advance(16, 1800);
    expect(total).toBeCloseTo(180);
    expect(pacer.advance(16, 1800)).toBe(0);
  });
  it("keeps slow input proportional and reverses immediately", () => {
    const pacer = createHeroScrollPacer();
    pacer.push(4, 1800);
    expect(pacer.advance(16, 1800)).toBe(4);
    pacer.push(900, 1800);
    pacer.push(-8, 1800);
    expect(pacer.advance(16, 1800)).toBe(-8);
  });
  it("cannot jump after a stalled frame and clears motion on reset", () => {
    const pacer = createHeroScrollPacer();
    pacer.push(100000, 1800);
    expect(pacer.advance(2000, 1800)).toBeLessThanOrEqual(36);
    pacer.reset();
    expect(pacer.advance(16, 1800)).toBe(0);
  });
  it("shows the whole transition under continuous fast input", () => {
    const pacer = createHeroScrollPacer();
    let position = 0;
    for (let i = 0; i < 100; i++) {
      pacer.push(10000, 1800);
      position += pacer.advance(16, 1800);
      if (i < 99) expect(position).toBeLessThan(1800);
    }
    expect(position).toBeCloseTo(1800);
  });
});
