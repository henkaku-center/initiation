// ABOUTME: 翻訳したMarkdownが原文と同じ構造を保っているかを検査する純粋関数。
// ABOUTME: 見出し・コード例・リンクの構造を比較し、レビュー対象を報告する。

export function sourcePathOf(translatedPath: string): string {
  if (translatedPath === "README.en.md") return "README.md";
  if (!/^docs\/en\/(?!.*(?:^|\/)\.\.(?:\/|$)).+\.md$/.test(translatedPath)) {
    throw new Error(`docs/en/ 以下のMarkdownか README.en.md を指定してください: ${translatedPath}`);
  }
  return `docs/${translatedPath.slice("docs/en/".length)}`;
}

export type Finding = { level: "error" | "warning"; label: string; detail: string };
export type Count = { label: string; source: number; translated: number; ok: boolean };
export type AnchorLink = { path: string; anchor: string };
export type CheckResult = {
  ok: boolean;
  findings: Finding[];
  counts: Count[];
  anchorLinks: AnchorLink[];
};

type Line = { text: string; number: number; inCode: boolean };

const JAPANESE = /[぀-ゟ゠-ヿ一-鿿]/;
const LINK = /\[([^\]]*)\]\(([^)]+)\)/g;

/** frontmatterを除き、各行がコードブロックの内側かどうかを付けて返す。 */
function scan(markdown: string): Line[] {
  const raw = markdown.split("\n");
  const lines: Line[] = [];
  let inFrontmatter = raw[0]?.trim() === "---";
  let inCode = false;

  raw.forEach((text, index) => {
    const number = index + 1;
    if (inFrontmatter) {
      if (index > 0 && text.trim() === "---") inFrontmatter = false;
      return;
    }
    // フェンス行自体も見出し・表の判定から外す(```# のような行を拾わないため)。
    if (text.startsWith("```")) {
      lines.push({ text, number, inCode: true });
      inCode = !inCode;
      return;
    }
    lines.push({ text, number, inCode });
  });

  return lines;
}

const prose = (lines: Line[]): Line[] => lines.filter((line) => !line.inCode);

