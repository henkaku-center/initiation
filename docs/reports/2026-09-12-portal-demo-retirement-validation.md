# 2026-09-12 模擬ポータル廃止の検証記録

## 対象

- 開始時のSHA: `06acc4c185e8aab4faa00b8044826668ec314f98`。作業ツリーはクリーン。PR #105は未マージ・レビュー可能な状態で、Draftには戻していない。
- **Local-verifiedの実装SHA: `6409275477fa24e8fe7a874109f489547637f411`**。
- 検証コピーとコミットの303ファイルの一致を確認。パス順のSHA-256一覧のハッシュは `889512908f1ae440c2f4d7d40ad0b3dcac2903b39105668021054d6bd6a91455`。本報告書の追加コミットは実装を変更しない。
- 前回の[通常アプリ接続の記録](./2026-09-12-portal-app-validation.md)にあるデモbuild・411テストの結果は、今回の結果として流用していない。

## 変更

| 範囲 | 対象ファイル | 結果 |
| --- | --- | --- |
| 模擬画面と状態 | `app/demo/page.tsx`、`components/demo/`、`lib/demo/` | 専用画面、ウォレット・回答・審査・報酬のシミュレーター、ストアを削除 |
| 共通UI | `components/portal/{ReferenceGatewayView,PortalDialog,CommunityCards}.tsx`、同ディレクトリのCSS | 通常版が利用する部品を移動。デモ操作と模擬状態の引数を除去し、外観を保持 |
| 通常入口 | `app/{layout,page}.tsx`、Setup・Initiation・Apply・Checkin・Adminのページ、`next.config.ts` | 常に実Providersを利用。旧 `/demo` は308でHomeへ進み、フラグメントを通常URLへ解決 |
| ビルドと設定 | `package.json`、`.env.example`、`.github/workflows/ci.yml`、`proxy.ts` | デモのコマンド・環境変数・Proxy・CIビルドを削除。既存の認証APIと認可を維持 |
| Gateway生成 | `scripts/gateway/build-gateway.mjs`、`assets/reference/gateway/gateway-data.js`、生成HTML・JS | 通常URLを持つ一組へ統一。使われていない模擬視聴履歴とYouTubeプレーヤーコードを削除 |
| 案内とテスト | `docs/guide/portal-*.md`、廃止の決定文書、`tests/unit/lib/portal/`、`tests/browser/` | 操作・公開切替・切り戻しを更新。廃止機能のテストを除き、通常経路と旧URLの回帰を追加 |

画像・音源・ライセンス・出典は保持した。素材URLの `public/demo-assets/` は継続利用する。HomeのFREQUENCY、PODCASTの4場面とYouTube削除、5問・再編集、申請・チェックインの実処理を保つ。旧localStorageは読み書き・移行しない。

## Local-verified

Node 22.23.1、Next.js 16.3.4、Vitest 5.0.0、Chromium 151.0.7922.34。既存3000番のサーバーとは別の検証コピーと3102番を使用。サービスは専用ローカルSupabase（API 65421、DB 65422）。公開の設定例以外のenvファイル、本番・ステージングの認証情報は持ち込んでいない。

| コマンド | 実際の結果 |
| --- | --- |
| `npm run build` | 成功。`/demo` 画面とProxyがなく、実認証API・参加ページが残る |
| `npx tsc --noEmit` | build後に成功 |
| `npm run lint` | 成功、エラー・警告なし |
| `npm test` | **45ファイル、368件成功（単体346＋統合22）**。最終実行20:19 JST |
| `npm run docs:build` | 成功。本報告書を追加した状態でも確認 |
| `npm run docs:check -- <対象>` | CI対象の英語ガイド3件とREADME.en.mdを1件ずつ実行。成功、下記の既存アンカー警告2件 |
| `npm audit --omit=dev --audit-level=high` | 成功、本番依存の脆弱性0件 |
| `node tests/browser/portal.mjs ...` | 成功。一時鍵の実SIWE、保存・再開・再編集・申請・チェックイン・別アカウント分離 |
| `node tests/browser/portal-home.mjs ...` | 成功。5画面×3幅×2配色、画像読み込み、旧デモURL、フォーカス復帰 |
| `node tests/browser/frequency.mjs ...` | 固定応答による検証が成功。取得中・失敗・再試行・空状態・4曲と出典・PODCAST・配色 |
| `git diff --check`、staged privacy-check | 成功 |

