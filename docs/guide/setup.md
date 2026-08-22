# 30分セットアップ

手元で開発画面を表示するまでの手順です。各ステップに、実行するコマンドと**成功したときに表示されるもの**を書いています。表示が違う場合は[トラブルシューティング](/guide/troubleshooting)を見てください。

::: info Windowsで前提ツールを初めて入れる場合
この30分は、Git、Node.js、npm、Docker Desktopがすでに動く状態からの目安です。WindowsでGitやターミナルを初めて使う場合は、先に[Windowsでゼロから始める](/guide/setup-windows)を進めてください。準備完了チェックを通過したところから、このコースへ戻ります。
:::

::: warning 秘密情報の扱い
このページで作る `.env.local` には秘密情報が入ります。コミット、Issue、Pull Request、チャットへ貼り付けないでください。`.gitignore` で除外されていますが、コマンドの実行結果を貼るときも値が含まれていないか確認してください。
:::

## 所要時間の目安

| 手順 | 目安 |
| --- | --- |
| 1. 前提ツールの確認 | 5分 |
| 2. リポジトリの取得と依存関係 | 5分 |
| 3. 環境変数の設定 | 5分 |
| 4. ローカルSupabaseの起動 | 10分（初回はDockerイメージの取得を含む） |
| 5. 開発サーバーの起動 | 2分 |
| 6. 動作確認 | 3分 |

初回はDockerイメージのダウンロードで時間がかかります。2回目以降は数分で終わります。

## 1. 前提ツールの確認

### 必須

**Node.js 22.0.0 以上**と**npm**が必要です。バージョン管理ツール（nvm、mise、Volta など）は各自の好みで構いません。

```bash
node -v
npm -v
```

成功時の例:

```
v24.4.1
11.4.2
```

