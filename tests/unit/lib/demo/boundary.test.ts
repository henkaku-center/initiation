import { describe, expect, it } from "vitest";
import { demoRequestPolicy } from "@/lib/demo/boundary";

describe("demo deployment boundary", () => {
  it("preserves the original application when demo mode is disabled", () => {
    expect(demoRequestPolicy(false, "POST", "/api/auth/verify")).toBe("allow");
  });
  it.each(["/", "/demo", "/apply", "/admin", "/_next/static/a.js"])(
    "blocks action requests at %s",
    (path) => {
      expect(demoRequestPolicy(true, "POST", path)).toBe("block");
    },
  );
  it.each(["/api", "/api/auth/me", "/api/auth/nonce", "/api/auth/verify"])(
    "disables the real API at %s",
    (path) => {
      expect(demoRequestPolicy(true, "GET", path)).toBe("block");
    },
  );
  it.each(["/favicon.ico", "/icon.svg"])(
    "serves the file-based icon at %s without allowing writes",
    (pathname) => {
      expect(demoRequestPolicy(true, "GET", pathname)).toBe("allow");
      expect(demoRequestPolicy(true, "HEAD", pathname)).toBe("allow");
      expect(demoRequestPolicy(true, "POST", pathname)).toBe("block");
    },
  );
  it("serves the demo and assets while redirecting live pages", () => {
    for (const path of [
      "/",
      "/demo",
      "/demo-assets/night.webp",
      "/_next/static/a.js",
      "/music/karawapo-breeze-zero.json",
    ]) {
      expect(demoRequestPolicy(true, "GET", path)).toBe("allow");
    }
    expect(demoRequestPolicy(true, "GET", "/setup")).toBe("redirect");
    expect(demoRequestPolicy(true, "GET", "/admin")).toBe("redirect");
    expect(demoRequestPolicy(true, "GET", "/unknown.txt")).toBe("block");
  });
});
