# 検証コマンド一覧

Pull Requestを出す前に実行するコマンドです。

## 検証コマンド

```bash
pnpm test
pnpm run build
pnpm exec tsc --noEmit
pnpm run lint
```

| コマンド | 内容 | 備考 |
| --- | --- | --- |
| `pnpm test` | Vitestで単体テストと統合テストを実行 | 統合テストはローカルSupabaseの起動が必要 |
| `pnpm run build` | Next.jsの本番ビルド | 型チェックの前に実行する |
| `pnpm exec tsc --noEmit` | TypeScriptの型チェック | ビルドが生成する型に依存する |
| `pnpm run lint` | ESLint | |

::: warning 実行順
`pnpm exec tsc --noEmit` はNext.jsがビルド時に生成する型（`LayoutProps` など）に依存します。クローン直後は `pnpm run build` を先に実行してください。
:::

## 開発サーバー

```bash
pnpm run dev --port 3000
```

既存の開発サーバーがある場合、同じポートに新しいプロセスを重ねて起動しないでください。

## テストの絞り込み

```bash
# 単体テストのみ（Supabase不要）
npx vitest run tests/unit

# 統合テストのみ（Supabaseの起動が必要）
npx vitest run tests/integration

# 名前で絞り込む
npx vitest run -t "transition"
```

テストの対象は `tests/**/*.test.ts` です。

| 置き場所 | 対象 | ローカルSupabase |
| --- | --- | --- |
| `tests/unit/` | Server Action、ドメイン、認可ガード | 不要 |
| `tests/integration/` | Supabaseへ接続するRepository | 必要 |
| `tests/support/` | 統合テスト用のDB初期化・補助コード | — |

## ローカルSupabase

```bash
npx supabase start    # 起動（初回はイメージ取得で時間がかかる）
npx supabase status   # 接続情報の確認
npx supabase db reset # スキーマをmigrationから再適用（データは消える）
npx supabase stop     # 停止
```

::: danger 出力の扱い
`supabase start` と `supabase status` の出力には `Secret` が含まれます。実行結果をそのままIssueやチャットへ貼らないでください。
:::

Supabase Studio は `http://127.0.0.1:54323` で開けます。

## ドキュメントサイト

このサイト自体の確認に使います。

```bash
pnpm run docs:dev      # ローカルで確認
pnpm run docs:build    # 静的ビルド（リンク切れがあると失敗する）
pnpm run docs:preview  # ビルド結果を確認
```

## 関連

- [30分セットアップ](/guide/setup)
- [環境変数一覧](/reference/environment)
- [トラブルシューティング](/guide/troubleshooting)
