import { describe, expect, it } from "vitest";
import {
  sceneScrollPosition,
  visibleSceneIndex,
} from "@/lib/demo/gatewayMotion";

describe("Gateway scene strip", () => {
  it("recognizes the final scene even when it cannot align with the left edge", () => {
    expect(visibleSceneIndex(0, 1000, 650, 20, 3)).toBe(0);
    expect(visibleSceneIndex(670, 1000, 650, 20, 3)).toBe(1);
    expect(visibleSceneIndex(990, 1000, 650, 20, 3)).toBe(2);
    expect(visibleSceneIndex(-10, 1000, 650, 20, 3)).toBe(0);
  });
  it("starts at the first scene before arrival and reaches the last on exit", () => {
    expect(sceneScrollPosition(900, 600, 800, 1500)).toBe(0);
    expect(sceneScrollPosition(-800, 600, 800, 1500)).toBe(1500);
    expect(sceneScrollPosition(0, 600, 800, 1500)).toBeGreaterThan(0);
    expect(sceneScrollPosition(0, 600, 800, 1500)).toBeLessThan(1500);
  });
  it("does not invent movement for a strip that fits the viewport", () => {
    expect(sceneScrollPosition(0, 600, 800, 0)).toBe(0);
    expect(sceneScrollPosition(0, 600, 800, -10)).toBe(0);
  });
});
