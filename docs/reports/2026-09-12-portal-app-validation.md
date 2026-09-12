# 2026-09-12 ポータル通常アプリ接続の検証記録

> 追記: 別の模擬アプリを維持する方針は[模擬アプリ廃止の決定](../decisions/2026-09-12-retire-portal-demo.md)で置き換えました。以下のデモbuild・操作・検証結果は、その決定前の記録です。現在の操作は通常アプリへ統一しています。

## 対象

- 作業開始時のbase: `e08755509c23ac651e25a8060aa6e755456871d6`。開始時はmain、作業ツリーはクリーン。
- [PR #102](https://github.com/henkaku-center/initiation/pull/102)は2026-09-12 01:54:29 UTCにマージ済み。[取り込みレビュー](https://github.com/henkaku-center/initiation/pull/102#pullrequestreview-5184717678)を確認して着手した。
- 参照SHA `f18db749221b59285809e0b544eec772e82351a7` の成功結果は今回の検証に使っていない。
- **Local-verifiedの実装SHA: `cca6e140c34d27f025cdff828af0b54c6a000b0d`**。初回接続のコミット `7e7ad85` に、デザイン復元、デモ版質問の採用、再回答、ListenBrainzを加えた実装。
- ソースSHA-256: `e5d5ce0c5e5525cf8129503f15561214b33d2ccabe35c43007e762e4d3abcfe6`。パス順に並べた327ファイルのSHA-256一覧のハッシュ。envファイルと本報告書は除外し、公開 `.env.example` はGitのコミットから用意した。検証コピーの327ファイルとの一致を確認した。本報告書の追記コミットは実装を変更しない。

## 変更と実処理への接続

| 範囲 | 主な対象ファイル | 結果 |
| --- | --- | --- |
| 共通入口・URL | `app/{layout,page,error}.tsx`、`components/portal/{PortalShell,PortalHome}.tsx`、`lib/portal/navigation.ts` | 実Providers内で新UIを表示。5画面の通常URL・直接表示・再読込・旧ハッシュ・戻る/進むへ対応 |
| Home・イントロ | `scripts/gateway/build-*.mjs`、`assets/reference/gateway/`、`components/demo/ReferenceGatewayView.tsx`、生成HTML | 編集元から生成。PODCASTは参照Gatewayの4つの抽象場面と横スクロール、公式リンクを維持。YouTube埋め込みと追加紹介文を削除 |
| FREQUENCY | `assets/reference/gateway/frequency.js`、`podcast.css`、生成 `frequency.js` | ListenBrainzの公開週間上位4曲、アーティスト、再生数、UTC集計期間・更新日。取得中・失敗・再試行・空状態を区別。依頼された将来の音楽共有の一文を追記 |
| Setup | `components/portal/{PortalSetup,PortalWalletStatus}.tsx`、`components/{ConnectWallet,WalletSetup,SignInWithEthereum,SessionStatus}.tsx`、`lib/auth/signInWithWallet.ts` | 元の2カラムと実接続・Polygon確認・SIWE。接続と認証を別表示。署名待ち/拒否、認証/取得失敗、再試行を扱う |
| 本人の状態 | `components/portal/MemberBoundary.tsx`、`lib/{useSession,useWalletSessionGuard}.ts`、`lib/domain/walletSession.ts` | ウォレット・セッション・表示データ所有者の一致を確認。切替・切断時に旧データを隠し、古い入力を破棄 |
| Initiation | `app/initiation/{page,actions}.tsx/ts`、`components/portal/PortalJourney.tsx`、`lib/initiation/{journey,complete}.ts`、`lib/portal/journeyScenes.ts` | 元の背景・探索・導入、任意の呼び名とデモ版5問。型付き回答/明示スキップを保存・再開・再編集。サーバー完走判定、旧4項目記録・完走済み申請資格の互換性 |
| Passport | `app/{apply,passport}/page.tsx`、`components/portal/PortalPassport.tsx`、`components/ApplyForm.tsx` | 元の4カード。既存申請・rejected後の再申請、審査/Allowlist/配布を実状態へ接続。NFT保有を条件にしない |
| Community | `app/{checkin,community}/page.tsx`、`components/portal/PortalCommunity.tsx`、`components/CheckinButton.tsx` | 本人の日次チェックイン・履歴。JST境界と1人1日1件をDBで保証。活動カードはサンプルと明記 |
| デモと配色 | `app/demo/page.tsx`、`components/demo/{PortalDemo,DemoJourney,DemoCommunity}.tsx`、`lib/demo/state.ts`、各CSS | `/demo`を模擬操作として維持し、再回答を追加。EXPERIENCE DEMOの帯を削除。配色のみ端末設定として分離。両フッターにプライバシーポリシー |
| 公開設定 | `package.json`、`vercel.json`、`proxy.ts`、`lib/demo/boundary.ts` | 通常buildを既定、生成パスを `scripts/gateway/` に変更。noindexとデモAPI/POST遮断を維持 |
| テスト・文書 | `tests/unit/`、`tests/integration/`、`tests/browser/`、`tests/layout/`、`docs/guide/portal-*.md`、関連決定文書 | TDD、実SIWE・ローカルDBを通すブラウザ検証、公開切替・互換性・ロールバックの記録 |

未認証でもJourneyの背景、Passportの4カード、Communityの構成を表示する。本人データの取得・保存・申請は認証後に行う。Repository、既存認証API、管理者認可、審査モデルとmigrationを再利用し、一般ユーザーに模擬審査を与えていない。ライセンス・著作権表示を保持し、ListenBrainzのCC0データの出典をCREDITSへ追加した。

## Local-verified

Node **22.23.1**、Next.js **16.3.4**、Vitest **5.0.0**、Chromium **151.0.7922.34**。既存3000番の開発サーバーと `.next` を共有せず、専用コピーで検証した。既存 `.env.local`、本番・ステージングの認証情報は使用していない。

Supabase CLI **2.112.0**、専用ローカルプロジェクト `portal-verification`（API 65421、DB 65422）を使用。既存3migrationをこのDBへ適用した。共有開発DBのreset、本番DBへの適用は行っていない。

| コマンド | 実際の結果 |
| --- | --- |
| `npm ci` | 成功。lockfile一致の依存を隔離コピーへ導入。依存バージョン変更なし |
| `npm run build` | 成功。通常の認証API・本人用画面が動的ルートになることを確認 |
| `npx tsc --noEmit` | 成功、通常build後 |
| `npm run lint` | 成功、エラー・警告なし |
| `npm test` | **51ファイル、411件成功**。単体389件＋ローカルSupabase統合22件。14:42 JST実行 |
| `npm run build:demo` | 成功、サービス用環境変数なし |
| `npm audit --omit=dev --audit-level=high` | 成功、本番依存の脆弱性0件 |
| `npm run docs:build` | 成功、リンク検証を含む |
| `npm run docs:check -- <対象>` | CI対象の英語ガイド3件とREADME.en.mdは成功。setupの既存アンカー警告2件は下記 |
| `ruby -c tests/browser/local-env.rb` | `Syntax OK`。実際の起動とDBテストでも使用 |
| `git diff --check`、staged privacy-check | 成功、問題なし |

サービスが必要なコマンドは `tests/browser/local-env.rb <専用サービスディレクトリ> <隔離アプリディレクトリ> <コマンド>` で実行し、ローカルAPIのURLを確認してから接続する。秘密値はログに出していない。

### ブラウザの実処理検証

通常buildを3102番で起動し、`node tests/browser/portal.mjs <Playwrightディレクトリ> <成果物ディレクトリ> <Chromium実行ファイル>` を実行した。毎回生成した一時鍵をテストproviderに用い、nonce/verify/me、SIWE、Server Actions、DBは実処理を通した。実ウォレットへの署名要求は行っていない。

- 未接続→別ネットワーク→Polygon→nonce失敗・署名拒否・署名待ち・認証失敗→再試行→認証。
- 選択回答の通信失敗でも入力を保持し、DBには保存されない。再試行して保存、再読込で次の問いへ再開。
- 採用した5問の正しいID・回答形式・明示スキップをDBで確認。完走後の再編集で値を復元し、回答の変更・スキップによる消去・再読込後の保持・レコード5件のままの上書きを確認。
- Passportの「回答を見直す」から `/initiation?edit=1` の呼び名入力へ進める。
- 完走→申請→審査待ち。通信失敗を成功にせず、再送しても申請は1件。
- チェックインの通信失敗・再試行・保存と再読込。偽の日付や他人のmember IDを余分に送っても、JST当日の本人1件だけ。
- アカウント切替後に旧ユーザーの状態が消える。別ユーザーのデモlocalStorageを完走・承認済みへ改変しても、実申請は拒否。
- 不明な質問IDと旧IDへの新規保存を拒否。他人のIDを余分に送っても本人だけ更新し、前ユーザーの回答は不変。一般ユーザーの `/admin` は404。切断後の保存は未認証として拒否。
- セッション取得503と再試行、旧 `/apply`・`/checkin`、旧ハッシュ、直接アクセス、戻る/進む、キーボードと本文スキップ、クレジットのEnter/Escape、未処理例外なし。

`portal-home.mjs` は通常3102番とデモ3103番の両方で成功。360/768/1440px × ライト/ダークでPODCASTの4場面・YouTubeプレーヤー不在、FREQUENCY、フッター、通常アプリの未認証4画面、デモ画面内の移動、デモJourneyの再回答と再読込を確認した。

`frequency.mjs` は固定のテスト応答で取得中、429、再試行、204、4曲、元の集計期間と出典、追記文、キーボード、3画面幅と両配色を確認した。さらに `--live` でListenBrainz公開APIへのGETを1回だけ許可し、4曲が実際に表示され、認証情報・Cookie・Refererを送らないことを確認した。音源再生は実装していない。

Home/Setup/Journey/Community/Passportと音楽欄を目視確認し、画像はローカルの検証成果物ディレクトリへ保存した。Gitには追加していない。アカウントの旧4項目と現行5問の併存・上書き・別メンバー分離はローカルRepository統合テストでも確認した。

### デモ境界

`node /private/tmp/portal-demo-smoke.mjs` は認証API4経路とPOST8経路の404、旧・通常URL7経路のデモ画面への307、Home・アイコン・生成HTMLの200、noindexを確認して成功した。デモの実行にサービスの認証情報は不要だった。

### TDDと確認中の修正

入口、認証境界、保存、申請、チェックイン、デザイン復元、再回答、質問の切替、音楽取得は、追加したテストが意図した理由で失敗することを確認してから実装した。初回の356件や4項目の成功結果は、上記の最終411件の代わりにはしていない。

| 原因 | 修正と予防 |
| --- | --- |
| 実処理へ接続する際に参照UIの構成を省き、未認証時は単純なカードだけ表示した | 元の幅・2カラム・背景・4カード・場面を復元。公開/認証状態を同じ画面幅で確認するテストを追加 |
| 任意のトークン設定不足でPolygon切替まで消える | 設定不足を任意機能だけへ限定。設定なしのSetupテストを追加 |
| ポータルの手動配色とTailwindのOS由来darkが異なる | data-themeへ揃え、実接続状態の色が追従するブラウザテストを追加 |
| イントロのリンク処理がハッシュだけ読み、通常URLを扱えない | 生成元に通常URLの対応を加え、生成JavaScriptと実クリックを検証 |
| 隣接するPODCASTのデータをFREQUENCYへ入れていた | 音楽の公開ランキングに変更し、取得元・表示文・CSS・テスト・文書を更新 |

`npm ci`には既存のESLint 10のpeer範囲警告があった。dev依存を含む監査は既存のmoderate 2件・high 1件を報告したが、CIと同じ本番依存の監査は0件。今回、依存やCI条件は変更していない。

翻訳チェックの警告は `setup-windows#windows-docker-setup` と `troubleshooting#wallet-connection-lan-ip`。両方の明示アンカーは原文に存在し、docs buildも成功している。検査ツールの明示アンカー認識に関する既存警告として残し、無関係な修正は混ぜていない。Vitestのworker再利用は性能の提案であり、失敗ではない。

## CI-verified / Unverified

この文書は上記実装SHAの **Local-verified** 記録。文書作成時点では、この変更のCI成功はまだ確認していない。Draft PR作成後はPRの同一HEADのチェックを確認し、CI結果を最終報告へ記載する。mainやPR #102の過去の緑を流用しない。

**Unverified:** 実ウォレット拡張・Safari/Firefox・運営ウォレットでのブラウザ審査操作、Vercelの設定とデプロイ、本番/ステージングの認証とDB、オンチェーン照会・Allowlist操作・送金・NFT発行・ロール付与。管理者認可・状態遷移の回帰は単体/Repositoryテスト、一般ユーザーの拒否はブラウザで確認済み。

指定のClaude Game Artifactは公開フレームで403/Client Challengeとなり、現時点の内容を直接確認できなかった。PR #102に収録された同じ参照元のGameと公開Sangraalデモを基に復元した。このURLの現時点との完全一致は未検証。

## 準備中と後続

| 範囲 | 理由 |
| --- | --- |
| 残高・オンチェーンAllowlist | #91の情報源・仕様の確定と実取得が必要 |
| NFT発行・報酬claim・ロール付与 | 実処理がない。NFTは申請条件にしない |
| needs_infoの本人からの追加送信 | 現行には状態・理由・運営の再審査のみ。本人入力の経路は別実装 |
| Community Field・Discord名等 | 後続仕様。活動カードはサンプル |
| 会員の音楽共有 | 将来の構想。本人の同意・公開範囲等を決める必要があり、履歴は収集していない |
| Pulseの動的Issue取得 | [Issue #104](https://github.com/henkaku-center/initiation/issues/104)を依頼に基づいて起票済み。現行は日付付き固定4件 |

厳密さの観点では、実ウォレット、公開環境、後続機能の検証と仕様が残る。初回の通常アプリ接続としては、元の体験を保ちつつサーバーに保存・認可・完走・申請を接続できている。本番運用全体の完成とは扱わない。Issue #52・#91・#104を自動クローズしていない。

## 設定・公開切替・ロールバック

追加migrationとAPIキーは不要。既存3migrationとサーバー用の `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SESSION_PASSWORD` / `SIWE_ALLOWED_DOMAINS`、運営には `ADMIN_ADDRESSES` が必要。任意のトークン表示追加は公開トークン設定を使う。値を出力・コミットしていない。

公開時は別途許可を得て、対象コミット・環境・現在のデプロイ・Build Commandを確認する。通常化は `npm run build` と `HENKAKU_DEMO_ONLY=1` の解除を伴う再ビルド。noindexは維持する。ロールバックは以前のデプロイへ戻すか `npm run build:demo` を再ビルドする。後者は実処理を停止する。旧質問版のコードでは現行5問の完走を認識できないため、記録は削除せず復帰後に利用する。DB削除・逆migration・デモ進捗の移行は不要。

詳細は[ポータルアプリ](../guide/portal-app.md)。この作業では公開環境・DB・実ウォレット・資産を操作していない。GitHubでは依頼されたIssue #104とDraft PRのみを対象とし、マージとIssueのクローズは行わない。