サービス用の値は `tests/browser/local-env.rb` から子プロセスへ渡し、ログに出していない。手順と引数は[ブラウザ検証ガイド](https://github.com/henkaku-center/initiation/blob/6409275477fa24e8fe7a874109f489547637f411/tests/browser/README.md)に記録している。デモbuildは廃止したため検証対象ではない。

ブラウザでは署名待ち・拒否・認証失敗・セッション取得失敗、保存失敗と再試行、5件のサーバー記録、再編集、重複申請、JSTの日付偽装と重複チェックイン、切替・切断後の旧ユーザー状態、他人のID・不明な質問ID、管理者画面の一般ユーザー拒否を確認した。実ウォレットには署名を要求していない。

旧 `/demo`、`#home`、`#setup`、`#journey`、`#community`、`#passport`、不明なフラグメントの移動と再読込を確認した。承認済み等へ改変した旧localStorageから完走を復元せず、模擬操作も表示しない。Communityのサンプルは実募集と区別し、参加受付は無効のまま。ダイアログはEscapeと閉じるボタンの両方で元のカードへフォーカスが戻る。

画面幅360/768/1440px、ライト・ダーク、キーボードを確認。背景、探索者、Setupの2カラム、Passportの4画像、Communityの3画像を読み込んで目視した。画像はローカル検証成果物に保存し、Gitには含めていない。

## 失敗からの修正

デモ操作・旧フラグ・二重生成物・模擬履歴・設定例の廃止は、追加したテストの失敗を確認してから実装した。共通ダイアログは閉じた後のフォーカス復帰テストで失敗したため、起動元を保持して明示的に戻すよう修正した。

最初のbuildはサンドボックスのポート作成拒否で失敗し、そのエラーが検証用Turbopack出力にも残った。出力を退避し、許可された通常buildでコンパイルを確認した。続いて新規テストの `LayoutProps` に必須の `params` がない型エラーとchildrenの渡し方のlintエラーを修正し、両チェックが成功した。ビルド方式や検証条件は緩めていない。

検証コピーの同期は削除も反映するよう修正した。画像の検証はアニメーションの停止を待つ方式ではなく、スクロール後のデコード完了を確認する。翻訳チェックの既存警告は `windows-docker-setup` と `wallet-connection-lan-ip`。原文に両アンカーが存在し、docs buildも成功している。今回の変更ではないため検査ツールは変更していない。

## CIと未検証範囲

この文書の作成時点では、今回のコミットのCIは未確認。同一PR HEADの結果を確認してPR本文と最終報告へ追記する。過去のCIの緑を今回の成功として扱わない。

**Unverified:** 実ウォレット拡張、Safari/Firefox、運営ウォレットでのブラウザ審査、公開環境の設定・デプロイ・認証・DB、オンチェーン操作。この削除ではListenBrainz実APIへの再アクセスは行っていない。FREQUENCYのAPI実装は変更せず、今回の画面検証には固定応答を使用した。

残高、NFT発行、報酬claim、ロール付与、本人からの追加確認送信などは準備中のまま。機能追加やスキーマ変更は含めていない。会員の音楽共有は構想であり、履歴は収集しない。Pulseの動的取得はIssue #104、その他は#52・#91等の後続判断として残し、自動クローズしない。

## 公開とロールバック

追加migration・依存バージョン変更・APIキーは不要。既存の認証・Supabase設定は必要。公開時は許可を得てBuild Commandを `npm run build` に揃え、以前の `build:demo` 上書きと不要な `HENKAKU_DEMO_ONLY` 設定を取り除く。noindexは維持する。

ロールバックは記録した以前のデプロイへ戻す。現行コードから模擬版をビルドする経路はない。DB記録は保持し、データ削除・逆migration・デモ進捗の移行は不要。手順は[ポータルアプリ](../guide/portal-app.md#公開切替とロールバック)を参照。この作業ではマージ・デプロイ・本番DB変更・実署名・資産操作を行っていない。
