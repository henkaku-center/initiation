// ABOUTME: The application entry always renders its real Providers and portal shell.
// ABOUTME: A leftover deployment flag cannot restore simulated authentication or progress.
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";
import Home from "@/app/page";

vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "sans" }), Geist_Mono: () => ({ variable: "mono" }) }));
vi.mock("@/app/providers", () => ({ Providers: ({ children }: { children: ReactNode }) => createElement("div", { "data-test-providers": true }, children) }));
vi.mock("@/components/portal/PortalShell", () => ({ PortalShell: ({ children }: { children: ReactNode }) => createElement("div", { "data-test-shell": true }, children) }));
vi.mock("@/components/portal/PortalHome", () => ({ PortalHome: () => createElement("main", null, "Application home") }));

afterEach(() => vi.unstubAllEnvs());

describe("application entry", () => {
  it.each(["1", "0", ""])("always uses the application when the retired flag is %s", (flag) => {
    vi.stubEnv("HENKAKU_DEMO_ONLY", flag);
    const layout = RootLayout({ params: Promise.resolve({}), children: createElement(Home) });
    const html = renderToStaticMarkup(layout);
    expect(html).toContain('data-test-providers="true"');
    expect(html).toContain('data-test-shell="true"');
    expect(html).toContain("Application home");
    expect(html).not.toContain("デモ操作");
  });
});
