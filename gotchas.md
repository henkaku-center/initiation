# Gotchas

- 2026-09-12: 参照UIのセクション名だけでデータの種類を決めない。FREQUENCYは音楽であり、隣接するPODCASTのデータで埋めない。公開ランキング・架空サンプル・本人の履歴を区別し、仕様変更時は取得元、生成処理、テスト、表示文も一緒に更新する。

- 2026-09-12: 参照UIを実処理へ接続するときは、元のコンテナ幅・カード構成・導入と場面演出を維持し、操作とデータ取得の部分を置き換える。未実装箇所は準備中やサンプル表示にし、画面構成そのものを省略しない。接続後は参照画面と同じ幅・状態で比較する。動作テストだけではデザインの差を検出できない。

- 2026-08-06: さくらの AI Engine は `SAKURA_AI_BASE_URL` に URL、`SAKURA_AI_API_KEY` にアカウントトークンを設定する。診断時はキーの値を出力せず、URL 形式だけを検証する。
- 2026-08-06: wagmiの接続状態をSSRページで描画する場合は`createConfig({ ssr: true })`を設定する。MetaMaskの再接続がHydration前に走ると、サーバーの接続ボタンとクライアントの接続済み表示が不一致になる。
- 2026-08-06: Next.js App Routerのページは必ず`app/<route>/page.tsx`に置く。ルート直下の同名ディレクトリではルートとして認識されず、buildのルート一覧から漏れる。
- 2026-08-06: wagmiの`wagmi/connectors` barrel importはTempo向け任意依存`accounts`までビルドへ含めるため、Injected Walletだけを使う場合は`wagmi/connectors/injected`を直接importする。
