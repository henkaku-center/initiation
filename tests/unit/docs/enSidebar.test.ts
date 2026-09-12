// ABOUTME: 英語版サイドバーを docs/en/ の中身から組み立てる処理の確認。
// ABOUTME: 手で一覧を書くと翻訳のたびに更新が要り、忘れられた時点で嘘になるため自動化する。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { enSidebarItems } from "@/docs/.vitepress/enSidebar";

let dir = "";

const write = (relativePath: string, content: string) => {
  const full = join(dir, relativePath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf-8");
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "en-sidebar-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("enSidebarItems", () => {
  it("初期ガイドを読む順に並べ、その他のページはその後に置く", () => {
    write("guide/contributing.md", "# Contribution\n");
    write("guide/setup.md", "# Setup\n");
    write("guide/introduction.md", "# Introduction\n");
    write("a.md", "# Other\n");
    expect(enSidebarItems(dir).map((item) => item.text)).toEqual([
      "Introduction", "Setup", "Contribution", "Other",
    ]);
  });
  it("先頭の見出しをタイトルにして項目を作る", () => {
    write("guide/introduction.md", "# What is HENKAKU Initiation?\n\nBody.\n");

    expect(enSidebarItems(dir)).toEqual([
      { text: "What is HENKAKU Initiation?", link: "/en/guide/introduction" },
    ]);
  });

  it("入れ子のディレクトリも拾う", () => {
    write("index.md", "# Home\n");
    write("guide/setup.md", "# Setup\n");
    write("reference/commands.md", "# Commands\n");

    expect(enSidebarItems(dir).map((item) => item.link)).toEqual([
      "/en/guide/setup",
      "/en/reference/commands",
    ]);
  });

  it("トップページは翻訳ではなく個別に書くため一覧に含めない", () => {
    write("index.md", "# Home\n");

    expect(enSidebarItems(dir)).toEqual([]);
  });

  it("翻訳が1つも無ければ空の配列を返す", () => {
    expect(enSidebarItems(dir)).toEqual([]);
  });

  it("ディレクトリ自体が無くても落ちない", () => {
    expect(enSidebarItems(join(dir, "missing"))).toEqual([]);
  });

  it("見出しが無いファイルはファイル名をタイトルにする", () => {
    write("guide/draft.md", "Body without heading.\n");

    expect(enSidebarItems(dir)).toEqual([{ text: "draft", link: "/en/guide/draft" }]);
  });

  it("並び順はパス順で安定する", () => {
    write("b.md", "# B\n");
    write("a.md", "# A\n");
    write("guide/c.md", "# C\n");

    expect(enSidebarItems(dir).map((item) => item.text)).toEqual(["A", "B", "C"]);
  });
});
