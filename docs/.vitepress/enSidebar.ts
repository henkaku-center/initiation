// ABOUTME: 英語版(docs/en/)のサイドバー項目を、ディレクトリの中身から組み立てる。
// ABOUTME: 翻訳済みファイルを掲載し、初期ガイドを読む順に並べる。
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type SidebarItem = { text: string; link: string };

/** ディレクトリ以下の .md を相対パスで集める(パス順)。 */
function markdownFiles(root: string, prefix = ""): string[] {
  const entries = readdirSync(join(root, prefix), { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const files: string[] = [];
  for (const entry of entries) {
    const relativePath = prefix ? join(prefix, entry.name) : entry.name;
    if (entry.isDirectory()) files.push(...markdownFiles(root, relativePath));
    else if (entry.name.endsWith(".md")) files.push(relativePath);
  }
  return files;
}

const titleOf = (content: string, fallback: string): string =>
  content
    .split("\n")
    .find((line) => line.startsWith("# "))
    ?.replace(/^#\s+/, "")
    .trim() ?? fallback;

export function enSidebarItems(root: string): SidebarItem[] {
  if (!existsSync(root)) return [];

  const guideOrder = ["guide/introduction.md", "guide/setup.md", "guide/contributing.md"];
  const rank = (path: string): number => {
    const index = guideOrder.indexOf(path);
    return index < 0 ? guideOrder.length : index;
  };

  // トップページは翻訳ではなく個別に書くため、一覧には載せない。
  return markdownFiles(root)
    .filter((relativePath) => relativePath !== "index.md")
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((relativePath) => {
      const slug = relativePath.replace(/\.md$/, "");
      return {
        text: titleOf(readFileSync(join(root, relativePath), "utf-8"), slug.split("/").pop() ?? slug),
        link: `/en/${slug}`,
      };
    });
}
