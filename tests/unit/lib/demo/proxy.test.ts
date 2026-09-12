import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

afterEach(() => vi.unstubAllEnvs());
describe("demo Proxy wiring", () => {
  it("rejects the real authentication endpoints and Server Action requests", () => {
    vi.stubEnv("HENKAKU_DEMO_ONLY", "1");
    expect(
      proxy(new NextRequest("https://demo.example/api/auth/me")).status,
    ).toBe(404);
    expect(
      proxy(
        new NextRequest("https://demo.example/", {
          method: "POST",
          headers: { "Next-Action": "test-action" },
        }),
      ).status,
    ).toBe(404);
    expect(
      proxy(new NextRequest("https://demo.example/apply", { method: "POST" }))
        .status,
    ).toBe(404);
  });
  it("keeps deep links inside the mock journey", () => {
    vi.stubEnv("HENKAKU_DEMO_ONLY", "1");
    expect(
      proxy(new NextRequest("https://demo.example/setup")).headers.get(
        "location",
      ),
    ).toBe("https://demo.example/#setup");
    expect(
      proxy(new NextRequest("https://demo.example/admin")).headers.get(
        "location",
      ),
    ).toBe("https://demo.example/#passport");
  });
  it("preserves normal application behavior outside the demo build", () => {
    vi.stubEnv("HENKAKU_DEMO_ONLY", "0");
    expect(
      proxy(new NextRequest("https://app.example/api/auth/me")).headers.get(
        "x-middleware-next",
      ),
    ).toBe("1");
  });
});
