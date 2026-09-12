# 2026-09-12 FREQUENCYをListenBrainzの公開音楽ランキングにする

依頼者の指定に従い、FREQUENCYは音楽を紹介する。[9月9日の架空のコミュニティ再生履歴](./2026-09-09-community-frequency.md)を、ListenBrainz全体の週間ランキングへ置き換える。PODCASTの4場面と公式サイトへのリンクは保持し、YouTube埋め込みは読み込まない。

- [公式API仕様](https://listenbrainz.readthedocs.io/en/latest/users/api/statistics.html#get--1-stats-sitewide-recordings)の `GET https://api.listenbrainz.org/1/stats/sitewide/recordings?range=week&count=4` を使う。2026-09-12に認証なしで200・CORS許可・4曲の応答を確認した。
- ブラウザから固定URLへ1回取得する。認証情報、Cookie、Referer、個人の識別子は送らない。APIキーやDB追加は不要。8秒で打ち切り、失敗時は手動再試行と出典リンクを表示する。空データを架空曲で補わない。
- 曲名・アーティスト・集計再生数・元の集計期間と更新日（UTC）を表示する。更新遅延は提供元に依存する。曲IDがある場合はMusicBrainzの楽曲情報へリンクする。
- データはListenBrainzが[CC0で公開](https://listenbrainz.org/data/)しているもの。音源・ジャケット・個人履歴は取得せず、図柄はCSSで描く抽象的なレコードとする。出典と元ライセンスをCREDITSへ記録する。
- 通常HomeとデモHomeは同じ編集元・生成処理を使う。ビルド時の外部取得は行わない。旧デモ進捗・再生履歴キーを読み書きしない。

表示には「ListenBrainz全体の公開ランキングです。ListenBrainzで見る ↗」と、依頼された「（将来的にはコミュニティメンバーが聞いている曲が共有されるかも！？）」を添える。後者は構想であり、会員の音楽共有を実装・収集している表示ではない。個人共有を行う場合は同意・公開範囲・保存と削除の仕様を別途決める。
