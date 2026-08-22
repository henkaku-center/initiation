# 最初のコントリビューション

Issueを選んでからPull Requestを出すまでの流れです。[30分セットアップ](/guide/setup)が終わっている前提で進めます。

## 全体の流れ

1. Issueで目的と変更範囲を共有する
2. 初回だけGitの名前とメールを設定する
3. `main` から作業ブランチを作る
4. テストを先に追加する
5. 実装して検証コマンドを実行する
6. Pull Requestを出す

## 1. Issueを選ぶ

[Issue一覧](https://github.com/henkaku-center/initiation/issues)から始めます。`good first issue` や `documentation` のラベルが目印です。

取り組むIssueが決まったら、**コメントで宣言してから始めてください。** 同じ作業が重複するのを防げます。

Issueがない変更を提案したい場合は、先にIssueを立てて目的と変更範囲を共有します。いきなり大きなPull Requestを出すより、先に方向性を合わせたほうが早く進みます。

::: warning 判断が必要なことは先に記録する
仕様やライブラリの選定など、判断が必要な事項は勝手に決めずに、[決定事項](/decisions)として記録してから実装します。判断の理由が残っていないと、後から見直せなくなるためです。

記録は `docs/decisions/` に**1つの決定につき1ファイル**を `YYYY-MM-DD-短い識別子.md` という名前で追加します（既存のファイルへ追記はしません）。こうしておくと、複数のPull Requestが同時に決定を追加しても衝突しません。
:::

## 2. 初回だけGitの名前とメールを設定する

コミットには作成者の名前とメールアドレスが記録されます。まだ設定していない場合は、`YOUR_GITHUB_NAME` を自分のGitHubユーザー名へ置き換えます。

```bash
git config --global user.name "YOUR_GITHUB_NAME"
```

普段のメールアドレスをコミットへ載せたくない場合は、[GitHubのEmails設定](https://github.com/settings/emails)で `Keep my email addresses private` をオンにし、表示される `noreply` アドレスを設定します。

```bash
git config --global user.email "YOUR_NOREPLY_EMAIL"
```

詳しくは[GitHub公式のコミットメール設定](https://docs.github.com/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)を確認してください。すでに設定済みの場合、この手順は不要です。

## 3. 作業ブランチを作る

`main` から分岐します。

```bash
git checkout main
git pull origin main
git checkout -b agent/navigation-readme
```

ブランチ名は変更内容が分かるものにしてください（例: `agent/navigation-readme`、`fix/apply-status-label`）。

## 4. テストを先に追加する

このプロジェクトは**テストを先に書く**方針です。まず失敗するテストを追加し、それから実装します。

テストの置き場所は内容によって分かれています。

| 置き場所 | 対象 | ローカルSupabase |
| --- | --- | --- |
| `tests/unit/` | Server Action、ドメインロジック、認可ガードなど | 不要 |
| `tests/integration/` | Supabaseへ接続するRepository | **必要** |
| `tests/support/` | 統合テスト用のDB初期化・補助コード | — |

Vitestの対象は `tests/**/*.test.ts` です。

### テストを書くときの目安

- ドメインロジック（`lib/domain/`）はDBやNext.jsに依存しない純粋関数なので、単体テストを書きやすい場所です
- Server Actionのテストは、Repositoryと認可ガードをモックして、**不正な入力でRepositoryを呼ばないこと**まで確認します
- Repositoryの振る舞い（ユニーク制約、監査ログ）は統合テストで確認します

既存のテストが良い参考になります。まず似たテストを探してください。

```bash
ls tests/unit/app/admin/
ls tests/integration/
```

## 5. 実装して検証する

実装したら、次を順に実行します。

```bash
npm test
npm run build
npx tsc --noEmit
npm run lint
```

すべて通ることを確認してからPull Requestを出します。コマンドの詳細は[検証コマンド一覧](/reference/commands)にあります。

::: tip 落ちたときは
`Cannot find name 'LayoutProps'` は `npm run build` を先に実行すれば解消します。統合テストが `SUPABASE_SERVICE_ROLE_KEY` で失敗する場合は、ローカルSupabaseが起動しているか確認してください。→ [トラブルシューティング](/guide/troubleshooting)
:::

## 6. Pull Requestを出す

forkへpushしてからPull Requestを作成します。

```bash
git push -u origin <ブランチ名>
```

### Pull Requestに書くこと

次の3つを本文に含めてください。

**変更理由** — なぜこの変更が必要なのか。Issueがある場合は `Closes #123` を書くと、マージ時にIssueが自動で閉じます。

**検証内容** — 何をどう確認したか。実行したコマンドと結果を書きます。「テストが通りました」だけでなく、何件通ったか、どんなケースを追加したかが分かると読み手が助かります。

**未解決の判断** — 判断に迷った点、別途決める必要がある点。ここを書いておくと、レビューで論点が明確になります。

### UI を変更した場合

スクリーンショット、または手動で確認する手順を添えてください。`/admin` のように管理者ウォレットでのサインインが必要な画面は、スクリーンショットを撮りにくいので、確認手順を書くほうが現実的です。

### やってはいけないこと

- **秘密情報や個人情報をコミットしない。** `.env.local`、Supabaseのキー、ウォレットの秘密鍵、Safeの認証情報は絶対に含めません
- コマンドの実行結果を貼るときも、キーが混ざっていないか確認してください

## ライセンスの前提

このリポジトリはソフトウェアと創作物でライセンスを分けています。**コードとドキュメントは [MIT License](https://github.com/henkaku-center/initiation/blob/main/LICENSE)、イラストや音源などの創作物は [CC BY 4.0](https://github.com/henkaku-center/initiation/blob/main/LICENSE-CC-BY-4.0.txt)** です。

Pull Requestは、この区分に沿ったライセンスで提供されたものとして扱います（inbound = outbound）。

自分が権利を持たないコード・文章・創作物を含める場合は、**出典と元のライセンスをPull Requestに書いてください。** 創作物を追加するときの許諾と帰属表示の手順は [CONTRIBUTING.md](https://github.com/henkaku-center/initiation/blob/main/CONTRIBUTING.md) にあります。

## Next.js に関する変更をするとき

このプロジェクトが使っているNext.jsのバージョンは、学習済みの知識と挙動が異なる場合があります。変更前に、リポジトリの `AGENTS.md` と `node_modules/next/dist/docs/` の該当ガイドを確認してください。

## 次に読むもの

コードの構成を理解すると、変更する場所を見つけやすくなります。

→ [プロジェクトの構成](/guide/architecture)
