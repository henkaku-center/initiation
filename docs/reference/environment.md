# 環境変数一覧

変数名の一覧は `.env.example` にあります。値は `.env.local` に設定します。

::: danger 秘密情報の扱い
`.env.local` はコミットされません（`.gitignore` で `.env*` を除外）。値をIssue、Pull Request、チャット、コマンドの実行結果へ貼り付けないでください。
:::

## 一覧

| 変数 | 用途 | 公開可否 |
| --- | --- | --- |
| `SESSION_PASSWORD` | セッション暗号化。32文字以上が必須 | 非公開 |
| `SIWE_ALLOWED_DOMAINS` | SIWE署名を受け付けるドメイン（カンマ区切り） | 公開可・既定値あり |
| `SUPABASE_URL` | Supabaseの接続先 | 環境による |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー側Repositoryの接続 | 非公開 |
| `ADMIN_ADDRESSES` | 管理画面を使えるウォレット（カンマ区切り） | アドレス自体は公開情報だが環境変数で管理 |
| `NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS` | Polygon上のHENKAKUコントラクト | 公開可・既定値あり |
| `NEXT_PUBLIC_HENKAKU_TOKEN_SYMBOL` | トークン表示名 | 公開可・既定値あり |
| `NEXT_PUBLIC_HENKAKU_TOKEN_DECIMALS` | トークン小数桁 | 公開可・既定値あり |
| `NEXT_PUBLIC_HENKAKU_TOKEN_LOGO_URL` | ウォレット表示用ロゴ | 公開可・既定値あり |
| `SAKURA_AI_API_KEY` | AI Engineスパイク用キー | 非公開・現在は本番未使用 |
| `SAKURA_AI_BASE_URL` | AI EngineのベースURL | 環境変数で管理 |

`NEXT_PUBLIC_` で始まる変数は**ブラウザへ送られます。** 秘密情報をこの接頭辞で定義しないでください。

## 設定のしかた

### SESSION_PASSWORD

32文字以上のランダムな文字列を生成します。

```bash
openssl rand -base64 32
```

未設定または32文字未満の場合、`SESSION_PASSWORD must be at least 32 characters` が発生します。

**この値を変更すると、既存のセッションはすべて無効になります。** セッションはこの値で暗号化されたCookieに入っているため、鍵が変わると復号できなくなり、サインイン済みのメンバー全員が再度ウォレットで署名し直すことになります。本番稼働後に変更する場合は、影響を承知したうえで行ってください。

### SIWE_ALLOWED_DOMAINS

SIWEの署名メッセージに書かれた `domain` が、このリストに含まれるときだけサインインを受け付けます。ブラウザが送る `Host` ヘッダーではなくこの設定値と比較するため、**別のサイト向けに作られた署名を受け付けません。**

```
SIWE_ALLOWED_DOMAINS=localhost:3000
```

`.env.example` に `localhost:3000` が入っているので、通常のローカル開発では変更不要です。

- ポートを含めて書きます（ブラウザの `location.host` と同じ形式です）
- カンマ区切りで複数指定できます。大文字小文字は区別されません
- **未設定だとサインインは必ず失敗します**（`domain not configured`）。設定漏れが「誰でも通る」側に倒れないようにするためです

`npm run dev -- --port 3001` のように別のポートで動かす場合は、そのポートを含む値へ変更してください。

### SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY

ローカル開発では `npx supabase status` の出力から設定します。

| `supabase status` の項目 | 設定先 |
| --- | --- |
| `APIs` の `Project URL` | `SUPABASE_URL` |
| `Authentication Keys` の `Secret` | `SUPABASE_SERVICE_ROLE_KEY` |

`Authentication Keys` の `Secret` は従来の `service_role` キーの後継です。このリポジトリでは既存の環境変数名 `SUPABASE_SERVICE_ROLE_KEY` に設定します。`Storage (S3)` に表示される `Secret Key` ではありません。`Publishable` はサーバー側Repositoryの接続には使用しません。

### ADMIN_ADDRESSES

`/admin` を開けるウォレットアドレスをカンマ区切りで指定します。大文字小文字は区別されません（内部で正規化されます）。

```
ADMIN_ADDRESSES=0xaaa...,0xbbb...
```

**変更後は開発サーバーまたはデプロイの再起動が必要です。** 環境変数はプロセス起動時に読み込まれるためです。

`ADMIN_ADDRESSES` は管理画面へのアクセス制御にだけ使われ、トークンの配布権限を与えるものではありません。

### NEXT_PUBLIC_HENKAKU_TOKEN_*

Polygon上のHENKAKUトークンの情報です。4つとも公開情報のため `.env.example` に開発用の既定値が入っており、**通常は変更不要です。**

| 変数 | 既定値 |
| --- | --- |
| `NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS` | `0x0cc91a5FFC2E9370eC565Ab42ECE33bbC08C11a2` |
| `NEXT_PUBLIC_HENKAKU_TOKEN_SYMBOL` | `HENKAKU` |
| `NEXT_PUBLIC_HENKAKU_TOKEN_DECIMALS` | `18` |
| `NEXT_PUBLIC_HENKAKU_TOKEN_LOGO_URL` | `https://raw.githubusercontent.com/henkaku-center/omise-interface/main/public/henkakuToken.png` |

`ADDRESS` が未設定だと `/setup` に「HENKAKU トークン設定がありません」と表示されます。

`/setup` はこれらを `wallet_watchAsset` でウォレットへ渡します。**誤ったアドレスを設定すると、利用者が意図しないトークンを自分のウォレットへ追加してしまいます。** 値を変える場合は根拠を[決定事項ログ](/decisions)へ記録してください。

`SYMBOL` と `DECIMALS` は未設定でも `HENKAKU` / `18` が既定値として使われます（`lib/henkakuToken.ts`）。`LOGO_URL` は任意で、未設定ならウォレット側の既定表示になります。

### SAKURA_AI_API_KEY / SAKURA_AI_BASE_URL

さくらのAI Engineの検証（フェーズ0のスパイク）で使ったものです。現在アプリの本番機能では使っていません。AIの導入はフェーズ3の予定です。

## テスト実行時の扱い

Vitestは `.env.local` を自動で読み込みます（`vitest.config.ts`）。すでにシェルで設定されている環境変数は上書きしないため、CIなどで環境変数を直接渡す方法も使えます。`.env.local` がない環境では何もしません。

## 関連

- [30分セットアップ](/guide/setup)
- [検証コマンド一覧](/reference/commands)
- [手動運用Runbook](/runbook-manual-operations)
