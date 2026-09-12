// ABOUTME: 翻訳したMarkdownを原文と比べ、結果を日本語で1画面に出すCLI。
// ABOUTME: 構造の不一致と、レビューが必要な日本語・見出しリンクを報告する。
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkTranslation, sourcePathOf } from "./checkTranslation";

const DOCS = "docs";

/** VitePressの見出しIDに寄せた簡易版。完全一致ではないため、外れたら警告に留める。 */
const slugify = (heading: string): string =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[\s\t]+/g, "-")
    .replace(/[^\p{L}\p{N}_-]+/gu, "");

function anchorsOf(markdown: string): Set<string> {
  const anchors = new Set<string>();
  for (const line of markdown.split("\n")) {
    const heading = /^#{1,6}\s+(.+?)\s*$/.exec(line)?.[1];
    if (heading) anchors.add(slugify(heading));
  }
  return anchors;
}

/** リンクのパスから実ファイルを引く。cleanUrls のため拡張子は付いていない。 */
function fileForLinkPath(linkPath: string): string | null {
  const relative = linkPath.replace(/^\//, "");
  for (const candidate of [join(DOCS, `${relative}.md`), join(DOCS, relative, "index.md")]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function main(): void {
  const translatedPath = process.argv[2];
  if (!translatedPath) {
    console.error("使い方: npm run docs:check -- docs/en/guide/introduction.md");
    process.exit(2);
  }

  const sourcePath = sourcePathOf(translatedPath);
  for (const path of [sourcePath, translatedPath]) {
    if (!existsSync(path)) {
      console.error(`ファイルが見つかりません: ${path}`);
      process.exit(2);
    }
  }

  const result = checkTranslation(
    readFileSync(sourcePath, "utf-8"),
    readFileSync(translatedPath, "utf-8"),
  );

  console.log(`\n${translatedPath}`);
  console.log(`  ← ${sourcePath}\n`);
  for (const count of result.counts) {
    const mark = count.ok ? "✓" : "✗";
    console.log(
      `  ${count.label.padEnd(8, "　")} 原文 ${String(count.source).padStart(3)} → 訳文 ${String(count.translated).padStart(3)}  ${mark}`,
    );
  }

  // アンカーはVitePressのビルドでは検査されない。ここで見ないと静かに壊れる。
  const brokenAnchors: string[] = [];
  for (const link of result.anchorLinks) {
    const file = fileForLinkPath(link.path);
    if (!file) continue;
    if (!anchorsOf(readFileSync(file, "utf-8")).has(slugify(link.anchor))) {
      brokenAnchors.push(`${link.path}#${link.anchor}`);
    }
  }

  const errors = result.findings.filter((finding) => finding.level === "error");
  const warnings = result.findings.filter((finding) => finding.level === "warning");

  if (errors.length > 0) {
    console.log(`\n✗ 直す必要がある点が ${errors.length} 件あります`);
    for (const finding of errors) console.log(`  [${finding.label}] ${finding.detail}`);
  }

  if (warnings.length > 0 || brokenAnchors.length > 0) {
    console.log(`\n△ 確認したほうがよい点があります`);
    for (const finding of warnings) console.log(`  [${finding.label}] ${finding.detail}`);
    for (const anchor of brokenAnchors) {
      console.log(`  [見出しへのリンク] ${anchor} の見出しが見つかりません`);
    }
  }

  if (errors.length === 0 && warnings.length === 0 && brokenAnchors.length === 0) {
    console.log("\n✓ 問題は見つかりませんでした");
  }

  console.log("");
  process.exit(errors.length > 0 ? 1 : 0);
}

main();
