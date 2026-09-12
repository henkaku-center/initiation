# ポータルアプリ

通常の `npm run dev` / `npm run build` は、PR #102由来の入口・共通UIと既存の参加処理を使います。模擬操作は[デモモード](./portal-demo.md)に残しています。

## 画面と保存

| 画面 | URL | 実処理 |
| --- | --- | --- |
| Home | `/` | 通常ページへの入口、公開Podcastへのリンク・プレビュー |
| Setup | `/setup` | ウォレット接続、Polygon確認、SIWE署名による認証、任意のトークン表示追加 |
| Initiation | `/initiation` | 任意の呼び名、既存4項目の保存・再開・サーバー完走判定 |
| Community | `/community`、従来の`/checkin` | 本人の日次チェックインと履歴 |
| Passport | `/passport`、従来の`/apply` | 完走状態、申請・再申請、審査・Allowlist・配布の状態 |
| 運営 | `/admin` | 既存の管理者認可・審査・実行記録・監査イベント |

旧Homeの `/#setup` / `/#journey` / `/#community` / `/#passport` は対応する通常URLへ移動します。直接アクセス・再読込は、そのURLの認証済みサーバーデータを取得します。

質問のIDは `q-introduction` / `q-how-found`、いずれも空白以外の回答が必要です。`quest-wallet-setup` / `quest-discord-hello` は従来どおり本人が実施を確認して保存します（回答はnull）。4項目のサーバー保存が完走条件です。ウォレットが接続されたことだけでは、認証やクエスト完了にはなりません。

保存に失敗した場合は入力を残します。申請やチェックインの通信結果を確認できない場合は、状態を再取得してから再試行してください。申請の重複はDB制約、チェックインは日本時間の日付と1人1日1件のDB制約で防ぎます。ブラウザから日付や他人のmember IDを指定する契約はありません。

アカウント切替・切断時は前のデータを画面から隠し、セッションを破棄します。サインアウトの通信に失敗した場合は再試行が必要です。ブラウザに保持する `henkaku.appearance.v1` は配色、イントロの既読は表示設定です。`henkaku.portal-demo.v1` は本番の回答・完走・申請・配布判定に使わず、自動移行もしません。

## 準備中の範囲

- トークン残高・オンチェーンAllowlist照会は#91の仕様・情報源が未確定です。架空の数値で補いません。トークン表示追加の設定がなくてもネットワーク切替と認証は進められます。
- NFT発行、報酬claim、ロール付与は未実装です。NFT保有は申請条件ではありません。Allowlist追加とHENKAKU送付は既存の手動運用で、画面は運営が記録した状態を示します。
- `needs_info` は理由を表示します。本人から追加入力する処理は未実装で、運営の案内に従います。再申請できるのは既存モデルの `rejected` です。
- Community Field、架空の活動カード・人数・再生履歴は通常画面に出しません。HomeのPulseは確認日付きのIssueスナップショットです。公開動画のプレビューは残しますが、実在メンバーの視聴履歴を収集・公開する機能は追加していません。
- デモ固有の質問、「まだ言葉にしない」、Discord名などは後続の仕様判断です。Issue #52・#91はこの接続だけで完了しません。

## 必要な設定とmigration

サーバー用に `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、32文字以上の `SESSION_PASSWORD`、アクセス元hostとportに合う `SIWE_ALLOWED_DOMAINS` が必要です。運営を使う場合は `ADMIN_ADDRESSES` を設定します。値の出力やコミットはしないでください。

任意のウォレット表示追加は、ビルド時の `NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS`、必要に応じて `NEXT_PUBLIC_HENKAKU_TOKEN_SYMBOL` / `NEXT_PUBLIC_HENKAKU_TOKEN_DECIMALS` / `NEXT_PUBLIC_HENKAKU_TOKEN_LOGO_URL` を使います。保有照会や送金を実装する設定ではありません。

今回の追加migrationはありません。既存の3つのmigration（コアテーブル、申請遷移、レート制限）が前提です。本番DBへの適用はこの作業には含みません。詳細は[アーキテクチャ](./architecture.md)と[開発環境のセットアップ](./setup.md)を参照してください。

## 公開切替とロールバック

1. 公開の明示的な許可を得て、対象コミットと利用する環境を確定します。現在のデプロイとBuild Commandをロールバック先として記録します。
2. 対象環境の設定・既存スキーマを確認します。開発用テストに本番・ステージングの認証情報を持ち込まないでください。
3. Node 22以上、Install Command `npm ci`、Build Command `npm run build`、Next.js標準出力を使います。リポジトリの `vercel.json` はこの通常buildを指定します。管理画面側に上書きがある場合は、実際のBuild Commandとビルドログを照合します。
4. `HENKAKU_DEMO_ONLY=1` の環境変数を外して通常buildを作ります。モードはビルドに埋め込まれるため、実行時の環境変数変更だけでは切り替わりません。
5. 許可された環境で認証→保存→再開→完走→申請→チェックインを確認します。実ウォレット署名、外部アカウント変更、Allowlist操作、送金、NFT発行はそれぞれ別途確認が必要です。
6. HTMLのrobotsとVercelの `X-Robots-Tag: noindex, nofollow` を維持します。`noindex` はアクセス制限ではなく、解除には別の公開方針の判断が必要です。

ロールバックは、記録した以前のデプロイへ戻すか、承認された設定で `npm run build:demo` を再ビルドします。後者は実認証・保存・申請が使えない模擬体験へ戻ります。APIとPOSTはデモのProxyで404になります。DB記録は残るため、デモへ戻すためのDB削除や逆migrationは不要です。デモのlocalStorageを本番へ戻す移行処理もありません。

この変更は設定ファイルと手順を用意するもので、デプロイや公開環境の設定変更を実施したものではありません。

## 生成元と検証

Homeは `assets/reference/gateway/` と `scripts/demo/build-gateway.mjs`、イントロは `scripts/demo/build-bubble-intro.mjs` を編集します。通常用の `public/demo-assets/gateway/app-*.html` とデモ用HTMLは生成物です。HTMLだけを直接変更せず、`node scripts/demo/build-gateway.mjs` で再生成してください。

```bash
npm ci
npm run build
npx tsc --noEmit
npm run lint
npx vitest run tests/unit
npx vitest run tests/integration
npm run build:demo
npm audit --omit=dev --audit-level=high
```

統合テストはローカルSupabase専用です。通常サーバー・デモサーバー・buildは同じ `.next` を使うため、別コピーにするか順番に停止・実行します。ブラウザの自動確認は[テストの案内](https://github.com/henkaku-center/initiation/blob/main/tests/browser/README.md)を参照してください。実ウォレットの操作確認はこの自動テストとは別です。
