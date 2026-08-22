// ABOUTME: 開発者向けドキュメントサイト(VitePress)の設定。
// ABOUTME: GitHub Pages配信のためbaseを /initiation/ に固定し、local searchを使う。
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";

const decisionsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "decisions");

// 決定事項は1決定1ファイルで増えていく(docs/decisions.md の記録方法)。
// ここへ手で追記する形にすると、決定を追加するPRが必ずこの設定ファイルで衝突する。
// ディレクトリを読んで組み立て、新しい日付が上に来るように並べる。
function decisionItems() {
  return readdirSync(decisionsDir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .reverse()
    .map((name) => {
      const firstHeading = readFileSync(join(decisionsDir, name), "utf-8")
        .split("\n")
        .find((line) => line.startsWith("# "));
      return {
        text: firstHeading?.replace(/^#\s+/, "") ?? name.replace(/\.md$/, ""),
        link: `/decisions/${name.replace(/\.md$/, "")}`,
      };
    });
}

export default defineConfig({
  lang: "ja",
  title: "HENKAKU Initiation 開発者ドキュメント",
  description:
    "HENKAKU Initiationの開発に参加するための手引き。環境構築から最初のPull Requestまでを案内します。",

  // GitHub Pages: https://henkaku-center.github.io/initiation/
  base: "/initiation/",

  // 実装計画は分量が大きく、読み進める導線には載せないためサイトからは除外する。
  // リポジトリ上のファイルとしては従来どおり参照できる。
  srcExclude: ["superpowers/**"],

  lastUpdated: true,
  cleanUrls: true,

  // リンク切れをビルド失敗として扱う(VitePressの既定動作を明示)。
  // 例外は decisions.md からディレクトリ自体へのリンクのみ。GitHub上ではファイル一覧
  // として機能するが、サイト側には対応するページがない(一覧はサイドバーが持つ)。
  // (VitePressは末尾スラッシュを /index に正規化してから照合する)
  ignoreDeadLinks: [/^\.\/decisions\/index$/],

  head: [["meta", { name: "theme-color", content: "#0f172a" }]],

  themeConfig: {
    siteTitle: "HENKAKU Initiation",

    nav: [
      { text: "はじめに", link: "/guide/introduction" },
      { text: "30分セットアップ", link: "/guide/setup" },
      { text: "コントリビューション", link: "/guide/contributing" },
      { text: "リファレンス", link: "/reference/commands" },
    ],

    sidebar: [
      {
        text: "はじめに",
        items: [
          { text: "HENKAKU Initiationとは", link: "/guide/introduction" },
          { text: "30分セットアップ", link: "/guide/setup" },
          { text: "最初のコントリビューション", link: "/guide/contributing" },
        ],
      },
      {
        text: "理解を深める",
        items: [
          { text: "プロジェクトの構成", link: "/guide/architecture" },
          { text: "トラブルシューティング", link: "/guide/troubleshooting" },
        ],
      },
      {
        text: "環境別ガイド",
        collapsed: true,
        items: [
          { text: "Windowsでゼロから始める", link: "/guide/setup-windows" },
        ],
      },
      {
        text: "リファレンス",
        items: [
          { text: "検証コマンド一覧", link: "/reference/commands" },
          { text: "環境変数一覧", link: "/reference/environment" },
          { text: "開発計画", link: "/development-plan" },
          { text: "決定事項の読み方", link: "/decisions" },
          { text: "手動運用Runbook", link: "/runbook-manual-operations" },
        ],
      },
      {
        text: "決定事項ログ",
        collapsed: true,
        items: decisionItems(),
      },
    ],

    // 外部サービスやAPIキーを必要としないlocal searchを使う
    search: {
      provider: "local",
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: "検索", buttonAriaLabel: "検索" },
              modal: {
                noResultsText: "見つかりませんでした",
                resetButtonTitle: "検索条件をリセット",
                footer: {
                  selectText: "選択",
                  navigateText: "移動",
                  closeText: "閉じる",
                },
              },
            },
          },
        },
      },
    },

    editLink: {
      pattern: "https://github.com/henkaku-center/initiation/edit/main/docs/:path",
      text: "このページをGitHubで編集する",
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/henkaku-center/initiation" },
    ],

    docFooter: { prev: "前のページ", next: "次のページ" },
    outline: { label: "このページの内容" },
    lastUpdatedText: "最終更新",
    returnToTopLabel: "トップへ戻る",
    darkModeSwitchLabel: "テーマ",
    sidebarMenuLabel: "メニュー",

    footer: {
      message:
        "秘密情報（SESSION_PASSWORD、Supabaseキー、Safeの認証情報）はドキュメント・Issue・ログへ貼らないでください。",
      copyright: "HENKAKU Initiation",
    },
  },
});
