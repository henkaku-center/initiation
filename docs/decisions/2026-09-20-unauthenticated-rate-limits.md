# 2026-09-20 未認証エンドポイントのレート制限をVercel WAFで行う(Issue #50)【決定案】

> 状態: **決定案**。[Issue #50](https://github.com/henkaku-center/initiation/issues/50) での合意後に「決定案」の表記を外す。ルールの作成は公開切替の作業に含める。

- 課題: 未認証で叩ける入口（`GET /api/auth/nonce` / `POST /api/auth/verify`、および後から加わった `GET /api/community-pulse`）への連打が、本番公開前に抑えられていない。Issue #50 は「ホスティング側の層で何が使えるか」の確認待ちで止まっており、含まれない場合は Upstash / Vercel KV の導入判断へ戻る前提だった。
- 認証後のServer Actionは [#37 の対応](./2026-08-10-rate-limit-authenticated-actions.md)で済んでいる。ここで扱うのは未認証の入口だけ。

## 前提として確認した事実(2026-09-20)

### Vercel WAFのレート制限

[WAF Rate Limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)（最終更新 2026-08-28）の記載から。

- **すべてのプランで使える。** ルール数は Hobby が1プロジェクトあたり**1本**、Pro が40本、Enterprise が1000本。Hobby はカスタムファイアウォールルール全体でも3本まで
- 数える鍵は Hobby / Pro では **IP と JA4 Digest** のみ。User-Agent や任意ヘッダーは Enterprise のみ
- アルゴリズムは Hobby / Pro は固定窓のみ。窓は**最小10秒・最大10分**（Enterprise は最大1時間）
- 超過時の動作は既定の429のほか、**Log / Deny / Challenge** を選べる。ドキュメントは「まず Log で影響を観測してから制限や遮断を適用する」使い方を案内している
- 設定はダッシュボードの Firewall から行い、**Review Changes → Publish** で本番へ反映する
- 含まれる量は Hobby が月100万の許可リクエスト、Pro は従量。課金はリクエスト元のリージョンによる
- **カウンターはリージョンごと**に持たれる。同じ鍵の通信が複数リージョンに分かれると、設定した上限を全体では超えうる

つまり、**Issue #50 が確認待ちとしていた「契約プランに含まれるか」は解消した。** Upstash / Vercel KV を入れる判断に戻る必要はない。

### `@vercel/firewall`（Rate Limiting SDK）は代わりにならない

[Rate Limiting SDK](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk) の `checkRateLimit()` は**関数の中で呼ぶ**ものなので、関数の起動そのものは防げない。Issue #50 が「課金を止められるのはエッジ側だけ」と書いた理由がそのまま当てはまる。IP以外の鍵（認証済みユーザーIDなど）が要るときの手段であって、今回の目的には使わない。

### アプリ側の現状

- `GET /api/auth/nonce` は封緘Cookieへnonceを書いて返すだけで、DBを触らない
- `POST /api/auth/verify` は検証に**成功したときだけ** `members.upsertByAddress()` を呼ぶ。失敗する署名検証はDBに届かない
- `GET /api/community-pulse` はワーカー単位で取得をまとめ、失敗後は最低60秒の再試行抑止を持つ（[Community Pulseの決定記録](./2026-09-14-community-pulse-live-issues.md)）。ただし**IP単位の上限は持たない**
- どれも未認証で叩けるため、増えるのは関数の実行回数とCPU

## 決定案

### 1. 層と単位

**Vercel WAFのレート制限ルールを1本置き、鍵はIPにする。** JA4 Digest はTLSの指紋で、IPを変える相手には強いが、同じブラウザ・同じ設定の利用者をまとめてしまう。未認証の入口で手がかりがIPしかないという Issue #50 の整理をそのまま採る。

**条件はパスで絞り、`/api/` 以下を対象にする。** Hobby ではルールが1本しか作れず、条件はすべてANDで評価されるため、`/api/auth/*` と `/api/community-pulse` を別々のルールに分けられない。1本で両方を覆う形にしておけば、プランに関係なく同じ設定が使える。画面の読み込みは `/api/` に入らないので数に入らない。

### 2. 上限と窓

**既定値のまま、60秒あたり100リクエストから始める。** 根拠は次のとおり。

- 1回のサインインは nonce と verify の2リクエスト。署名のやり直しを含めても、1人が1分間に使うのは多くて10程度
- 同一ネットワーク（イベント会場のWi-Fiなど）から同時にサインインする場合でも、100/分は同時に十数人が繰り返し試せる水準
- 一方で、連打する側は1分100回・1時間6000回に抑えられる

トラフィックの実績がまだないため、**最初は動作を Log にして観測し、実際の分布を見てから Deny（429）へ切り替える。** 観測期間と切り替えの判断はIssue #50 で記録する。

### 3. 超過時のふるまい

- エッジで落とされるため、429は関数に届かない。アプリのログには残らず、Firewallの画面で見る
- **画面には「待てば戻る」ことを伝える。** `lib/auth/signInWithWallet.ts` は429を他の失敗と分けて扱い、「アクセスが集中しています。しばらく待ってから、もう一度お試しください。」を出す。従来の「もう一度お試しください」「もう一度署名してください」は、上限に当たっている相手に再試行を促し、上限を消費し続けさせてしまう
- Community Pulse は取得に失敗すると前回成功分を出す既存のふるまいに乗る。429でも同じ経路になる

### 4. 対象外

- **nonceの単回性はここでは変えない。** [2026-08-24の決定](./2026-08-24-siwe-nonce-single-use.md)のとおり、封緘Cookieへの束縛とmessageの有効期限（≤15分）でリプレイの主体と窓を限定する
- アプリ内での未認証リクエストの計数。DBで数えると検査のほうが守る対象より高くつき、外部から無料でDB書き込みを強制できる形になる（Issue #50 の整理のまま）
- Challenge（ボット判定）の利用。未認証の入口に足すと、ウォレット拡張からの通信が通らない場合の切り分けが難しくなる

## 残ること

- ルールの作成は本番の公開切替作業の一部として行う。[ポータルアプリのガイド](../guide/portal-app.md)の公開切替手順に項目を足した
- Log での観測期間、Deny へ切り替える判断、実際の上限値の見直しはIssue #50 で記録する
- リージョンごとのカウンターのため、全体で厳密な上限にはならない。厳密さが必要になったら、そのときに別の層を検討する

参考: [WAF Rate Limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)、[Rate Limiting SDK](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk)、[認証後のレート制限の決定](./2026-08-10-rate-limit-authenticated-actions.md)、[SIWE nonceの単回性](./2026-08-24-siwe-nonce-single-use.md)。
