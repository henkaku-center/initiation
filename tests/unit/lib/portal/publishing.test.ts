// ABOUTME: Normal publishing must use the live application while retaining the noindex policy.
// ABOUTME: Demo boundaries remain testable without disabling real APIs in normal builds.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoRequestPolicy } from "@/lib/demo/boundary";

describe("portal build policy", () => {
  it("selects the normal build without changing the search indexing policy", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));
    expect(config.buildCommand).toBe("npm run build");
    expect(config.headers[0].headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" });
  });
  it.each(["/setup", "/initiation", "/apply", "/passport", "/checkin", "/community", "/admin", "/api/auth/verify"])("preserves real operations at %s only in a normal build", (route) => {
    expect(demoRequestPolicy(false, "POST", route)).toBe("allow");
    expect(demoRequestPolicy(true, "POST", route)).toBe("block");
  });
});
