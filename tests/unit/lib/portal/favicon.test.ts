import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("file-based favicon metadata", () => {
  it("provides a valid ICO at the Next.js root metadata location", () => {
    const icon = readFileSync(new URL("../../../../app/favicon.ico", import.meta.url));
    expect([...icon.subarray(0, 4)]).toEqual([0, 0, 1, 0]);
    const imageCount = icon.readUInt16LE(4);
    expect(imageCount).toBeGreaterThan(0);
    for (let index = 0; index < imageCount; index++) {
      const entry = 6 + index * 16;
      const size = icon.readUInt32LE(entry + 8);
      const offset = icon.readUInt32LE(entry + 12);
      expect(size).toBeGreaterThan(0);
      expect(offset).toBeGreaterThanOrEqual(6 + imageCount * 16);
      expect(offset + size).toBeLessThanOrEqual(icon.length);
    }
  });
});
