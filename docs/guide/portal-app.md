# ポータルアプリ

`npm run dev` / `npm run build` は、PR #102の画面・演出・構成を使い、既存の参加処理へ接続します。別の模擬アプリと「デモ操作」は[廃止しました](../decisions/2026-09-12-retire-portal-demo.md)。

## 画面と保存

| 画面 | URL | 実処理 |
| --- | --- | --- |
| Home | `/` | 通常ページへの入口、公開Podcastの紹介、ListenBrainzの週間音楽ランキング |
| Setup | `/setup` | ウォレット接続、Polygon確認、SIWE署名による認証、任意のトークン表示追加 |
| Initiation | `/initiation` | 任意の呼び名、採用した5問の保存・再開・再編集・サーバー完走判定 |
| Community | `/community`、従来の`/checkin` | 本人の日次チェックインと履歴 |
| Passport | `/passport`、従来の`/apply` | 完走状態、申請・再申請、審査・Allowlist・配布の状態 |
| 運営 | `/admin` | 既存の管理者認可・審査・実行記録・監査イベント |

旧Homeの `/#setup` / `/#journey` / `/#community` / `/#passport` は対応する通常URLへ移動します。旧 `/demo` は `/` へ308リダイレクトし、`/demo#journey` なども同じマッピングで通常画面へ進みます。直接アクセス・再読込は、そのURLの認証済みサーバーデータを取得します。

未認証でもJourneyの背景・導入、Passportの4つのカード、Communityのサンプルを表示します。本人の記録は取得せず、保存・申請・チェックインにはサインインが必要です。Journeyの5場面は演出であり、必須項目数とは別です。

質問はデモ版の関心・好奇心・経験・活動の準備・持ち寄りたいものに統一しました。`v2-interests` / `v2-curiosity` / `v2-experience` / `v2-readiness` / `v2-contribution` の5件を、回答済みまたは明示的なスキップとしてサーバーへ保存します。個々の回答と呼び名は任意です。空欄のNEXTや「まだ言葉にしない」は、その質問をスキップした記録になります。最後まで5件を保存したことをサーバーで検証します。詳しい形式は[質問の切替決定](../decisions/2026-09-12-journey-questionnaire.md)を参照してください。

旧4項目の回答は自動変換せず保持します。旧版で完走済みの人は申請資格を保持しますが、質問画面では現行の質問を編集します。完走画面の「回答を見直す」か、Passportから `/initiation?edit=1` を開くと呼び名から見直せます。現行回答は同じIDへ上書き保存し、スキップを選び直すと以前の回答を消します。ウォレット接続だけで認証や完走にはなりません。

保存に失敗した場合は入力を残します。申請やチェックインの通信結果を確認できない場合は、状態を再取得してから再試行してください。申請の重複はDB制約、チェックインは日本時間の日付と1人1日1件のDB制約で防ぎます。ブラウザから日付や他人のmember IDを指定する契約はありません。

アカウント切替・切断時は前のデータを画面から隠し、セッションを破棄します。サインアウトの通信に失敗した場合は再試行が必要です。ブラウザに保持する `henkaku.appearance.v1` は配色、イントロの既読は表示設定です。`henkaku.portal-demo.v1` は本番の回答・完走・申請・配布判定に使わず、自動移行もしません。

## 準備中の範囲