const headingLevels = (lines: Line[]): number[] =>
  prose(lines)
    .map((line) => /^(#{1,6})\s/.exec(line.text)?.[1].length ?? 0)
    .filter((level) => level > 0);

/** `::: warning タイトル` の種別語だけを開始行から拾う(閉じる `:::` は含めない)。 */
const containerTypes = (lines: Line[]): string[] =>
  prose(lines)
    .map((line) => /^:::\s*(\S+)/.exec(line.text)?.[1] ?? "")
    .filter((type) => type !== "");

const tableRowCount = (lines: Line[]): number =>
  prose(lines).filter((line) => line.text.startsWith("|")).length;

function codeBlocks(markdown: string): string[][] {
  const blocks: string[][] = [];
  let current: string[] | null = null;

  for (const text of markdown.split("\n")) {
    if (text.startsWith("```")) {
      if (current) {
        blocks.push(current);
        current = null;
      } else {
        current = [];
      }
      continue;
    }
    if (current) current.push(text);
  }

  return blocks;
}

const isComment = (text: string): boolean => /^\s*(#|\/\/|<!--)/.test(text);

/** コメントと空行を除いた行。コマンド本体は翻訳しても変わってはいけない。 */
const commandLines = (block: string[]): string[] =>
  block.filter((text) => !isComment(text) && text.trim() !== "");

// 原文に存在する記入例だけを対応づける。任意の値やコマンド変更は許可しない。
const translatePlaceholder = (line: string): string => line
  .replaceAll("<あなたのアカウント>", "<your-account>")
  .replaceAll("0xあなたのアドレス", "0xYourAddress")
  .replaceAll("<ブランチ名>", "<branch-name>");

function linksIn(lines: Line[]): { text: string; target: string }[] {
  const body = prose(lines)
    .map((line) => line.text)
    .join("\n");
  return [...body.matchAll(LINK)].map((match) => ({ text: match[1], target: match[2] }));
}

const sameSequence = (a: readonly unknown[], b: readonly unknown[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

export function checkTranslation(source: string, translated: string): CheckResult {
  const sourceLines = scan(source);
  const translatedLines = scan(translated);
  const sourceBlocks = codeBlocks(source);
  const translatedBlocks = codeBlocks(translated);

  const counts: Count[] = [
    { label: "見出し", source: headingLevels(sourceLines).length, translated: headingLevels(translatedLines).length, ok: true },
    { label: "コードブロック", source: sourceBlocks.length, translated: translatedBlocks.length, ok: true },
    { label: "囲み枠", source: containerTypes(sourceLines).length, translated: containerTypes(translatedLines).length, ok: true },
    { label: "表の行", source: tableRowCount(sourceLines), translated: tableRowCount(translatedLines), ok: true },
  ].map((count) => ({ ...count, ok: count.source === count.translated }));

  const findings: Finding[] = [];

  for (const count of counts) {
    if (!count.ok) {
      findings.push({
        level: "error",
        label: count.label,
        detail: `原文 ${count.source}個 / 訳文 ${count.translated}個`,
      });
    }
  }

  // 個数が合っている場合だけ中身を比べる。個数のズレは既に報告済みで、
  // 対応づけができないまま中身を比べても読み手の役に立たないため。
  const headingsMatch = counts[0].ok;
  const blocksMatch = counts[1].ok;
  const containersMatch = counts[2].ok;

  if (headingsMatch && !sameSequence(headingLevels(sourceLines), headingLevels(translatedLines))) {
    findings.push({
      level: "error",
      label: "見出しの階層",
      detail: `原文 ${headingLevels(sourceLines).join("-")} / 訳文 ${headingLevels(translatedLines).join("-")}`,
    });
  }

  if (blocksMatch) {
    sourceBlocks.forEach((block, index) => {
      if (!sameSequence(commandLines(block).map(translatePlaceholder), commandLines(translatedBlocks[index]))) {
        findings.push({
          level: "error",
          label: "コードブロックの中身",
          detail: `${index + 1}個目のコードブロックで、コメント以外の行が原文と違う`,
        });
      }
    });
  }

  if (containersMatch) {
    const sourceTypes = containerTypes(sourceLines);
    const translatedTypes = containerTypes(translatedLines);
    if (!sameSequence(sourceTypes, translatedTypes)) {
      findings.push({
        level: "error",
        label: "囲み枠の種別",
        detail: `原文 ${sourceTypes.join(", ")} / 訳文 ${translatedTypes.join(", ")}`,
      });
    }
  }

  for (const link of linksIn(translatedLines)) {
    if (!link.target.startsWith("/")) continue;
    if (link.target.startsWith("/en/")) continue;
    if (link.text.includes("(Japanese)")) continue;
    findings.push({
      level: "error",
      label: "サイト内リンク",
      detail: `${link.target} は /en/ が付いていない。未翻訳のページなら、リンク文字に (Japanese) を添える`,
    });
  }

  // リンク先のパスに含まれる日本語(日本語ページのアンカーなど)は訳し漏れではない。
  const untranslated = prose(translatedLines).filter((line) =>
    JAPANESE.test(line.text.replace(/\]\([^)]*\)/g, "]()")),
  );
  if (untranslated.length > 0) {
    findings.push({
      level: "warning",
      label: "未翻訳の可能性",
      detail: `日本語が残っている行: ${untranslated.map((line) => `${line.number}行目`).join(", ")}`,
    });
  }

  const anchorLinks: AnchorLink[] = linksIn(translatedLines)
    .filter((link) => link.target.startsWith("/") && link.target.includes("#"))
    .map((link) => {
      const [path, anchor] = link.target.split("#");
      return { path, anchor };
    });

  return {
    ok: findings.every((finding) => finding.level !== "error"),
    findings,
    counts,
    anchorLinks,
  };
}
