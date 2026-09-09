# ポータル体験デモ

Issue #91の状態表示、指定されたBubble Multi/Gatewayの入口、Game Aの5ステージを組み合わせた独自ブランチのデモです。トップページは参照元のHTML/CSS/JSを基準にし、同一オリジンの文書内で元のスクロール構造を維持しています。上流コミュニティの本番仕様を確定するものではありません。

## ローカルで見る

```bash
npm ci
npm run dev:demo -- --port 3000
```

`http://localhost:3000` を開きます。通常のアプリを起動する場合は既存の `npm run dev` を使います。同じポートですでに動いているサーバーがある場合は終了してから切り替えてください。

本番形式の確認は `npm run build:demo` → `npm start` です。通常アプリは `npm run build` で別途ビルドしてください。同じ `.next` に出力するため、開発サーバー・本番サーバー・ビルドを同時に動かさないでください。

## Vercelの設定

1. このforkをVercelの新しいデモ専用プロジェクトへImportします。
2. デプロイ対象ブランチを `codex/portal-demo` にします。継続してProduction URLに反映する場合は、そのプロジェクトのProduction Branchにも指定します。
3. Root Directoryはリポジトリ直下、FrameworkはNext.js、Node.jsは22以上の対応バージョンを使います。
4. Build Commandは `vercel.json` の `npm run build:demo` を使います。Install Commandは標準のnpmの設定（明示するなら `npm ci`）、Output DirectoryはNext.jsの標準設定です。
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
6. 完走→パスポート→NFT受領→申請→「デモ審査を開く」→承認→100 HENKAKU受領→メンバーロール、の順に進みます。先の操作は条件を満たすまで無効です。
7. 審査で「確認事項を返す」を選んだ場合は再申請でき、「見送る」を選んだ場合は見送り表示になります。
8. Communityでサンプル活動を開き、関心を付け外しする。チェックインは日本時間で1日1回。同じ日に押し直しても増えません。
9. 右下「デモ操作」で未接続・取得失敗・別ネットワーク・既存メンバーを切り替える。取得不能のときはゼロ残高や未登録と誤表示しません。アカウント切替は進捗を初期化します。
10. Tab/Enterだけで画面とダイアログを操作し、Escapeでダイアログを閉じる。スマートフォンの縦画面でも、フォームと次へ進むボタンが使えることを確認します。

### 現在のGateway構成

- Bubble Multiの元コードに基づく複数の泡・融合・カーソルへの追従と表示モード切替。暗号化版も比較用に保存しています。添付の黒いマークをSVG化しています。
- Community Pulseはプロジェクト、投稿、クエスト、Check-inの4カードが順に現れます。
- Voices / Podcastは元ソースの4場面が、縦スクロールに応じて横へ流れます。音声の自動再生はありません。
- Frequencyは4件の匿名の仮再生ログと抽象プレースホルダーです。音源や個人情報は埋め込んでいません。
- Thresholdは元の`joiN`、小さめの文字サイズ、枠の解読を維持しています。
- 元のOSの動きを減らす設定への対応を維持しています。

## 保存と外部接続

- 保存キーは `henkaku.portal-demo.v1`。同じブラウザ・同じ公開URLの中だけで共有します。実際の会員データには接続しません。
- localStorageが使えない場合は画面に案内し、メモリ内で体験を続けます。この場合、ページを閉じると消えます。
- 「デモ操作」→「新入りとして最初から体験する」で、このデモの記録だけをリセットできます。
- デモ画面は `wagmi` や認証API、Repositoryを呼びません。デモビルドのProxyは `/api/*` とすべてのGET/HEAD以外のリクエスト（Server Actionsを含む）を404にします。
- `/setup`、`/initiation`、`/apply`、`/admin`、`/checkin` のリンクもデモ内の対応画面へ誘導します。
- サンプル活動は実際の募集ではありません。NFT、トークン、ロール、審査結果もすべて模擬状態です。

## 素材

標準イントロでは複数の泡が漂い、リンクからフェードして対応画面へ進みます。左下の「複数の泡」「暗号化＋泡」で比較できます。暗号化版は空白のクリックで暗号化／復号を切り替え、復号後にリンクを選びます。トップの「イントロを再生」で再表示できます。暗号化版の原本・復元方針は`assets/reference/gateway/archive/encrypted-intro/`に保存しています。Journeyは背景と旅人を共通の座標で配置し、質問フォームから独立させています。

VOICES / PODCASTでは[Joi Ito's Podcast — 変革への道](https://joi.ito.com/podcast/)を独自の短い要約で紹介し、公式サイトへ案内します。番組の音源・画像・本文は収録していません。

ゲーム背景とCommunity/Passportの画像は生成素材、ゲーム音楽は既存の許諾済みMIDIから合成したプレビューです。トップは指定元のコードを収録し、canvas-ui由来の2モジュールの元ライセンスと著作権表示を保持しています。

詳細は [素材のクレジット](https://github.com/sangraal123/initiation/blob/codex/portal-demo/public/demo-assets/CREDITS.md)、生成プロンプトは [asset-provenance.json](https://github.com/sangraal123/initiation/blob/codex/portal-demo/public/demo-assets/asset-provenance.json) に記録しています。画面のフッターからも確認できます。

## 検証コマンド

2026-09-09のイントロ・Journey・Podcast更新は依頼によりレイアウト確認のみ実施しました。確認方法と結果は`tests/layout/README.md`を参照してください。以下はプロジェクト全般の検証コマンドです。

```bash
npm test
npm run build:demo
npx tsc --noEmit
npm run lint
npm run build
```

`npm test`のうち既存のRepository統合テストはローカルSupabaseが必要です。デモの実行と単体テストには不要です。Supabaseなしで単体テストだけを実行する場合は `npx vitest run tests/unit` を使います。
