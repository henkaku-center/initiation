// ABOUTME: Keep the published privacy policy accessible from both portal footers.
// ABOUTME: Render the actual shells so their public navigation stays covered.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalDemo } from "@/components/demo/PortalDemo";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/components/SessionStatus", () => ({ SessionStatus: () => null }));
vi.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => null }));

describe("portal footer", () => {
  it("keeps the experience banner out of the page", () => {
    const html = renderToStaticMarkup(createElement<{ applicationHref?: string }>(PortalDemo, { applicationHref: "/" }));
    expect(html).not.toContain("EXPERIENCE DEMO");
    expect(html).not.toContain("pd-demo-notice");
    expect(html).toContain("デモ操作");
    expect(html).toContain('href="/"');
  });
  it("offers isolated demo controls and the outlined passport navigation", () => {
    const html = renderToStaticMarkup(createElement(PortalShell, null, "Content"));
    expect(html).toContain('class="pd-nav-passport"');
    expect(html).toContain('href="/demo#home"');
    expect(html).toContain("デモ操作");
  });
  it.each([
    ["application", () => createElement(PortalShell, null, "Content")],
    ["demo", () => createElement(PortalDemo)],
  ] as const)("links to the existing privacy policy in the %s", (_, element) => {
    const html = renderToStaticMarkup(element());
    const footer = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1];
    expect(footer).toBeDefined();
    expect(footer).toContain('href="https://henkaku-center.github.io/initiation/privacy-policy"');
    expect(footer).toContain("プライバシーポリシー</a>");
    expect(footer).toContain("素材・クレジット");
  });
});