`v22.0.0` 以上であれば問題ありません。表示されない場合は [Node.js](https://nodejs.org/) を入れてください。

::: warning Node.js 20 では動きません
このプロジェクトが使う `@supabase/supabase-js` などは Node.js 22 以上を要求します。Node.js 20 で進めると、次の手順の `npm install` で `EBADENGINE` という警告が出て、以降のビルドやテストでも警告が続きます。バージョンが古い場合は先に上げてください。
:::

**Git** も必要です。

```bash
git --version
```

### ローカルSupabaseを使う場合に必要

このプロジェクトはデータの保存にSupabase（PostgreSQL）を使います。ローカルSupabaseを使うフル動作確認と統合テストには **Docker Desktop** が必要です。ドキュメント作業や単体テストだけなら不要です。

```bash
docker version
```

成功時は、`Client` と `Server` の両方が表示されます。`Server` がなく接続エラーになる場合はDocker Desktopを起動してください。WindowsのWSL2環境で初めて準備する場合は、[Windows向けDocker手順](/guide/setup-windows#windows-docker-setup)を確認してください。

Supabase CLIは `npx` 経由で使うため、事前インストールは不要です。

### ウォレット

`/setup` 以降の画面を実際に操作するには、**MetaMask などのInjected Wallet**をブラウザに入れておく必要があります。ドキュメント修正など、画面操作を伴わない作業では不要です。

## 2. リポジトリの取得と依存関係のインストール

外部からコントリビュートする場合は、まずGitHub上でこのリポジトリをforkしてから、自分のforkをcloneします。

```bash
git clone https://github.com/<あなたのアカウント>/initiation.git
cd initiation
npm install
```

成功時の例:

```
added 461 packages, and audited 462 packages in 5s
```

::: tip なぜforkするのか
`henkaku-center/initiation` への書き込み権限がなくても、forkからPull Requestを出せます。権限を持っている場合は直接cloneしても構いません。
:::

## 3. 環境変数の設定

雛形をコピーします。

```bash
cp .env.example .env.local
```

`.env.local` を開いて値を設定します。各変数の意味は[環境変数一覧](/reference/environment)にあります。

### セッション暗号化キーを作る

`SESSION_PASSWORD` は32文字以上のランダムな文字列が必要です。

```bash
openssl rand -base64 32
```

出力された文字列を `.env.local` の `SESSION_PASSWORD=` に貼り付けます。**この値はターミナルに表示されるので、画面共有中の実行や、実行結果の貼り付けに注意してください。**

### 管理画面を使う場合

`/admin` を確認したい場合は、自分のウォレットアドレスを設定します。

```
ADMIN_ADDRESSES=0xあなたのアドレス
```

複数指定する場合はカンマ区切りです。設定を変えたら開発サーバーを再起動してください。

### HENKAKUトークンの設定

`NEXT_PUBLIC_HENKAKU_TOKEN_*` の4つは公開情報のため、`.env.example` に開発用の既定値が入っています。**変更は不要です。**

コピーした `.env.local` に次の値が入っていることだけ確認してください。空になっている場合は `/setup` の画面に「HENKAKU トークン設定がありません」と表示されます。

```
NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS=0x0cc91a5FFC2E9370eC565Ab42ECE33bbC08C11a2
NEXT_PUBLIC_HENKAKU_TOKEN_SYMBOL=HENKAKU
NEXT_PUBLIC_HENKAKU_TOKEN_DECIMALS=18
NEXT_PUBLIC_HENKAKU_TOKEN_LOGO_URL=https://raw.githubusercontent.com/henkaku-center/omise-interface/main/public/henkakuToken.png
```

このアドレスはPolygon上のHENKAKUトークンで、`/setup` がウォレットへ「トークンを追加しますか」と尋ねるときに渡す値です。値の根拠は[決定事項ログ](/decisions)に記録しています。

## 4. ローカルSupabaseの起動

Docker Desktopが起動していることを確認してから実行します。

```bash
npx supabase start
```

初回はDockerイメージのダウンロードが走るため数分かかります。成功時は接続情報が表示されます。次は出力の一部です。

```
Applying migration 20260806000001_core_tables.sql...

Authentication Keys
Publishable  sb_publishable_...
Secret       sb_secret_...

APIs
Project URL  http://127.0.0.1:54321
```

::: danger この出力にはキーが含まれます
`supabase start` と `supabase status` の出力には `Secret` が含まれます。この実行結果をそのままIssueやチャットへ貼らないでください。
:::

### 接続情報を .env.local へ設定する

```bash
npx supabase status
```

表示された値のうち、次の2つを `.env.local` へ書き写します。

| `supabase status` の項目 | `.env.local` の変数 |
| --- | --- |
| `APIs` の `Project URL` | `SUPABASE_URL` |
| `Authentication Keys` の `Secret` | `SUPABASE_SERVICE_ROLE_KEY` |

`Authentication Keys` の `Secret` は従来の `service_role` キーの後継で、サーバー側の処理にだけ使用します。`Storage (S3)` の `Secret Key` ではありません。このリポジトリでは既存の環境変数名 `SUPABASE_SERVICE_ROLE_KEY` に設定してください。`Publishable` はこのRepository接続には使用しません。詳しくは[Supabase公式のAPIキー解説](https://supabase.com/docs/guides/getting-started/api-keys)を参照してください。

### スキーマを適用する

```bash
npx supabase db reset
```

成功時:

```
Applying migration 20260806000001_core_tables.sql...
{"target":"local","version":"","message":"Reset local database."}
```

`WARN: no files matched pattern: supabase/seed.sql` が出ますが、初期データのファイルを置いていないためで、問題ありません。

::: tip ローカルSupabaseの管理画面
`http://127.0.0.1:54323` でSupabase Studioが開き、テーブルの中身を確認できます。
:::

## 5. 開発サーバーの起動

```bash
npm run dev -- --port 3000
```

成功時の例:

```
▲ Next.js 16.3.0 (Turbopack)
- Local:  http://localhost:3000
- Environments: .env.local
✓ Ready in 1200ms
```

`- Environments: .env.local` が出ていれば、環境変数が読み込まれています。

このコマンドは開発サーバーを起動し続けるため、ターミナルはログ表示に使われます。後のテストは、同じリポジトリを開いた別のターミナルで実行するか、このターミナルで `Ctrl+C` を押してサーバーを止めてから実行してください。

::: warning ウォレット確認には Local URL を使う
Next.js の出力に `Network: http://<LAN内IP>:3000` も表示される場合がありますが、標準の動作確認では **`Local: http://localhost:3000`** を開いてください。

Network URL では、Next.js の開発用JavaScriptが `403 Forbidden` になり、ページが見えていてもウォレット接続が動かないことがあります。別の端末からLAN経由で確認する設定は、このセットアップ手順の対象外です。
:::

::: warning ポートの重複
すでに開発サーバーが動いている場合、同じポートに新しいプロセスを重ねて起動しないでください。別のポートを使う場合は `--port 3001` のように指定します。
:::

## 6. 動作確認

ブラウザで `http://localhost:3000` を開きます。トップページが表示されたら、`http://localhost:3000/setup` でウォレット接続ボタンが動作することも確認します。

LAN内IPで開いて画面は表示されるのにウォレット接続が動かない場合は、[LAN内IPでは画面が表示されるのにウォレット接続が動かない](/guide/troubleshooting#wallet-connection-lan-ip)を確認してください。

続いて、テストが通ることを確認します。

```bash
npm test
```

成功時:

```
Test Files  15 passed (15)
     Tests  78 passed (78)
```

件数はテストが増えるたびに変わります。**`failed` が0で、すべて `passed` と表示されていれば成功**です。

::: tip 統合テストについて
テストは単体テストとローカルSupabaseを使う統合テストに分かれています。統合テストは `.env.local` のSupabase設定を自動で読み込むため、Supabaseを起動した状態で `npm test` を実行すれば両方が走ります。Supabaseを起動していない場合、統合テストは失敗します。
:::

最後に、他の検証コマンドも通ることを確認します。

```bash
npm run build
npx tsc --noEmit
npm run lint
```

::: warning 実行順に注意
`npx tsc --noEmit` は、Next.jsがビルド時に生成する型に依存します。**クローン直後は `npm run build` を先に実行してください。** 順番を逆にすると `Cannot find name 'LayoutProps'` というエラーが出ます。
:::

## うまくいかないとき

症状から原因を引けるようにしています。

→ [トラブルシューティング](/guide/troubleshooting)

## 次に読むもの

環境ができたら、実際に変更を加えてPull Requestを出すところまで進みます。

→ [最初のコントリビューション](/guide/contributing)
