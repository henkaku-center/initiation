# 2026-09-12 ポータルUIを既存の参加フローへ接続する

> 追記: 別の模擬アプリを維持する方針は[模擬アプリ廃止の決定](./2026-09-12-retire-portal-demo.md)で置き換えました。以下のデモbuild・操作・検証結果は、その決定前の記録です。現在の操作は通常アプリへ統一しています。

PR #102のUIを通常アプリの入口として採用する。受け入れ側で実認証・保存・申請へ接続し、作者へ本番化の完成を要求しない。取り込み時点のライセンス確認済みという判断に従い、既存の著作権・ライセンス・素材クレジットを保持する。

初回は既存4項目の接続から着手した。その後、依頼者が「質問内容もデモ版へ切り替えて再編集する」を選択したため、現在の質問と完走条件は[質問の切替決定](./2026-09-12-journey-questionnaire.md)に従う。旧記録と完走済み資格を保持し、デモ進捗の自動移行は行わない。

Home、Setup、Initiation、Community、Passportを通常URLへ組み込む。`/apply`と`/checkin`は引き続き使える。認証API、Server Actions、Repositoryと運営権限を再利用する。申請の審査・Allowlist・配布は独立した既存状態を表示し、NFT保有を条件にしない。

残高・オンチェーンAllowlist取得、NFT発行、報酬claim、ロール付与、本人からの追加情報送信は準備中とする。元のデモのレイアウト・導入・景色・探索演出を通常アプリとして採用する。未認証時にも全体の構成を見せ、本人の記録取得や操作を認証で区切る。Communityの活動はサンプルと明記して残す。FREQUENCYは[ListenBrainzの公開音楽ランキング](./2026-09-12-frequency-listenbrainz.md)へ接続する。依頼者の指定により、[参照Gateway](https://henkaku-ui.vercel.app/gateway-v1-claude)のPODCASTの4場面と横スクロール、公式サイトへのリンクを残し、通常・デモともにYouTube埋め込みをいったん外す。見出し下の追加紹介文とEXPERIENCE DEMOの帯は外す。生成処理は `scripts/gateway/` に置く。Pulseの動的取得は[Issue #104](https://github.com/henkaku-center/initiation/issues/104)の後続作業とする。この点は[2026-09-09のPodcast決定](./2026-09-09-podcast-preview-and-listening-history.md)を更新する。メンバーの視聴履歴は収集せず、フッターから既存のプライバシーポリシーへリンクする。Issue #52・#91全体の完了を意味せず、自動クローズしない。

通常buildを公開設定の既定とするが、公開環境の変更は別の明示的な許可を必要とする。`noindex`は維持し、実処理への接続を検索公開の許可と解釈しない。`build:demo`は比較・ロールバックのために残す。この点は[2026-09-09のデモ決定](./2026-09-09-portal-experience-demo.md)の通常build・公開設定を更新する。

調査根拠と受け入れ条件は[実装計画](https://github.com/henkaku-center/initiation/blob/main/docs/superpowers/plans/2026-09-12-portal-app-integration.md)、設定・切替手順は[運用ガイド](../guide/portal-app.md)に記録する。
