import { describe, expect, it } from "vitest";
import {
  advanceBubbles,
  createBubbles,
  type BubblePointer,
} from "@/lib/demo/bubbles";

const bounds = { width: 1, height: 1 };
function simulate(
  rate: number,
  seconds: number,
  pointer: BubblePointer | null = null,
) {
  let scene = createBubbles(bounds);
  for (let i = 0; i < rate * seconds; i++)
    scene = advanceBubbles(scene, 1 / rate, pointer);
  return scene;
}

describe("gateway bubble motion", () => {
  it("has deterministic seeds and equivalent motion at different frame rates", () => {
    expect(createBubbles(bounds)).toEqual(createBubbles(bounds));
    const pointer = { x: 0.45, y: 0.5 };
    const low = simulate(30, 3, pointer);
    for (const rate of [60, 120]) {
      const high = simulate(rate, 3, pointer);
      low.bubbles.forEach((bubble, i) => {
        expect(high.bubbles[i].x).toBeCloseTo(bubble.x, 7);
        expect(high.bubbles[i].y).toBeCloseTo(bubble.y, 7);
      });
    }
  });
  it("keeps entire bubbles within the viewport through long runs and pointer jumps", () => {
    let scene = createBubbles({ width: 1.8, height: 1 });
    for (let i = 0; i < 1800; i++) {
      scene = advanceBubbles(scene, 1 / 30, {
        x: i % 2 ? 0 : 1.8,
        y: i % 3 ? 0 : 1,
      });
      for (const bubble of scene.bubbles) {
        expect(bubble.x).toBeGreaterThanOrEqual(bubble.radius);
        expect(bubble.x).toBeLessThanOrEqual(1.8 - bubble.radius);
        expect(bubble.y).toBeGreaterThanOrEqual(bubble.radius);
        expect(bubble.y).toBeLessThanOrEqual(1 - bubble.radius);
      }
      expect(scene.cursor.stretch).toBeGreaterThanOrEqual(1);
      expect(scene.cursor.stretch).toBeLessThanOrEqual(1.8);
    }
  });
  it("gently attracts nearby bubbles and releases them when the pointer leaves", () => {
    const seed = createBubbles(bounds);
    const pointer = { x: seed.bubbles[0].x + 0.12, y: seed.bubbles[0].y };
    let attracted = simulate(60, 2, pointer);
    const free = simulate(60, 2);
    expect(
      Math.hypot(
        attracted.bubbles[0].x - pointer.x,
        attracted.bubbles[0].y - pointer.y,
      ),
    ).toBeLessThan(
      Math.hypot(free.bubbles[0].x - pointer.x, free.bubbles[0].y - pointer.y),
    );
    for (let i = 0; i < 600; i++)
      attracted = advanceBubbles(attracted, 1 / 60, null);
    expect(Math.abs(attracted.bubbles[0].offsetX)).toBeLessThan(0.001);
    expect(attracted.cursor.radius).toBeLessThan(0.001);
  });
  it("naturally brings a pair together and separates it again", () => {
    let scene = createBubbles(bounds);
    let joined = false;
    let separate = false;
    for (let i = 0; i < 1800; i++) {
      scene = advanceBubbles(scene, 1 / 30, null);
      const [a, b] = scene.bubbles;
      const gap = Math.hypot(a.x - b.x, a.y - b.y) - a.radius - b.radius;
      joined ||= gap < 0;
      separate ||= gap > 0.08;
    }
    expect(joined).toBe(true);
    expect(separate).toBe(true);
  });
  it("does not jump ahead after the page has been inactive", () => {
    const scene = createBubbles(bounds);
    expect(advanceBubbles(scene, 30, null).time).toBeCloseTo(0.05);
    expect(advanceBubbles(scene, -1, null).time).toBe(0);
  });
});
