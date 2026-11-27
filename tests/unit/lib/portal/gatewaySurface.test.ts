import { describe, expect, it } from "vitest";
import { scopeGatewayStyles } from "@/lib/portal/gatewaySurface";

describe("inline Gateway surface", () => {
  it("uses the viewport below the app header for the original iframe artwork", () => {
    expect(scopeGatewayStyles('.scene { height:100svh; width:clamp(280px,calc((100svh - 400px) * 16 / 9),72vw); }'))
      .toContain('calc(var(--gateway-viewport-height, 100svh) * 1)');
  });
  it("keeps both themes and page rules inside the Gateway shadow root", () => {
    const source = ':root { --paper: white; } html,body { color: black; } html[data-theme="dark"] .gate { color: white; } body { margin: 0; }';
    const scoped = scopeGatewayStyles(source);
    expect(scoped).toContain(":host { --paper: white; }");
    expect(scoped).toContain(":host,.gateway-root { color: black; }");
    expect(scoped).toContain(':host([data-theme="dark"]) .gate { color: white; }');
    expect(scoped).toContain(".gateway-root { margin: 0; }");
  });
});
