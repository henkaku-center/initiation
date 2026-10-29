import { describe, expect, it } from "vitest";
import { themeInitializationScript } from "@/lib/theme";

describe("portal theme default", () => {
  it("starts in light mode while preserving a saved dark selection", () => {
    expect(themeInitializationScript).toContain('let theme = "light"');
    expect(themeInitializationScript).toContain('localStorage.getItem("henkaku.appearance.v1") === "dark"');
  });
});
