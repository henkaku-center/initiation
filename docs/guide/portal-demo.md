# ポータル体験デモ

PR #102で取り込んだ、Bubble Multi/Gatewayの入口とGame Aの5ステージを組み合わせた体験デモです。通常アプリはこのUIを使って実認証・採用した質問の保存・申請・チェックインへ接続しています。通常アプリの操作と公開切替は[ポータルアプリ](./portal-app.md)を参照してください。この文書は「デモ操作」から開く `/demo` と、切り戻し用のデモビルドの案内です。ページ上部のEXPERIENCE DEMOの帯は表示せず、模擬体験の説明は操作ダイアログ内に置きます。フッターから通常アプリへ戻れます。

## ローカルで見る

```bash
npm ci
npm run dev:demo -- --port 3000
```

`http://localhost:3000` を開きます。通常のアプリを起動する場合は既存の `npm run dev` を使います。同じポートですでに動いているサーバーがある場合は終了してから切り替えてください。

本番形式の確認は `npm run build:demo` → `npm start` です。通常アプリは `npm run build` で別途ビルドしてください。同じ `.next` に出力するため、開発サーバー・本番サーバー・ビルドを同時に動かさないでください。

## デモ専用環境の設定

1. 公開の許可を得てから、デモ専用プロジェクトと対象コミットを決めます。
2. 通常アプリとデモでは利用するデータと操作が異なります。どちらを公開するかを明示します。
3. Root Directoryはリポジトリ直下、FrameworkはNext.js、Node.jsは22以上の対応バージョンを使います。
4. デモ専用環境ではBuild Commandを `npm run build:demo` にします。リポジトリの `vercel.json` は通常アプリ用の `npm run build` です。デモを公開する場合は承認された設定変更で上書きし、実際のビルドログを確認してください。Install Commandは `npm ci`、Output DirectoryはNext.jsの標準設定です。
5. Environment Variablesは不要です。Supabase、SIWE、管理者、ウォレットのキーを追加する必要はありません。
6. Deploy後、下の確認手順を実行します。

`build:demo` は非秘密の `HENKAKU_DEMO_ONLY=1` をビルドへ固定します。実行環境の値を変えるだけでは通常モードには戻りません。モードを変更するときは再ビルドが必要です。

公開されたデモは検索対象にしないため、HTMLのrobots設定とVercelの `X-Robots-Tag` を付けています。これはアクセス制限ではありません。

## 操作の確認手順

1. 標準イントロの複数バブルと「表示モード」を見る。左下の「暗号化＋泡」で旧版と比較できます。旧版の調整タブには解読19項目、色、Bubble 12項目、再生があります。トップページへ進んだ後は「イントロを再生」で戻れます。
2. 「WALLET SETUP」または最後の「joiN」→「デモウォレットを接続」→「はじめてのメンバー」を選ぶ。残高0・Allowlist未登録になることを確認します。
3. 「署名する」で模擬署名し、Initiationに進む。実際のウォレット拡張や署名要求は出ません。接続を省いてゲームを試すこともできます。
4. 5ステージを進む。呼び名・関心・自由入力・最後の3問を操作し、左右の視点移動と任意の音楽再生を試します。すべての回答は省略可能です。「まだ言葉にしない」はその質問の入力を消して進みます。
5. 途中で別画面へ移動・再読み込みし、回答と現在のステージ（最終3問の位置を含む）を再開できることを確認します。
6. 完走後は「回答を見直す」で、保存した回答を残して修正・再回答できます。パスポートの模擬状態も保持します。完走→パスポート→NFT受領→申請→「デモ審査を開く」→承認→100 HENKAKU受領→メンバーロール、の順に進みます。先の操作は条件を満たすまで無効です。
7. 審査で「確認事項を返す」を選んだ場合は再申請でき、「見送る」を選んだ場合は見送り表示になります。
8. Communityの「DAILY CHECK-IN」でチェックインし、直下のサブカテゴリ「YOUR FOOTPRINTS」に記録が表示されることを確認する。チェックインは日本時間で1日1回。同じ日に押し直しても増えません。その下のOPEN SIGNALSでサンプル活動を開き、関心を付け外しします。
9. 右下「デモ操作」で未接続・取得失敗・別ネットワーク・既存メンバーを切り替える。取得不能のときはゼロ残高や未登録と誤表示しません。アカウント切替は進捗を初期化します。
10. Tab/Enterだけで画面とダイアログを操作し、Escapeでダイアログを閉じる。スマートフォンの縦画面でも、フォームと次へ進むボタンが使えることを確認します。
11. 共通ヘッダーでライト／ダークを切り替え、Home・Setup・Initiation・Community・Passportと再読み込みで選択が引き継がれることを確認します。初期設定はライトです。ホームも他画面と同じヘッダー・フッターを使います。
12. HomeのPODCASTでLISTENING ROOM・FRAGMENTS・OBSERVED・ENTERの4場面が、縦スクロールに応じて横へ流れることを確認する。見出し下の追加紹介文、YouTube API・プレーヤー、再生ボタンはありません。動きを減らす設定では4場面を縦に表示します。
13. FrequencyにListenBrainzの週間上位4曲、集計期間・更新日・出典が表示されることを確認します。取得失敗時はエラーと再試行、未集計の場合は空状態になります。Pulseの4件は本家Issueへの固定リンクで、開発中の注記と確認日を表示します。
14. 共通ナビでSetupがCommunityの左隣にあり、クリックでウォレット設定へ進むことを確認する。ホーム末尾のjoiNはカラム内だけが反転し、ライトモードでは暗いカラム・明るい文字、ダークモードでは明るいカラム・暗い文字になります。周囲のページ背景は元の配色を維持します。

