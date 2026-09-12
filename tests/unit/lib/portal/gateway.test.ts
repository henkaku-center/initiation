// ABOUTME: Build the Gateway documents used by the application.
// ABOUTME: Navigation, fictional histories and robots policy are checked on generated output.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(`public/demo-assets/gateway/${name}`, "utf8");

describe("application Gateway generation", () => {
  beforeAll(() => { execFileSync(process.execPath, ["scripts/gateway/build-gateway.mjs"]); });
  it("builds the shared Gateway from the application script directory", () => {
    const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
    for (const name of ["dev", "build"]) {
      expect(scripts[name]).toContain("node scripts/gateway/build-gateway.mjs");
      expect(scripts[name]).not.toContain("scripts/demo/");
    }
  });
  it("generates a normal home with public ListenBrainz music charts", () => {
    const html = read("index.html");
    expect(html).toContain('href="/setup" target="_top"');
    expect(html).toContain('href="/initiation" target="_top"');
    expect(html).not.toContain('href="/#');
    expect(html).toContain('data-gateway-section="03-frequency"');
    expect(html).toContain("frequency.js");
    expect(html).toContain("ListenBrainz / WEEKLY TOP TRACKS");
    expect(html).toContain('href="https://listenbrainz.org/statistics/?range=week"');
    expect(html).toContain("ListenBrainz全体の公開ランキングです。");
    expect(html.includes("（将来的にはコミュニティメンバーが聞いている曲が共有されるかも！？）")).toBe(true);
    expect(html).not.toContain("COMMUNITY PLAYS / MOCK");
    expect(html).not.toContain("listening-history.js");
    expect(html).toContain('content="noindex,nofollow"');
  });
  it("shows the podcast introduction without embedded YouTube players", () => {
    const html = read("index.html");
    expect(html).toContain("VOICES / PODCAST");
    expect(html).toContain('href="https://joi.ito.com/podcast/"');
    expect(html).toContain('aria-label="Voices horizontal scene strip"');
    expect(html.includes("Joi Itoとゲストの対話。番組の公式サイトから聴けます。")).toBe(false);
    expect(html.match(/class="voices-scene"/g)).toHaveLength(4);
    for (const title of ["LISTENING ROOM", "FRAGMENTS", "OBSERVED", "ENTER"]) expect(html).toContain(title);
    expect(html).not.toContain('src="./podcast-preview.js"');
    expect(html).not.toContain("data-podcast-player");
    expect(html).not.toContain("data-podcast-toggle");
    expect(html).not.toContain("無音プレビュー");
    expect(html).not.toContain("映像は無音で流れます");
  });
  it.each(["bubble-multi.html", "intro.html"])("uses normal URL fallbacks in %s", (file) => {
    const html = read(file);
    for (const route of ["/setup", "/initiation", "/community", "/passport"]) expect(html).toContain(`href="${route}"`);
    expect(html).not.toContain('href="/#');
    expect(html).toContain('content="noindex,nofollow"');
  });
  it("generates a single application edition from the music source", () => {
    expect(read("index.html")).not.toContain("COMMUNITY GATEWAY / DEMO");
    for (const name of ["index", "bubble-multi", "intro"]) expect(existsSync(`public/demo-assets/gateway/app-${name}.html`)).toBe(false);
    expect(read("frequency.js")).toBe(readFileSync("assets/reference/gateway/frequency.js", "utf8"));
  });
  it("does not publish unused mock listening histories or player code", () => {
    expect(read("gateway-data.js").includes("communityPlays")).toBe(false);
    expect(read("gateway-data.js").includes("episodes:")).toBe(false);
    expect(existsSync("public/demo-assets/gateway/listening-history.js")).toBe(false);
    expect(existsSync("public/demo-assets/gateway/podcast-preview.js")).toBe(false);
  });
  it.each([["/", "home"], ["/setup", "setup"], ["/initiation", "journey"], ["/community", "community"], ["/passport", "passport"]])("the encrypted intro dispatches %s to its parent", (route, screen) => {
    const html = read("intro.html");
    const start = html.indexOf("const url = new URL(link.href, location.href);");
    const end = html.indexOf("if (url.origin === location.origin", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const result = runInNewContext(`${html.slice(start, end)}; screen;`, {
      URL, link: { href: `http://localhost:3102${route}` },
      location: { href: "http://localhost:3102/demo-assets/gateway/intro.html" },
    });
    expect(result).toBe(screen);
  });
});
