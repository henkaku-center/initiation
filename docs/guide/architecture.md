# プロジェクトの構成

コードのどこに何があるか、そしてウォレット・SIWE・Supabaseがそれぞれ何のためにあるのかを説明します。

## ディレクトリの責務

| ディレクトリ | 責務 |
| --- | --- |
| `app/` | ページ、Server Action、API Route |
| `components/` | Client Componentを含む画面部品 |
| `lib/domain/` | DBやNext.jsに依存しない型・状態遷移・純粋ロジック |
| `lib/repositories/` | Supabase依存を隔離するRepository契約と実装 |
| `lib/auth/` | SIWEセッションからmember / adminを解決する認可ガード |
| `supabase/migrations/` | スキーマの変更履歴 |
| `tests/` | 単体テストと統合テスト |
| `docs/` | 開発計画、決定事項、運用Runbook、このドキュメントサイト |

この分け方には理由があります。**`lib/domain/` を外部依存から切り離してあるので、状態遷移のルールをDBなしでテストできます。** また `lib/repositories/` にSupabaseへの依存を閉じ込めてあるので、将来DBを差し替える場合の影響範囲が限定されます。

## 用語

### ウォレット

ブロックチェーン上のアカウントを管理するツールです。MetaMaskなどのブラウザ拡張が代表的で、このアプリでは**本人確認の手段**として使います。

アプリは `wagmi` と `viem` というライブラリを通してウォレットとやりとりします。

- ウォレットの接続
- Polygonネットワークへの切り替え
- HENKAKUトークンをウォレットの表示に追加する（`wallet_watchAsset`）

### SIWE（Sign-In with Ethereum）

ウォレットの署名でサインインする仕組みです。メールアドレスとパスワードの代わりに、**「このウォレットの持ち主である」ことを署名で証明します。**

流れは次のとおりです。

1. サーバーが一回限りの `nonce`（使い捨ての文字列）を発行してセッションに保存する（`app/api/auth/nonce/`）
2. ブラウザがその `nonce` を含むメッセージにウォレットで署名する
3. サーバーが署名を検証する（`app/api/auth/verify/` と `lib/siwe.ts`）
4. 検証に成功したらセッションへアドレスを保存する

`nonce` を使い捨てにしているのは、**同じ署名を再利用した「なりすまし」を防ぐため**です。検証の成功・失敗にかかわらず、試行後に破棄されます。

サーバーが確認しているのは `nonce` だけではありません。`lib/siwe.ts` は次をすべて満たさないと検証を通しません。

| 確認する項目 | 内容 |
| --- | --- |
| `nonce` | サーバーが発行し、セッションに保存した使い捨ての値と一致するか |
| `domain` | `SIWE_ALLOWED_DOMAINS` に含まれるか |
| `uri` | `http` / `https` で、`domain` と同じホストを指しているか |
| `chainId` | Polygon（137）か |
| `expirationTime` | 期限が書かれていて、まだ切れておらず、15分以内か |
| 署名 | メッセージに書かれたアドレスの署名か |

