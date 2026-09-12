// ABOUTME: Keep the published privacy policy accessible from the application footer.
// ABOUTME: Render the actual shells so their public navigation stays covered.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PortalShell } from "@/components/portal/PortalShell";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/components/SessionStatus", () => ({ SessionStatus: () => null }));
vi.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => null }));

describe("portal footer", () => {
  it("keeps retired demo controls out of the application", () => {
    const html = renderToStaticMarkup(createElement(PortalShell, null, "Content"));
    expect(html).not.toContain("EXPERIENCE DEMO");
    expect(html).not.toContain("pd-demo-notice");
    expect(html).not.toContain("デモ操作");
    expect(html).not.toContain('href="/demo');
  });
  it("keeps the outlined passport navigation", () => {
    const html = renderToStaticMarkup(createElement(PortalShell, null, "Content"));
    expect(html).toContain('class="pd-nav-passport"');
    expect(html).toContain('href="/passport"');
  });
  it("links to the existing privacy policy and credits", () => {
    const html = renderToStaticMarkup(createElement(PortalShell, null, "Content"));
    const footer = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1];
    expect(footer).toBeDefined();
    expect(footer).toContain('href="https://henkaku-center.github.io/initiation/privacy-policy"');
    expect(footer).toContain("プライバシーポリシー</a>");
    expect(footer).toContain("素材・クレジット");
  });
});