### 現在のGateway構成

- Bubble Multiの元コードに基づく複数の泡・融合・カーソルへの追従と表示モード切替。暗号化版も比較用に保存しています。添付の黒いマークをSVG化しています。
- Homeも他のデモ画面と共通のヘッダー・フッターを表示します。通常アプリも同じライト／ダーク切替を利用し、ホームiframeへ配色を同期します。写真・生成画像とその上の文字、比較用イントロの表現は維持します。
- Setup・Initiation・Passport・CommunityのJavaScriptは、各画面を選択した時に読み込みます。状態と共通ナビは引き続き共有します。
- Community Pulseは本家の未解決Issue [#46](https://github.com/henkaku-center/initiation/issues/46)・[#73](https://github.com/henkaku-center/initiation/issues/73)・[#67](https://github.com/henkaku-center/initiation/issues/67)・[#48](https://github.com/henkaku-center/initiation/issues/48)の4カードです。「開発中のため」の注記と2026年9月9日の確認日を表示します。開発計画に沿って選んだスナップショットで、自動同期ではありません。
- Voices / Podcastは[参照Gateway](https://henkaku-ui.vercel.app/gateway-v1-claude)の4場面と横スクロールを使います。ASCII・断片画像・観測画面・入口という構成を保ち、YouTube埋め込みは読み込みません。公式サイトへの番組リンクは残します。
- FrequencyはListenBrainz全体の週間音楽ランキングを公開APIから取得します。個人の再生履歴を保存・公開せず、架空のリスナーやYouTubeのサムネイルは使いません。通常アプリと同じ生成元・取得処理です。
- Thresholdは元の`joiN`、小さめの文字サイズ、枠の解読を維持します。JoiNのカラム内だけを逆のライト／ダーク配色にし、周囲の背景や補助リンクはページ本体の配色を維持します。
- 元のOSの動きを減らす設定への対応を維持しています。

## 保存と外部接続

- 保存キーは `henkaku.portal-demo.v1`。同じブラウザ・同じ公開URLの中だけで共有します。実際の会員データには接続しません。
- 配色は `henkaku.appearance.v1` に保存します。デモ進捗とは独立した設定で、「デモ操作」の進捗リセットでは消しません。保存不能なら、その表示中だけの設定として動作します。Frequencyは公開ランキングを表示し、旧キー `henkaku.podcast-demo.history.v1` は読み書きしません。
- localStorageが使えない場合は画面に案内し、メモリ内で体験を続けます。この場合、ページを閉じると消えます。
- 「デモ操作」→「新入りとして最初から体験する」で、このデモの記録だけをリセットできます。
- デモ画面は `wagmi` や認証API、Repositoryを呼びません。デモビルドのProxyは `/api/*` とすべてのGET/HEAD以外のリクエスト（Server Actionsを含む）を404にします。
- `/setup`、`/initiation`、`/apply`、`/passport`、`/admin`、`/checkin`、`/community` のリンクもデモ内の対応画面へ誘導します。
- サンプル活動は実際の募集ではありません。NFT、トークン、ロール、審査結果もすべて模擬状態です。

## 素材

標準イントロでは複数の泡が漂い、リンクからフェードして対応画面へ進みます。左下の「複数の泡」「暗号化＋泡」で比較できます。暗号化版は空白のクリックで暗号化／復号を切り替え、復号後にリンクを選びます。トップの「イントロを再生」で再表示できます。暗号化版の原本・復元方針は`assets/reference/gateway/archive/encrypted-intro/`に保存しています。Journeyは背景と旅人を共通の座標で配置し、質問フォームから独立させています。

VOICES / PODCASTの4つの抽象場面の下で[Joi Ito's Podcast — 変革への道](https://joi.ito.com/podcast/)を短い要約と公式サイトへのリンクで紹介します。YouTube埋め込みは通常・デモともに読み込みません。FREQUENCYは[ListenBrainzの公開データ](https://listenbrainz.org/data/)（CC0）を使い、音源・ジャケット・個人履歴を取り込みません。詳細は[ポータルアプリ](./portal-app.md#frequencyの音楽)を参照してください。

ゲーム背景とCommunity/Passportの画像は生成素材、ゲーム音楽は既存の許諾済みMIDIから合成したプレビューです。トップは指定元のコードを収録し、canvas-ui由来の2モジュールの元ライセンスと著作権表示を保持しています。

詳細は [素材のクレジット](https://github.com/sangraal123/initiation/blob/codex/portal-demo/public/demo-assets/CREDITS.md)、[参照コード・Podcastのクレジット](https://github.com/sangraal123/initiation/blob/codex/portal-demo/public/demo-assets/gateway/CREDITS.md)、生成プロンプトは [asset-provenance.json](https://github.com/sangraal123/initiation/blob/codex/portal-demo/public/demo-assets/asset-provenance.json) に記録しています。画面のフッターからも素材の案内を確認できます。

## 検証コマンド

以下は現在のCIに対応する検証コマンドです。通常buildの型生成後に型チェックを行い、最後にデモbuildを確認します。2026-09-09の記録は`tests/layout/README.md`に残していますが、現在の変更の検証結果とは区別します。

```bash
npm run build
npx tsc --noEmit
npm run lint
npx vitest run tests/unit
npx vitest run tests/integration
npm run build:demo
```

`npm test`のうち既存のRepository統合テストはローカルSupabaseが必要です。デモの実行と単体テストには不要です。Supabaseなしで単体テストだけを実行する場合は `npx vitest run tests/unit` を使います。
