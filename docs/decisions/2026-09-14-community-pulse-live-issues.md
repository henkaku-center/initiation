# 2026-09-14 Community Pulseの公開Issueを1時間キャッシュして表示する

[Issue #104の合意](https://github.com/henkaku-center/initiation/issues/104#issuecomment-5651228636)に従う。MVP-1に必要な議題を運営がラベルで選び、Homeから議論へ進める入口の情報を更新する。

- 本家 `henkaku-center/initiation` の `community-pulse` ラベル付きopen Issueを更新日時の降順で最大6件表示する。PRは除外し、6件に達するか一覧が尽きるまでGitHubのLinkヘッダーでページ送りする。同時刻は番号の降順。同時更新による重複は番号で除く。
- 通常アプリの `GET /api/community-pulse` が公開REST APIを取得する。画面やビルドからGitHubを直接呼ばない。初期は認証なしで動作し、必要ならサーバー専用の `COMMUNITY_PULSE_GITHUB_TOKEN` を設定できる。
- 取得・検証・選定を終えた一覧と `lastSuccessAt` を一つのスナップショットとしてNext Data Cacheへ保存する。1時間後のアクセスでバックグラウンド再検証する。応答しただけでは成功時刻を進めない。0件も正常なスナップショットである。
- 現行アプリはCache Componentsを使っていないため、対応する `unstable_cache`（`revalidate: 3600`）を利用する。Next 16では `use cache` が推奨されるが、今回のために全体の描画モードやキャッシュ基盤を移行しない。将来移行する際は共有保存と異常時の保持も検証する。
- 再検証の失敗は成功キャッシュを上書きしない。1時間を超えたスナップショットには「最新情報ではない可能性」を表示する。これは再検証中・失敗中を含む鮮度の表示であり、失敗が発生したと断定する表示ではない。キャッシュがなければ503と安全な案内を返す。キャッシュは永続的な記録ではなく、消失時は初回取得として扱う。
- 初回取得は最大8秒、ページ送りは最大5ページ。上限・不正レスポンス・途中ページの失敗を「0件」や正常な部分取得にはしない。GitHubへの同時取得はワーカー内でまとめる。
- 失敗後は最低60秒、`Retry-After`・`X-RateLimit-Reset` があればその期間以上、同じワーカーからの再試行を抑止する。成功データはNextの共有キャッシュ、再試行抑止はワーカー単位であり、全インスタンス共通の厳密なリクエスト上限ではない。アクセス増大時はGitHub認証やホスティング側の制限を検討する。
- 公開API応答そのものとブラウザには追加キャッシュを設けない。鮮度の判定を毎回行い、キャッシュを二重にして更新を遅らせない。Homeは表示時に一度取得し、ポーリングやタブ復帰による再取得は行わない。
- Issueタイトルはテキストとして描画する。リンクは本家のIssue URLに限定し、本文・投稿者情報・トークン・上流のエラー本文はクライアントへ渡さない。

通常ポータルへの接続・デモ撤去はPR #105で完了しているため、現行の `assets/reference/gateway/` と `scripts/gateway/` を編集し、生成物も揃える。#52・#91の完了条件や掲載Issueの選定自体は変更しない。ラベル作成・掲載対象への付与は運営が行う。

参考: [Next.jsのキャッシュと再検証](https://nextjs.org/docs/app/guides/incremental-static-regeneration)、[GitHub Issue一覧](https://docs.github.com/en/rest/issues/issues#list-repository-issues)、[GitHubのレート制限時の扱い](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api#handle-rate-limit-errors-appropriately)。
