// ABOUTME: 翻訳した Markdown が原文と同じ構造を保っているかの検査。
// ABOUTME: 人が目視で数えていた確認を機械へ移すため、落とし物と訳しすぎを検出する。
import { describe, expect, it } from "vitest";
import { checkTranslation, sourcePathOf } from "@/scripts/docs/checkTranslation";

const errorsOf = (source: string, translated: string) =>
  checkTranslation(source, translated).findings.filter((f) => f.level === "error");

describe("checkTranslation", () => {
  it("原文の記入例に対応する英語表記だけを許可する", () => {
    const source = "```bash\ngit clone https://github.com/<あなたのアカウント>/initiation.git\nADMIN_ADDRESSES=0xあなたのアドレス\ngit push -u origin <ブランチ名>\n```";
    const translated = "```bash\ngit clone https://github.com/<your-account>/initiation.git\nADMIN_ADDRESSES=0xYourAddress\ngit push -u origin <branch-name>\n```";
    expect(errorsOf(source, translated)).toEqual([]);
    expect(errorsOf(source, translated.replace("git clone", "git fetch"))).not.toEqual([]);
    expect(errorsOf(source, translated.replace("0xYourAddress", "0x1234"))).not.toEqual([]);
  });

  it("READMEとサイトの訳文をそれぞれの原文へ対応づける", () => {
    expect(sourcePathOf("README.en.md")).toBe("README.md");
    expect(sourcePathOf("docs/en/guide/setup.md")).toBe("docs/guide/setup.md");
    expect(() => sourcePathOf("other.md")).toThrow();
    expect(() => sourcePathOf("docs/en/../../README.md")).toThrow();
  });
  it("構造が保たれていれば問題を報告しない", () => {
    const source = "# 見出し\n\n本文です。\n\n## 節\n\n| 列 |\n| --- |\n| 値 |\n";
    const translated = "# Heading\n\nBody text.\n\n## Section\n\n| Column |\n| --- |\n| Value |\n";

    const result = checkTranslation(source, translated);

    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("見出しが落ちていればerrorにする", () => {
    const source = "# 見出し\n\n## 節1\n\n## 節2\n";
    const translated = "# Heading\n\n## Section 1\n";

    const errors = errorsOf(source, translated);

    expect(errors).toHaveLength(1);
    expect(errors[0].label).toBe("見出し");
    expect(errors[0].detail).toContain("3");
    expect(errors[0].detail).toContain("2");
  });

  it("見出しの階層が変わっていればerrorにする", () => {
    const source = "# 見出し\n\n## 節\n\n### 小節\n";
    const translated = "# Heading\n\n## Section\n\n## Subsection\n";

    expect(errorsOf(source, translated)[0].label).toBe("見出しの階層");
  });

  it("コードブロック内のコマンドが変わっていればerrorにする", () => {
    const source = "```bash\nnpm run dev\n```\n";
    const translated = "```bash\nnpm 実行 dev\n```\n";

    const errors = errorsOf(source, translated);

    expect(errors).toHaveLength(1);
    expect(errors[0].label).toBe("コードブロックの中身");
  });

  it("コードブロック内のコメント行の翻訳は許可する", () => {
    const source = "```bash\n# 開発サーバーを起動する\nnpm run dev\n```\n";
    const translated = "```bash\n# Start the dev server\nnpm run dev\n```\n";

    expect(errorsOf(source, translated)).toEqual([]);
  });

  it("囲み枠の種別語が訳されていればerrorにする", () => {
    const source = "::: warning 秘密情報\n扱いに注意。\n:::\n";
    const translated = "::: 警告 Secrets\nBe careful.\n:::\n";

    expect(errorsOf(source, translated)[0].label).toBe("囲み枠の種別");
  });

  it("サイト内リンクが /en/ でも (Japanese) 付きでもなければerrorにする", () => {
    const source = "[セットアップ](/guide/setup)\n";
    const translated = "[Setup](/guide/setup)\n";

    const errors = errorsOf(source, translated);

    expect(errors[0].label).toBe("サイト内リンク");
    expect(errors[0].detail).toContain("/guide/setup");
  });

  it("/en/ を付けたリンクと (Japanese) を添えたリンクは通す", () => {
    const source = "[セットアップ](/guide/setup)\n\n[構成](/guide/architecture)\n";
    const translated =
      "[Setup](/en/guide/setup)\n\n[Structure (Japanese)](/guide/architecture)\n";

    expect(errorsOf(source, translated)).toEqual([]);
  });

  it("訳し漏れの日本語をwarningとして行番号つきで報告する", () => {
    const source = "# 見出し\n\n本文です。\n";
    const translated = "# Heading\n\n本文です。\n";

    const warnings = checkTranslation(source, translated).findings.filter(
      (f) => f.level === "warning",
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0].label).toBe("未翻訳の可能性");
    expect(warnings[0].detail).toContain("3行目");
  });

  it("リンク先のパスに含まれる日本語は訳し漏れとみなさない", () => {
    const source = "[構成](/guide/architecture#日本語の見出し)\n";
    const translated = "[Structure (Japanese)](/guide/architecture#日本語の見出し)\n";

    expect(checkTranslation(source, translated).findings).toEqual([]);
  });

  it("アンカー付きリンクを検査対象として抽出する", () => {
    const translated = "[A](/en/guide/setup#install)\n\n[B](/guide/architecture#理由)\n";

    const result = checkTranslation("[A](/guide/setup#install)\n\n[B](/guide/architecture#理由)\n", translated);

    expect(result.anchorLinks).toEqual([
      { path: "/en/guide/setup", anchor: "install" },
      { path: "/guide/architecture", anchor: "理由" },
    ]);
  });

  it("原文と訳文の個数を一覧で返す", () => {
    const source = "# 見出し\n\n```bash\nls\n```\n\n::: tip A\nB\n:::\n";
    const translated = "# Heading\n\n```bash\nls\n```\n\n::: tip A\nB\n:::\n";

    const counts = checkTranslation(source, translated).counts;

    expect(counts).toEqual([
      { label: "見出し", source: 1, translated: 1, ok: true },
      { label: "コードブロック", source: 1, translated: 1, ok: true },
      { label: "囲み枠", source: 1, translated: 1, ok: true },
      { label: "表の行", source: 0, translated: 0, ok: true },
    ]);
  });
});
