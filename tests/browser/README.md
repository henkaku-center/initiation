# 通常ポータルのブラウザ検証

`portal.mjs` は通常buildを使い、使い捨てアカウントの署名をブラウザ内のテストproviderから返します。認証API、SIWE検証、Server Actions、DBは実処理を通ります。実ウォレット拡張、送金、NFT発行は呼びません。ブラウザから外部オリジンへのリクエストは遮断します。公開動画そのものの再生確認とは分けてください。

Node 22以上、Ruby、Supabase CLI、Docker、PlaywrightとChromiumが必要です。Playwrightはブラウザ検証用ツールとして別に用意し、このリポジトリの依存には追加していません。

## 専用サービスの準備

実行先は `http://127.0.0.1:3102` と `http://127.0.0.1:65421` に固定しています。本番・ステージングの認証情報や既存開発DBは使いません。アプリ側も `.env.local` などを含まない隔離コピーを用意し、正しいlockfileで `npm ci` と `npm run build` を先に実行します。

以下をリポジトリのルートで実行すると、設定とmigrationだけを持つ一時サービスディレクトリができます。

```bash
PORTAL_SERVICE_DIR=$(mktemp -d)
ruby -rfileutils -e '
  target = ARGV.fetch(0)
  FileUtils.mkdir_p(File.join(target, "supabase"))
  config = File.read("supabase/config.toml")
    .sub(/project_id = ".*"/, "project_id = \"portal-verification\"")
    .gsub(/\b543(\d{2})\b/, "654\\1")
  File.write(File.join(target, "supabase/config.toml"), config)
  FileUtils.cp_r("supabase/migrations", File.join(target, "supabase/migrations"))
' "$PORTAL_SERVICE_DIR"
supabase start --workdir "$PORTAL_SERVICE_DIR" -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor > /dev/null
```

`supabase status`のキーを表示しないでください。`local-env.rb`がstatusのJSONをメモリ内で受け取り、専用URLであることを確認してから子プロセスへ渡します。環境変数を丸ごと継承せず、アプリのenvファイルがある場合は停止します。SESSION_PASSWORDもこの専用サービスディレクトリにテスト用の値を作ります。

## 実行

`PORTAL_APP_DIR`に隔離コピーの絶対パスを指定します。2つのターミナルで同じサービスとアプリのディレクトリを使ってください。CLIがPATHにない場合だけ `PORTAL_SUPABASE_CLI` で実行ファイルを指定できます。

```bash
# ターミナル1: 通常buildを起動
ruby tests/browser/local-env.rb "$PORTAL_SERVICE_DIR" "$PORTAL_APP_DIR" npm run start -- --hostname 127.0.0.1 --port 3102

# ターミナル2: ブラウザ検証。Playwrightが通常のimportで見つからない場合はパスを指定
ruby tests/browser/local-env.rb "$PORTAL_SERVICE_DIR" "$PORTAL_APP_DIR" node tests/browser/portal.mjs "$PORTAL_PLAYWRIGHT_DIR" "$PORTAL_ARTIFACT_DIR" "$PORTAL_CHROMIUM_PATH"

# 統合テストも同じローカルサービスで実行できる（ブラウザ検証とは同時に行わない）
ruby tests/browser/local-env.rb "$PORTAL_SERVICE_DIR" "$PORTAL_APP_DIR" npm test -- tests/integration
```

`portal.mjs`の引数はPlaywrightパッケージディレクトリ、スクリーンショット保存先、Chromium実行ファイルです。標準のPlaywright配置なら省略可能です。失敗時もスクリーンショットを残し、秘密鍵やCookieをログへ出しません。毎回ランダムなアカウントを作るため、過去の完走記録で成功することはありません。

## 確認する契約

- 接続と認証の区別、Polygon切替、署名待ち・拒否、nonce/認証失敗と再試行。
- 回答保存の通信失敗で入力が残ること、再読込後に未完了項目へ戻ること、5問の回答または明示スキップのサーバー記録と完走表示、完走後の再編集・再読込。
- 申請とチェックインの通信失敗・重複操作、日本時間のサーバー日付、従来URL。
- アカウント切替・切断、未認証と管理者権限不足、デモlocalStorageの改変、不明な質問ID、他人のmember IDを追加したリクエスト。
- 直接URL、戻る・進む、キーボードによる本文スキップとダイアログ、ライト／ダーク、360/768/1440px、横はみ出し。

終了後はテスト用サーバーをCtrl+Cで止め、`supabase stop --workdir "$PORTAL_SERVICE_DIR"`でこの専用プロジェクトだけを停止します。共有開発サービスを停止・初期化しないでください。

## 未認証の画面・デモ操作を確認する

`portal-home.mjs`はウォレットを使わず、本人データの保存は行いません。ブラウザ側のセッション応答は未認証として用意し、外部リクエストを遮断します。通常buildのサーバーには上記の専用ローカル設定を渡します（本人用ページのServer Componentがセッションを確認するため）。通常buildを3102番、またはデモbuildを3103番で起動してから実行してください。同じ`.next`でbuildとサーバー起動を同時に行わないでください。

```bash
node tests/browser/portal-home.mjs "$PORTAL_PLAYWRIGHT_DIR" "$PORTAL_ARTIFACT_DIR" "$PORTAL_CHROMIUM_PATH" http://127.0.0.1:3102
```

360／768／1440pxのライト・ダークで、PODCASTの4場面・公式リンクとYouTube読み込みがないこと、FREQUENCYの公開音楽ランキング表示（APIはテストデータで置換）、フッターのプライバシーポリシーとTab移動を確認します。通常buildでは未認証のSetup・Initiation・Passport・Communityも撮影し、背景、カード構成、模擬操作内の移動、Journeyの再回答・再読込を確認します。デモbuildでは末尾のURLを`http://127.0.0.1:3103`に置き換えます。

## FREQUENCY

`node tests/browser/frequency.mjs <Playwrightディレクトリ> <成果物ディレクトリ> <Chromium実行ファイル>` は、3102番の生成Homeで取得中・429・再試行・204・4曲表示、出典、UTC期間、キーボードと360/768/1440pxのライト・ダークを検証します。音楽データは `music-fixture.mjs` で置換し、外部通信は遮断します。

末尾に `--live` を付ける場合だけ、ListenBrainzの固定の公開APIへGETを1回許可します。認証情報・Cookie・Refererを送らないことも確認します。実際の集計結果は変わるため、通常の自動テストとライブ接続確認は分けて記録してください。
