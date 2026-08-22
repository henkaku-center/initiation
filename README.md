# HENKAKU Initiation

HENKAKUコミュニティへの参加を、ウォレット準備からInitiation、チェックイン、申請まで一つの流れで案内するNext.jsアプリです。

現在はフェーズ1 MVP-1のローカル実装です。承認・Allowlist追加・HENKAKU配布は人が行い、AI機能と本番デプロイはまだ保留しています。

> **はじめて参加する方へ**: 環境構築から最初のPull Requestまでを順に案内する[開発者ドキュメント](https://henkaku-center.github.io/initiation/)があります。用語の説明、成功時に表示されるもの、症状別のトラブルシューティングを載せています。このREADMEは概要と要点をまとめた入口です。

## 参加者向けの流れ

画面上部のメニューから、次の順番で進めます。

1. **セットアップ** (`/setup`): ウォレット接続、SIWEサインイン、Polygon切替、HENKAKU追加
2. **Initiation** (`/initiation`): 質問への回答とクエストの完了。進捗は保存されます
3. **チェックイン** (`/checkin`): 1日1回の活動記録
4. **申請** (`/apply`): Allowlist追加とHENKAKU配布の申請
5. **運営** (`/admin`): 管理者が審査・Allowlist・配布状態を更新

## 開発環境

- Node.js 22.0.0 以上 / npm（開発時の確認は Node.js 24 系）。バージョン管理ツールは各自の好みで構いません
  - `@supabase/supabase-js` などが `engines.node >=22.0.0` を要求します。Node.js 20 では `npm install` が `EBADENGINE` を出し、build・テストでも警告が出ます
- Next.js App Router / TypeScript
- wagmi + viem: ウォレット接続、Polygon切替、`wallet_watchAsset`
- SIWE + iron-session: ウォレット署名認証とセッション
- Supabase PostgreSQL: migrationとRepository経由の永続化
- Vitest: 単体テストとローカルSupabase統合テスト
- MetaMaskなどのInjected Wallet
- ローカルSupabaseを使う場合はDocker DesktopとSupabase CLI

## セットアップ

```bash
git clone <repository-url>
cd initiation
npm install
cp .env.example .env.local
```

`.env.local` に値を設定します。秘密情報はこのファイルだけに置き、コミット・Issue・ログへの貼り付けをしないでください。

| 変数 | 用途 | 公開可否 |
| --- | --- | --- |
| `SESSION_PASSWORD` | セッション暗号化（32文字以上） | 非公開 |
| `SIWE_ALLOWED_DOMAINS` | SIWE署名を受け付けるドメイン（カンマ区切り） | 公開可・既定値あり |
| `SUPABASE_URL` | Supabase接続先 | 環境による |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー側Repository接続 | 非公開 |
| `ADMIN_ADDRESSES` | 管理画面を使えるウォレット（カンマ区切り） | アドレス自体は公開情報だが環境変数で管理 |
| `NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS` | Polygon上のHENKAKUコントラクト | 公開可・既定値あり |
| `NEXT_PUBLIC_HENKAKU_TOKEN_SYMBOL` | トークン表示名 | 公開可・既定値あり |
| `NEXT_PUBLIC_HENKAKU_TOKEN_DECIMALS` | トークン小数桁 | 公開可・既定値あり |
| `NEXT_PUBLIC_HENKAKU_TOKEN_LOGO_URL` | ウォレット表示用ロゴ | 公開可・既定値あり |
| `SAKURA_AI_API_KEY` | AI Engineスパイク用キー | 非公開・現在は本番未使用 |
| `SAKURA_AI_BASE_URL` | AI EngineのベースURL | 環境変数で管理 |

`NEXT_PUBLIC_HENKAKU_TOKEN_*` の4つは公開情報のため `.env.example` に開発用の既定値が入っています。`/setup` を動かすだけならこの4つは変更不要です。

| 変数 | 開発用の既定値 |
| --- | --- |
| `NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS` | `0x0cc91a5FFC2E9370eC565Ab42ECE33bbC08C11a2` |
| `NEXT_PUBLIC_HENKAKU_TOKEN_SYMBOL` | `HENKAKU` |
| `NEXT_PUBLIC_HENKAKU_TOKEN_DECIMALS` | `18` |
| `NEXT_PUBLIC_HENKAKU_TOKEN_LOGO_URL` | `https://raw.githubusercontent.com/henkaku-center/omise-interface/main/public/henkakuToken.png` |

`/setup` はこのアドレスを `wallet_watchAsset` でウォレットへ渡します。**誤ったアドレスを設定すると利用者が別のトークンを追加してしまう**ため、値を変える場合は [決定事項の記録](docs/decisions/2026-08-09-henkaku-token-defaults.md) もあわせて更新してください。

### ローカルSupabase

```bash
npx supabase start
npx supabase status
npx supabase db reset
```

`supabase status` で確認した `Project URL` と `Secret` を、値がログに残らないように `.env.local` の `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` へ設定します。`Publishable` はこの接続には使用しません。統合テストはローカルSupabaseが起動している状態で実行してください。

### 開発サーバー

```bash
npm run dev -- --port 3000
```

既存の開発サーバーがある場合は、同じポートに新しいプロセスを重ねて起動しないでください。

## 検証コマンド

```bash
npm test
npm run lint
npm run build
npx tsc --noEmit
```

クローン直後は `npm run build`（または `npm run dev`）を先に実行してください。Next.jsがビルド時に生成する型（`LayoutProps` など）ができるまで、`npx tsc --noEmit` は失敗します。

コマンドごとの詳細と絞り込み方法は[検証コマンド一覧](https://henkaku-center.github.io/initiation/reference/commands)にあります。

テストは `tests/unit/` と `tests/integration/` に分けています。Supabaseを使う統合テストの補助コードは `tests/support/` にあります。テスト対象は `tests/**/*.test.ts` です。統合テストは `.env.local` のSupabase設定を自動で読み込むため、ローカルSupabaseを起動し `.env.local` を設定した状態で `npm test` を実行してください。

## アーキテクチャの境界

- `app/`: ページ、Server Action、API Route
- `components/`: Client Componentを含む画面部品
- `lib/domain/`: DBやNext.jsに依存しない型・状態遷移・純粋ロジック
- `lib/repositories/`: Supabase依存を隔離するRepository契約と実装
- `lib/auth/`: SIWEセッションからmember / adminを解決する認可ガード
- `supabase/migrations/`: スキーマの変更履歴
- `docs/`: 開発計画、決定事項、運用Runbook

オンチェーンのAllowlist変更とSafe WalletからのHENKAKU配布は、アプリから自動実行しません。運用手順は [手動運用Runbook](docs/runbook-manual-operations.md) を参照してください。

## コントリビューション

1. Issueで目的と変更範囲を共有する
2. `main` から作業ブランチを作る（例: `agent/navigation-readme`）
3. テストを先に追加し、実装後に `npm test`・型チェック・lintを実行する（PR作成後はCIでも自動実行されます）
4. 秘密情報や個人情報をコミットしない
5. 変更理由、検証内容、未解決の判断をPull Requestに書く
6. UI変更はスクリーンショットまたは手動確認手順を添える

コントリビューションのライセンスとmaintainerの考え方は [CONTRIBUTING.md](CONTRIBUTING.md) にあります。

判断が必要な事項は勝手に仕様化せず、`docs/decisions/` に1決定1ファイルで記録してから実装します。命名規則は [決定事項の読み方](docs/decisions.md) を参照してください。Next.jsの変更を行うときは、リポジトリの `AGENTS.md` と `node_modules/next/dist/docs/` の該当ガイドを確認してください。

## 現在の制約と次の計画

- Initiationの質問・クエスト本文はコミュニティで確定する前提の仮コンテンツです
- 質問箱は未実装です。まず人だけで質問・回答のループを検証し、その後AIを検討します
- AIはフェーズ3で回答案と参考情報を作る補助役として導入し、最終回答は人が確認します
- Vercel / Supabase本番環境へのデプロイは延期中です
- MVP-1で扱う情報と公開範囲は[プライバシーポリシー](https://henkaku-center.github.io/initiation/privacy-policy)に記載しています。質問箱、外部公開ビュー、AI機能を導入する前に更新します

全体計画は [docs/development-plan.md](docs/development-plan.md)、実装計画は [docs/superpowers/plans/2026-08-06-phase1-initiation-mvp1.md](docs/superpowers/plans/2026-08-06-phase1-initiation-mvp1.md)、決定事項は [docs/decisions.md](docs/decisions.md) から参照できます。

## ライセンス

**ソフトウェアと創作物で分けています。** 著作権者の表記はどちらも `henkaku Community` です。

| 対象 | ライセンス |
| --- | --- |
| コード（`app/` `components/` `lib/` `supabase/` `scripts/` `tests/` と設定ファイル） | [MIT License](LICENSE) |
| ドキュメント（`docs/` と `README.md`・`CONTRIBUTING.md` などのMarkdown） | [MIT License](LICENSE) |
| 創作物（イラスト・音源など、コードとドキュメント以外） | [CC BY 4.0](LICENSE-CC-BY-4.0.txt) |

MITはソフトウェア向けの文面で、イラストや音源へ適用すると**再利用する人が何をすれば条件を満たすのかを読み取れません。** 創作物をCC BY 4.0にしているのはこのためで、CC BY 4.0では帰属表示がライセンス上の義務になります。

現時点でリポジトリに創作物はありません。追加するときの許諾と表示の手順は [CONTRIBUTING.md](CONTRIBUTING.md) にあります。

第三者から取り込んだ素材は、自前の創作物と同じく**素材の配置ディレクトリの `CREDITS.md` に、元のライセンスを明記して記録します。** 上の表は、そこに別のライセンスが明記されていない素材に適用されます。

Pull Requestは、上の区分に沿って同じライセンスで提供されたものとして扱います（inbound = outbound）。

判断の経緯は [ライセンスの決定](docs/decisions/2026-08-11-license.md) に記録しています。
