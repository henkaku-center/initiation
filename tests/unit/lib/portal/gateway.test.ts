// ABOUTME: Build the actual Gateway documents and check the application/demo boundary.
// ABOUTME: Navigation, fictional histories and robots policy are checked on generated output.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(`public/demo-assets/gateway/${name}`, "utf8");

describe("application Gateway generation", () => {
  beforeAll(() => { execFileSync(process.execPath, ["scripts/demo/build-gateway.mjs"]); });
  it("generates a normal home without fictional play history", () => {
    const html = read("app-index.html");
    expect(html).toContain('href="/setup" target="_top"');
    expect(html).toContain('href="/initiation" target="_top"');
    expect(html).not.toContain('href="/#');
    expect(html).not.toContain("listening-history.js");
    expect(html).not.toContain("COMMUNITY PLAYS / MOCK");
    expect(html).toContain("podcast-preview.js");
    expect(html).toContain('content="noindex,nofollow"');
  });
  it.each(["app-bubble-multi.html", "app-intro.html"])("uses normal URL fallbacks in %s", (file) => {
    const html = read(file);
    for (const route of ["/setup", "/initiation", "/community", "/passport"]) expect(html).toContain(`href="${route}"`);
    expect(html).not.toContain('href="/#');
    expect(html).toContain('content="noindex,nofollow"');
  });
  it("keeps the explicit demo build usable and marked as a sample", () => {
    expect(read("index.html")).toContain('href="/#setup"');
    expect(read("index.html")).toContain("COMMUNITY PLAYS / MOCK");
  });
  it.each([["/", "home"], ["/setup", "setup"], ["/initiation", "journey"], ["/community", "community"], ["/passport", "passport"]])("the encrypted intro dispatches %s to its parent", (route, screen) => {
    const html = read("app-intro.html");
    const start = html.indexOf("const url = new URL(link.href, location.href);");
    const end = html.indexOf("if (url.origin === location.origin", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const result = runInNewContext(`${html.slice(start, end)}; screen;`, {
      URL, link: { href: `http://localhost:3102${route}` },
      location: { href: "http://localhost:3102/demo-assets/gateway/app-intro.html" },
    });
    expect(result).toBe(screen);
  });
});
