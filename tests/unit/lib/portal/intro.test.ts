// ABOUTME: イントロを出すかどうかを、アプリのJavaScriptより先に決める初期化を検証する。
// ABOUTME: hydration前の空白を避けるための印なので、例外で止まらないことも固定する(Issue #123)。
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { INTRO_SEEN_KEY, introInitializationScript } from "@/lib/intro";

function run(storage: { getItem(key: string): string | null }) {
  const dataset: Record<string, string> = {};
  runInNewContext(introInitializationScript, {
    document: { documentElement: { dataset } },
    sessionStorage: storage,
  });
  return dataset;
}

describe("intro initialization", () => {
  it("marks the document when this session has already seen the intro", () => {
    expect(run({ getItem: (key) => (key === INTRO_SEEN_KEY ? "1" : null) })).toEqual({ introSeen: "1" });
  });

  it("leaves the document unmarked on the first visit of a session", () => {
    expect(run({ getItem: () => null })).toEqual({});
  });

  it("ignores a value other than the stored marker", () => {
    expect(run({ getItem: () => "0" })).toEqual({});
  });

  it("does not throw where session storage is unavailable", () => {
    // プライベートウィンドウやサイトデータ遮断では getItem 自体が例外を投げる。
    expect(run({ getItem: () => { throw new Error("blocked"); } })).toEqual({});
  });
});
