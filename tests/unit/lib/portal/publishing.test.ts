// ABOUTME: Normal publishing must use the live application while retaining the noindex policy.
// ABOUTME: Retired demo builds cannot replace the application or break old bookmarks.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";

describe("portal build policy", () => {
  it("selects the normal build without changing the search indexing policy", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));
    expect(config.buildCommand).toBe("npm run build");
    expect(config.headers[0].headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" });
  });
  it("offers one application build in package scripts and CI", () => {
    const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
    expect(scripts["dev:demo"]).toBeUndefined();
    expect(scripts["build:demo"]).toBeUndefined();
    expect(readFileSync(".github/workflows/ci.yml", "utf8")).not.toContain("build:demo");
    expect(readFileSync(".env.example", "utf8")).not.toContain("HENKAKU_DEMO_ONLY");
    expect(nextConfig.env?.HENKAKU_DEMO_ONLY).toBeUndefined();
  });
  it("redirects retired demo bookmarks to the application's hash navigation", async () => {
    expect(await nextConfig.redirects?.()).toContainEqual({ source: "/demo", destination: "/", permanent: true });
  });
  it.each(["app/demo/page.tsx", "components/demo/PortalDemo.tsx", "lib/demo/state.ts", "lib/demo/useDemo.ts", "proxy.ts"])("does not ship retired simulation code at %s", (file) => {
    expect(existsSync(file)).toBe(false);
  });
});