`domain` を**リクエストの `Host` ヘッダーではなく環境変数と比較する**のがポイントです。`Host` は署名メッセージと同じ送信者が決められる値なので、それ同士を突き合わせても「このサービス宛の署名か」の確認になりません（[Issue #29](https://github.com/henkaku-center/initiation/issues/29) / [決定事項](/decisions/2026-08-09-siwe-verification)）。

有効期限をサーバー側で必須にしているのも同じ理由です。署名メッセージを組み立てるのはブラウザ側なので、サーバーが必須にしなければ期限のないメッセージも通ってしまいます。

### セッション

セッションは `iron-session` で暗号化されたCookieに保存します（`lib/session.ts`）。サーバー側にセッションを保存するテーブルはありません。`SESSION_PASSWORD` はこの暗号化に使われるため、32文字以上が必須です。

| 項目 | 値 |
| --- | --- |
| 有効期限 | **14日**（`SESSION_TTL_SECONDS`） |
| 期限の起点 | **サインインした時点。** ページを見ても延長されません |
| Cookie属性 | `HttpOnly` / `SameSite=lax` / `Path=/`。`Secure` は本番のみ |

期限は**サーバー側でも効きます**。Cookieの `Max-Age` だけでなく、暗号化されたデータ自体が期限を持っていて、期限切れのCookieを送ってもサーバーは「サインインしていない」として扱います。切れたときは `requireMember()` が `UnauthenticatedError` になり、各ページはサインインを促す表示に戻ります。

`POST /api/auth/logout` はセッションを破棄します。呼ばれるのは次の3つです。

| 契機 | 置き場所 | 効く範囲 |
| --- | --- | --- |
| ヘッダーのサインアウト | `components/SessionStatus.tsx` | 全ページ |
| ウォレットのアカウントが変わった | `lib/useWalletSessionGuard.ts`（`SessionStatus` から呼ぶ） | 全ページ |
| Polygon以外のチェーンへ変わった | `components/SignInWithEthereum.tsx` | `/setup` のみ |

**アカウントのずれは全ページで検知します。** `SessionStatus` がルートレイアウト経由で全ページに乗るため、そこへ置いています。

**チェーンのずれは `/setup` でしか見ません。** 署名が証明しているのは「そのアドレスの持ち主であること」で、今つないでいるネットワークはその証明を無効にしません。全ページで見ると、Polygonへの接続を前提にしない `/checkin` や `/apply` でネットワークを切り替えただけでサインアウトされてしまいます。

### 認可ガード

`lib/auth/guards.ts` に2つの関数があります。

- `requireMember()` — サインイン済みのメンバーを解決する。していなければ `UnauthenticatedError`
- `requireAdmin()` — さらに `ADMIN_ADDRESSES` に含まれるかを確認する。含まれなければ `ForbiddenError`

ページやServer Actionは必ずこのどちらかを通します。`/admin` は認可に失敗すると404を返し、管理画面の存在自体を見せません。ヘッダーの「運営」リンクも、管理者にだけ表示されます。

**アクセス制御はあくまでサーバー側の `requireAdmin()` です。** リンクを出し分けるのは、権限のない人に押しても404になる導線を見せないためで、これ自体は防御ではありません。

### 画面はセッションをどう知るか

ヘッダーと `/setup` のサインイン表示は、`GET /api/auth/me` の結果（自分のアドレスと、自分が管理者かどうか）から決めます。React の状態だけで持たないのは、再読み込みでサインイン済みが消えたり、期限切れ後も「サインイン済み」と表示され続けたりするのを防ぐためです。

取得は `lib/useSession.ts` の `useSession()` に集約し、react-query の同じキーを共有しています。ヘッダーと `/setup` が同時に使っても取得は1回です。サインイン・サインアウトの直後は `useRefreshSession()` で取り直します。

**セッションを読むのはクライアント側だけです。** ヘッダーで `cookies()` を読むとレイアウトが動的になり、トップページを含む全ページが静的に描画できなくなるためです。`/` と `/setup` は現在も静的なまま保たれています。

### レート制限

認証後のServer Actionには、実行者のウォレットアドレス単位で上限があります（`lib/domain/rateLimits.ts`）。

| 入口 | 上限 | 単位 |
| --- | --- | --- |
| `submitApplication` | 5回 / 24時間 | メンバー |
| `checkin` | 20回 / 24時間 | メンバー |
| `transitionApplication` | 120回 / 1時間 | 管理者 |

数え上げはDB側の `consume_rate_limit()` が「加算して返す」までを1文で行います。読み取り・加算・書き込みを分けると、**同時に呼ばれたときに上限を越えて通ってしまう**ためです。

消費するのは**認可の直後・処理の前**です。止めたいのは成功する操作ではなく、DBの制約に弾かれ続ける呼び出しのほうなので、処理の後ろに置くと数え漏らします。

数える単位をIPではなくアドレスにしているのは、IPだと同一ネットワークのメンバーがまとめて詰まるためです。

**未認証の `POST /api/auth/verify` などにはまだ制限がありません。** アプリ内で止めても関数はすでに起動しているため関数実行の課金は減らず、ここはホスティング側の層で扱う判断です（[決定事項](/decisions/2026-08-10-rate-limit-authenticated-actions)）。本番公開前に決める必要があります。

### Supabase と Repository

Supabaseはホスティングされた PostgreSQL です。アプリはサーバー側から `Secret` キー（従来の `service_role` キーの後継）で接続します。

**画面やServer Actionは、Supabaseを直接触りません。** 必ず `lib/repositories/` の契約（インターフェース）を経由します。

```
画面 / Server Action
      ↓
lib/repositories/index.ts  ← 契約（DB非依存）
      ↓
lib/repositories/supabase.ts  ← Supabase固有の実装
      ↓
Supabase PostgreSQL
```

この境界があるおかげで、Server Actionのテストでは Repository をモックに差し替えられます。

スキーマの変更は `supabase/migrations/` にSQLファイルとして記録します。手元のDBへ反映するには `npx supabase db reset` を実行します。

## 申請の状態遷移と監査ログ

このアプリの中心にある考え方です。

申請（`applications`）は3つの状態を**別々に**持ちます。

| 状態 | 取りうる値 |
| --- | --- |
| 審査 (`review`) | `pending` / `needs_info` / `approved` / `rejected` |
| Allowlist (`allowlist`) | `pending` / `added` / `failed` |
| 配布 (`distribution`) | `pending` / `sent` / `failed` |

遷移できる組み合わせは `lib/domain/applicationTransitions.ts` に定義されています。重要なルールは2つです。

- **承認前に実行状態（Allowlist・配布）は変更できない**
- **終端状態（`approved`、`rejected`、`added`、`sent`）からは動かせない**

状態を変えると `application_events` テーブルに、実行者のアドレス・時刻・変更前後の状態・理由・tx hashが記録されます。**この監査ログは、誰がいつ何を承認したかを後から追えるようにするためのものです。** Allowlist追加とトークン配布は人手のオンチェーン操作なので、記録が唯一の裏付けになります。

## オンチェーン操作を自動化していない理由

このアプリは、Allowlistの更新もHENKAKUトークンの送付も**実行しません。** `/admin` でできるのは「実行した結果を記録する」ことだけです。

理由は、トークン配布の権限を持つ鍵をアプリに持たせないためです。配布はSafe Walletから人が署名して実行し、そのトランザクションhashをアプリへ記録します。

手順の全体は[手動運用Runbook](/runbook-manual-operations)にあります。

## もっと詳しく

- [開発計画](/development-plan) — 背景、フェーズ計画、未決定事項
- [決定事項ログ](/decisions) — なぜその選択をしたかの記録
- [手動運用Runbook](/runbook-manual-operations) — 運営の作業手順

## 次に読むもの

→ [トラブルシューティング](/guide/troubleshooting)
