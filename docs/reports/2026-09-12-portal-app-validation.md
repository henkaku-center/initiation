# 2026-09-12 ポータル通常アプリ接続の検証記録

## 対象と結果

既存4項目のID・必須条件・完走判定を維持して、新UIから実認証、保存・再開、完走、申請、日次チェックインまで接続した。追加migration、依存バージョン変更、GitHubへの書き込み、公開環境の変更は行っていない。

- 作業開始時のbase / ローカルHEAD: `e08755509c23ac651e25a8060aa6e755456871d6`。開始時はmain、作業ツリーはクリーン。
- [PR #102](https://github.com/henkaku-center/initiation/pull/102)は2026-09-12 01:54:29 UTCにマージ済み。[取り込みレビュー](https://github.com/henkaku-center/initiation/pull/102#pullrequestreview-5184717678)を確認した。
- 参照PR HEAD: `f18db749221b59285809e0b544eec772e82351a7`。この過去SHAのテスト結果は今回の結果に含めていない。
- **検証対象はbase SHAに本作業の未コミット変更を加えたソース**。コミット済みHEADだけの検証結果ではない。
- ソース内容のSHA-256: `4052ce830193f8a16b992d7c858d772dcb4a1a46ae5da85d37e0a8aa232ca972`。パス順に並べた311ファイルのSHA-256一覧をハッシュ化した。envファイルと本報告書は除外し、公開`.env.example`だけはbaseから検証コピーへ用意した。検証コピーとの311ファイルの一致を確認済み。

## 変更したファイルと接続範囲

| 変更単位 | 対象ファイル | 結果 |
| --- | --- | --- |
| 通常の入口・共通UI | `app/{layout,page,error}.tsx`、`components/portal/{PortalShell,PortalHome}.tsx`、`components/portal/portal.css`、`lib/portal/navigation.ts` | 実Providersの内側にポータルを配置。通常URLと旧ハッシュに対応。読み込み失敗の再試行を用意 |
| Home・Intro生成 | `components/demo/{ReferenceGatewayView,PortalDemo}.tsx`、`scripts/demo/build-{gateway,bubble-intro}.mjs`、`public/demo-assets/gateway/{app-index,app-bubble-multi,app-intro,bubble-multi}.html` | 生成元から通常用HTMLを作成。両イントロの通常URLに対応し、架空の再生履歴を通常Homeから除外 |
| Setup・認証 | `app/setup/page.tsx`、`components/portal/PortalSetup.tsx`、`components/{ConnectWallet,WalletSetup,SignInWithEthereum,SessionStatus}.tsx`、`lib/auth/signInWithWallet.ts`、`lib/useSession.ts`、`lib/useWalletSessionGuard.ts` | 接続とSIWEを別表示。Polygon、署名待ち・拒否、認証・取得失敗、再試行、切断・切替を扱う |
| 本人のデータ表示 | `components/portal/MemberBoundary.tsx`、`lib/domain/walletSession.ts`、`app/admin/page.tsx`ほか本人用ページ | 接続中のウォレット・サーバーセッション・ページ所有者が一致する場合だけ表示。切替後は古い入力を破棄 |
| Initiation | `app/initiation/page.tsx`、`components/portal/PortalJourney.tsx` | `saveStep`、`saveDisplayName`、Repositoryを再利用。保存成功後に進め、サーバー記録から再開・完走判定 |
| Passport・申請 | `app/{apply,passport}/page.tsx`、`components/portal/PortalPassport.tsx`、`components/ApplyForm.tsx` | 既存の完走チェック・重複防止・申請状態・rejected後の再申請へ接続 |
| Community | `app/{checkin,community}/page.tsx`、`components/portal/PortalCommunity.tsx`、`components/CheckinButton.tsx` | 既存の日次チェックインと本人の履歴。JSTの日付境界で再取得し、DBが日付と一意性を保証 |
| 配色・ビルド境界 | `app/globals.css`、`package.json`、`vercel.json`、`proxy.ts`、`lib/demo/boundary.ts` | 通常buildを既定にし、noindexとデモのAPI/POST遮断を維持。フォームのdark指定も手動の配色へ追従 |
| テスト | `tests/unit/lib/portal/*.test.ts`、`tests/unit/lib/siwe.test.ts`、`tests/browser/{portal.mjs,local-env.rb,README.md}` | 各機能の失敗→成功、実SIWEとDBを通すブラウザ検証、既存経路の回帰確認 |
| 文書 | `README.md`、`docs/.vitepress/config.ts`、`docs/guide/portal-{app,demo}.md`、`docs/decisions/2026-09-12-portal-app-integration.md`、`docs/superpowers/plans/2026-09-12-portal-app-integration.md`、本報告書 | 調査・質問対応・公開切替・ロールバック・未接続範囲を記録 |

既存の認証API、質問定義、完走関数、Server Actions、Repository、管理者の審査ルール、Supabase migrationは実処理として再利用した。一般画面に模擬審査は配置していない。既存のライセンス・著作権・素材クレジットは保持した。

## Local-verified

Node **22.23.1**、Next.js **16.3.4**、Vitest **5.0.0**を使用。既存の3000番開発サーバーと`.next`を共有しないよう、`/private/tmp/henkaku-portal-verification`へソースをコピーした。既存`.env.local`とシェルの認証情報は引き継いでいない。

Supabase CLI **2.112.0**で専用プロジェクト`portal-verification`を起動した（API 65421、DB 65422）。既存migrationをこの使い捨てローカルDBへ適用した。共有開発DBのresetや、本番・ステージングへの接続は行っていない。

| 実行コマンド | 実際の結果 |
| --- | --- |
| `npm ci` | 成功。lockfileに合わせた依存を隔離コピーへ導入 |
| `npm run build` | 成功。通常モードで本人用ページと認証APIは動的ルート |
| `npx tsc --noEmit` | 成功（通常build後） |
| `npm run lint` | 成功、エラー・警告なし |
| `npm test` | **46ファイル、356件成功**。単体335件＋ローカルSupabase統合21件。最終実行12:21 JST |
| `npm run build:demo` | 成功。サービス用の環境変数なしで成立 |
| `npm audit --omit=dev --audit-level=high` | 成功、対象となる本番依存の脆弱性0件 |
| `npm run docs:build` | 成功。決定文書から配信対象外の実装計画へのリンクはGitHub参照へ修正 |
| `ruby -c tests/browser/local-env.rb` | `Syntax OK`。実際のサーバー起動・全テスト・ブラウザ検証でもこのスクリプトを使用 |
| `git diff --check` | 成功 |

上記コマンドは、認証情報を引き継がない検証用ラッパー経由で実行した。サービスが必要なコマンドの再現には `tests/browser/local-env.rb <専用サービスディレクトリ> <隔離アプリディレクトリ> <コマンド>`を使える。

### ブラウザ

通常buildを3102番で起動し、`node tests/browser/portal.mjs <Playwrightディレクトリ> <成果物ディレクトリ> <Chromium実行ファイル>`を実行した。**Chromium 151.0.7922.34**、Playwrightツール1.60.0-alpha-1774999321000。ウォレット署名は毎回生成する一時鍵で行い、nonce/verify/me、Server ActionsとDBは実処理を通した。実ウォレットへ署名を要求していない。

以下が成功した。

- 未接続→接続→別ネットワーク→Polygon→nonce失敗・署名拒否・署名待ち・認証失敗→再試行→実SIWE認証。
- 未保存の回答で通信失敗を起こしても入力とDB状態が保たれ、再試行して保存できる。再読込後に未完了の2項目目へ再開し、4つの正しいIDと2つのnull回答をDBで確認。
- サーバー完走→申請→審査待ち。通信失敗を成功と表示せず、同じ申請リクエストの再送でも1件のまま。
- チェックインの通信失敗・再試行、保存と再読込。日付やmember IDを追加した再送でも当日の本人1件だけになり、JSTの日付が一致。
- アカウント切替後に前の表示が消え、別アカウントでサインイン。正常形式のデモ状態を完走・承認済みに改変しても、申請フォームは出ず、直接の申請リクエストもサーバーが拒否。
- 不明な質問IDを拒否。他人のmember IDを余分に送っても更新は認証済み本人だけで、元ユーザーの回答は変わらない。一般ユーザーの`/admin`は404。切断後の保存は未認証として拒否。
- セッション取得503のエラー表示と再取得。直接URL、従来の`/apply`・`/checkin`、戻る・進む、旧ハッシュからの移動。
- 比較用の暗号化イントロからHomeへ進める。ライト／ダークと360/768/1440px、本文スキップ、クレジットのEnter/Escape、横はみ出しなし、未処理のブラウザ例外なし。

Home / Setup / Initiation / Passport / Communityのライト・ダークを目視確認した。Initiationは768pxも確認した。スクリーンショット11点はローカルの`/private/tmp/henkaku-portal-browser/`に保存し、Gitには追加していない。外部動画・RPCへのブラウザ通信は遮断したため、公開動画そのものの再生成功はこの検証に含まない。

### デモのHTTP確認

サービス用環境変数なしで3103番にデモbuildを起動し、`node /private/tmp/portal-demo-smoke.mjs`で確認した。認証API4経路とPOST8経路は404、旧・通常URL7経路は対応するデモ画面へ307、Home・アイコン・生成HTMLは200。デモのtitleとHTMLのnoindexも確認した。

### TDDと修正した不具合

入口と生成物、認証・本人データの境界、Initiation、Passport、Community、公開設定は、それぞれ追加テストの失敗を確認してから実装した。後の確認で見つけた次の問題も、再現テストを追加して修正した。

| 原因 | 修正と再発防止 |
| --- | --- |
| トークン設定の取得失敗でWalletSetup全体が早期returnし、Polygon切替まで消える | 任意のトークン表示だけを準備中にし、設定なしの画面テストを追加 |
| Tailwindのdark指定がOS設定に従い、ポータルの手動切替と一致しない | `data-theme`へ統一し、実際の接続状態の配色が切り替わるブラウザテストを追加 |
| 比較用イントロのクリック処理がハッシュしか読まず、通常URLを拒否する | 生成処理にURL対応を追加。5経路の生成JavaScriptと実クリックの回帰テストを追加 |

途中の検証失敗は最終結果と区別した。サンドボックス内の通常buildは進まず中断し、隔離コピーのまま許可された実行で成功した。元のnode_modulesとlockfileの差は隔離コピーの`npm ci`で解消した。テストコピーに公開`.env.example`がないことによる失敗も修正した。ブラウザツールのキャッシュと実行ファイルの版が異なったため、存在を確認したChromiumを明示した。Cookie確認はブラウザのfetchで行う（Node側HTTPクライアントとlocalhostのSecure Cookieの扱いが異なる）。

`npm ci`には既存のESLint 10と一部プラグインのpeer範囲に関する警告があった。dev依存を含む監査はmoderate 2件・high 1件を報告したが、本番依存に限定したCIコマンドは0件だった。今回、依存バージョンやCI条件は変更していない。Vitestのworker再利用の提案は性能上の案内であり、テスト失敗ではない。

## CI-verified / Unverified

**CI-verified: なし。** 未コミット変更をpushしていないため、同じ変更を対象にしたCI実行はない。mainやPR #102の過去の緑を、この変更の成功とは扱わない。

**Unverified:** 実ウォレット拡張・端末での署名、Safari/Firefox、運営用ウォレットでのブラウザ審査操作、Vercelの設定・デプロイ、本番・ステージングの認証とDB、外部動画の実再生、オンチェーン照会・Allowlist操作・送金・NFT発行・ロール付与。管理者認可・審査状態の回帰は単体／Repositoryテストで確認し、一般ユーザーの管理画面拒否はブラウザでも確認した。

## 準備中と後続判断

| 範囲 | 理由・後続 |
| --- | --- |
| 残高・オンチェーンAllowlist | #91の情報源・仕様が未確定。アプリの申請記録とは区別する |
| NFT発行・報酬claim・ロール付与 | 実処理が存在しないため準備中。NFT保有を申請条件にしない |
| needs_infoの本人からの追加送信 | 現行には状態・理由・運営の再審査だけがあり、本人の追加入力経路は別実装 |
| デモの質問・「まだ言葉にしない」 | 依頼者の選択に従い、初回は既存4項目を維持。完走仕様を別途決める |
| Community Field、Discord名など | #46等の後続仕様。架空の活動・履歴を本番データにしない |

Issue #52・#91は開始時点でOPENであり、この作業で閉じていない。

厳密さの観点では、実ウォレットと公開環境の検証、準備中機能の仕様が残る。一方、初回の4項目を既存処理につなぐ範囲は、架空状態に頼らずローカルで通し検証できた。これらの残作業を含めて本番運用完了とはしていない。

## 設定・公開切替

追加migrationは不要。既存3migrationと、サーバー用Supabase設定・SESSION_PASSWORD・SIWE_ALLOWED_DOMAINS、運営にはADMIN_ADDRESSESが必要。任意のウォレット表示追加には公開トークン設定を使う。

公開には別途許可を得たうえで、対象コミット、VercelのBuild Command上書き、環境変数と既存スキーマを確認する。通常化は `npm run build` と `HENKAKU_DEMO_ONLY=1` の解除を伴う再ビルド。noindexは維持する。ロールバックは以前のデプロイへ戻すか、承認された設定で `npm run build:demo` を再ビルドする。DBの削除や逆migrationは行わない。

具体的な手順は[ポータルアプリ](../guide/portal-app.md)に記録した。公開・実ウォレット・資産操作・GitHubへの投稿を今回実行したという報告ではない。