- トークン残高・オンチェーンAllowlist照会は#91の仕様・情報源が未確定です。架空の数値で補いません。トークン表示追加の設定がなくてもネットワーク切替と認証は進められます。
- NFT発行、報酬claim、ロール付与は未実装です。NFT保有は申請条件ではありません。Allowlist追加とHENKAKU送付は既存の手動運用で、画面は運営が記録した状態を示します。
- `needs_info` は理由を表示します。本人から追加入力する処理は未実装で、運営の案内に従います。再申請できるのは既存モデルの `rejected` です。
- Communityの活動カードは元の構成を保ったサンプル表示です。架空の活動であることを明示します。Community Fieldの実データ・参加受付は未実装です。
- HomeのPulseは確認日付きの固定のIssue紹介です。動的取得は[Issue #104](https://github.com/henkaku-center/initiation/issues/104)で扱います。PODCASTは[参照Gateway](https://henkaku-ui.vercel.app/gateway-v1-claude)の4つの抽象場面と横スクロールを採用し、公式サイトへのリンクを残します。YouTube埋め込み・プレーヤー読み込み・見出し下の追加紹介文は外しています。

- Discord名、Field閲覧記録、メンバーの音楽共有は後続の仕様判断です。個人の視聴履歴は収集・公開していません。Issue #52・#91はこの接続だけで完了しません。

フッターから[既存のプライバシーポリシー](../privacy-policy.md)と素材のクレジットを確認できます。通常版に必要な画像・音源は取り込み時の `public/demo-assets/` に保持しています。この素材URLは別の模擬アプリや保存経路を意味しません。

## FREQUENCYの音楽

ListenBrainzの公開API `GET /1/stats/sitewide/recordings?range=week&count=4` をブラウザから取得します。曲名、アーティスト名、全体の再生数、集計期間と更新日（UTC）を表示します。曲のIDがある場合はMusicBrainzの楽曲情報へ、ない場合はListenBrainzのランキングへリンクします。

APIキー・ユーザー名・ウォレットアドレス・Cookieは送信しません。音源、ジャケット、YouTubeプレーヤー、個人履歴を取得せず、レコードの図はCSSの抽象表現です。データはCC0で公開されています。出典とAPI仕様は[音楽の決定事項](../decisions/2026-09-12-frequency-listenbrainz.md)を参照してください。

読み込み時に1回取得し、8秒で打ち切ります。失敗時はエラーと再試行・出典リンク、未集計や空の応答には空状態を表示します。ランキングの更新頻度や集計の遅れはListenBrainz側に依存するため、取得日のランキングとは言い換えません。ビルド中の外部取得や固定サンプルへのフォールバックはありません。

「将来的にはコミュニティメンバーが聞いている曲が共有されるかも！？」は将来の構想です。共有する情報と同意・公開範囲を決めてから別途実装します。

## 必要な設定とmigration


サーバー用に `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、32文字以上の `SESSION_PASSWORD`、アクセス元hostとportに合う `SIWE_ALLOWED_DOMAINS` が必要です。運営を使う場合は `ADMIN_ADDRESSES` を設定します。値の出力やコミットはしないでください。

任意のウォレット表示追加は、ビルド時の `NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS`、必要に応じて `NEXT_PUBLIC_HENKAKU_TOKEN_SYMBOL` / `NEXT_PUBLIC_HENKAKU_TOKEN_DECIMALS` / `NEXT_PUBLIC_HENKAKU_TOKEN_LOGO_URL` を使います。保有照会や送金を実装する設定ではありません。

今回の追加migrationはありません。既存の3つのmigration（コアテーブル、申請遷移、レート制限）が前提です。本番DBへの適用はこの作業には含みません。詳細は[アーキテクチャ](./architecture.md)と[開発環境のセットアップ](./setup.md)を参照してください。

## 公開切替とロールバック

1. 公開の明示的な許可を得て、対象コミットと利用する環境を確定します。現在のデプロイとBuild Commandをロールバック先として記録します。
2. 対象環境の設定・既存スキーマを確認します。開発用テストに本番・ステージングの認証情報を持ち込まないでください。
3. Node 22以上、Install Command `npm ci`、Build Command `npm run build`、Next.js標準出力を使います。リポジトリの `vercel.json` はこの通常buildを指定します。管理画面側に上書きがある場合は、実際のBuild Commandとビルドログを照合します。
4. 以前の `build:demo` の上書きがある場合は `npm run build` へ変更し、不要になった `HENKAKU_DEMO_ONLY` を設定から除きます。このフラグはコードから削除されており、残っていても模擬モードへ切り替わりません。対象コミットを通常buildで再ビルドします。
5. 許可された環境で認証→保存→再開→完走→申請→チェックインを確認します。実ウォレット署名、外部アカウント変更、Allowlist操作、送金、NFT発行はそれぞれ別途確認が必要です。
6. HTMLのrobotsとVercelの `X-Robots-Tag: noindex, nofollow` を維持します。`noindex` はアクセス制限ではなく、解除には別の公開方針の判断が必要です。

ロールバックは記録した以前のデプロイへ戻します。現行コードには別のデモbuildはありません。戻すデプロイが模擬版なら実認証・保存・申請は利用できなくなるため、対象の動作を確認してください。DB記録は保持し、DB削除・逆migration・デモlocalStorageの移行は行いません。

この変更は設定ファイルと手順を用意するもので、デプロイや公開環境の設定変更を実施したものではありません。

## 生成元と検証

Homeは `assets/reference/gateway/` と `scripts/gateway/build-gateway.mjs`、イントロは `scripts/gateway/build-bubble-intro.mjs` を編集します。通常用の `public/demo-assets/gateway/app-*.html` とデモ用HTMLは生成物です。HTMLだけを直接変更せず、`node scripts/gateway/build-gateway.mjs` で再生成してください。

```bash
npm ci
npm run build
npx tsc --noEmit
npm run lint
npx vitest run tests/unit
npx vitest run tests/integration
npm audit --omit=dev --audit-level=high
```

統合テストはローカルSupabase専用です。通常サーバー・デモサーバー・buildは同じ `.next` を使うため、別コピーにするか順番に停止・実行します。ブラウザの自動確認は[テストの案内](https://github.com/henkaku-center/initiation/blob/main/tests/browser/README.md)を参照してください。実ウォレットの操作確認はこの自動テストとは別です。
