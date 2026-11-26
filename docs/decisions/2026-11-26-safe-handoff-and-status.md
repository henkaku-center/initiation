# 2026-11-26 Safeへの受け渡しと実行状況の取得を連携し、完了は照合後に管理者が確定する(Issue #137)

[2026-09-15の決定](2026-09-15-manual-flow-inputs.md)は、MVP-1ではSafe Transaction Service連携を実装しないとしていた。Issue #137 の[2026-10-04の合意](https://github.com/henkaku-center/initiation/issues/137#issuecomment-5980700603)でこの部分を見直す。ここには合意した仕様と、実装前に確認した事実、実装設計を記録する。

2026-09-15の決定のうち、正式なSafe・コントラクト・配布数量・直列の順序は変えない。値の正本は引き続き[Runbookの運用入力](../runbook-manual-operations.md)である。

## 決定

- 目標は、手順を忘れていても、申請画面の案内に沿ってSafeでの処理と結果確認を完了できること。操作数の削減は必須の目標にしない
- 初期版は申請を1件ずつ処理する
- アプリが担うのは、送付先・数量などの受け渡しと、実行状況の取得・照合・表示まで。提案登録・承認・署名・実行はSafeで行う。アプリは秘密鍵・署名権限・リカバリ情報を持たない
- 受け渡しは、工程ごとのSafeへのリンクと、入力値の表示・コピーボタンで行う
- Safeで提案を作成した後、管理者が取引詳細URLを申請へ貼り付けて紐付ける
- 状況はSafe Transaction Serviceから取得し、実行結果はPolygon上でも検証する
- 照合できた場合だけ、管理者が「追加済みにして次へ」「配布済みにする」で完了を確定する。照合できない結果を、ボタン操作だけで完了にしない
- 取得できないことを実行失敗として扱わない。既存の状態と記録を保持する

### 承認済み申請に表示する工程

| 工程 | 画面に置く案内・操作 |
| --- | --- |
| 1. Allowlistへ追加 | 「Allowlist用Safeを開く」、Transaction Builderでの操作手順、コントラクト・申請者アドレスのコピー |
| 2. 追加結果を確認 | 取引URLの紐付け、署名待ち・実行待ち・実行結果の表示。照合できたら「追加済みにして次へ」 |
| 3. HENKAKUを配布 | 「配布用Safeを開く」、送付手順、送付先・トークン・数量「10 HENKAKU」の表示とコピー |
| 4. 配布結果を確認 | 宛先・数量・実行結果の照合。照合できたら「配布済みにする」。続けて完了連絡の手順を案内する |

各工程に「どこを開くか」「何を入力するか」「何を確認するか」「終わったら何をするか」を表示する。現在の工程を強調し、完了した工程は結果と履歴を確認できる形にする。提案済みなら「Safeで続きを開く」を表示し、作成手順を繰り返させない。工程3・4は、工程2の完了を確定するまで表示しない(Issue #112 のガードを維持する)。

### 状態ごとの案内

| 表示 | 次の操作 |
| --- | --- |
| 署名待ち | 「Safeで署名状況を確認する」 |
| 実行待ち | 「Safeで実行する」 |
| 実行結果の確定待ち | 「状況を再取得する」 |
| 成功・未反映 | 「追加済みにして次へ」／「配布済みにする」 |
| 実行に失敗 | 理由と、同じ提案を再実行するか、新しく作成するかの案内 |
| 取消・置換を確認中 | 「Safeで状況を確認する」 |
| 取得できない | 最後に確認できた状態・時刻と「再取得」 |

## 確認した事実(2026-11-26)

### Safe Transaction Service

- Polygonのエンドポイントは `https://api.safe.global/tx-service/pol/`。旧 `safe-transaction-polygon.safe.global` は308でリダイレクトされる
- `GET /api/v2/multisig-transactions/{safeTxHash}/` は、APIキーなしで200を返した。応答には `safe` / `to` / `value` / `data` / `operation` / `nonce` / `safeTxHash` / `transactionHash` / `blockNumber` / `isExecuted` / `isSuccessful` / `confirmationsRequired` / `confirmations` が含まれる
- 正式なAllowlist用Safeの直近の取引は、`to` がHENKAKUトークン、`data` が `addWhitelistUser(address)` の呼び出し(セレクタ `0x84083c89`)、`operation` が0、`confirmationsRequired` が2だった。Runbookの参考トランザクション `0x8b70…1fe9` と `transactionHash` が一致する
- キーなしの応答ヘッダーは `X-RateLimit-Limit: 5000`、`X-RateLimit-Reset: 2592000`(30日)だった
- [Safeの文書](https://docs.safe.global/core-api/how-to-use-api-keys)は、キーなしのアクセスを「exploration only」とし、本番利用には認証を求めている。[2026-02-24の告知](https://safe.global/blog/introducing-authenticated-api-access-and-usage-based-plans)では、キーなしは毎秒2リクエストまで
- キーは `Authorization: Bearer <key>` で送る。入門のBuilderプランは毎秒5リクエスト、30日あたり50,000リクエスト([Quotas & Limits](https://docs.safe.global/core-api/api-authentication))。上限はキー単位ではなくアカウント単位で、拒否されたリクエストも数に入る。キーが無効なら401、上限超過なら429
- 読み取り専用・サーバー側からの利用を制限する記述は、上記2ページにはなかった。利用規約の全文は未確認

### Polygonの確定確認

- [Polygonの文書](https://docs.polygon.technology/pos/concepts/finality/finality)は、`eth_getBlockByNumber` に `finalized` を渡して最新の確定済みブロックを取り、取引のブロック番号と比べる方法を示している。確定までの目安は2〜5秒
- `polygon.drpc.org`(viemの既定)と `polygon-bor-rpc.publicnode.com` の両方で `finalized` が応答した。確定済みブロックは最新から3ブロック前だった

### 未確認のこと

- 取引詳細URLの `id` の実際の形。[Safe Walletのリンク生成](https://github.com/safe-global/safe-wallet-monorepo/blob/dev/apps/web/src/utils/tx-link.ts)から、パスが `/transactions/tx`、クエリが `safe=<チェーンの短縮名>:<Safeアドレス>` と `id=<取引ID>` であることは確認した。`id` に `safeTxHash` がどう入るかは、実物のURLで確認してから解析処理を書く
- 配布用Safeで「Send tokens」から作ったHENKAKU送付の `data` と `operation`。今回確認できた配布用Safeの直近の取引はHENKAKUの送付ではなかった。Runbookの参考トランザクション `0x7be6…1eaf7` で確認する
- 署名待ち・実行待ち・失敗・取消・置換の各状態で、サービスが実際に返す値。テスト用のSafeで確認する

## 実装設計

### 取得元と呼び出す場所

- Safe Transaction ServiceとPolygonの読み取りは、どちらもサーバー側(Server Action)から行う。管理者のブラウザから直接呼ばない。照合結果を保存と完了確定の根拠にするため、クライアントが組み立てた結果を信用しない
- APIキーは `SAFE_API_KEY`(サーバー専用、任意)で渡す。未設定ならキーなしで呼ぶ。ローカルと検証はキーなしで足りる。本番はBuilderプランのキーを設定する
- 取得は、申請の工程を開いたときと「再取得」のときだけ行う。申請一覧では保存済みの最後の状態と取得時刻を表示し、一覧の表示で外部を呼ばない。「再取得」は既存のレート制限(管理者アドレス単位)の対象にする
- サーバー側のRPCは `POLYGON_RPC_URL`(サーバー専用、任意)を使い、未設定なら `NEXT_PUBLIC_POLYGON_RPC_URL`、それも未設定ならviemの既定RPCを使う
- Safeのアドレス・コントラクト・数量は、Runbookの運用入力と同じ値を設定として1か所に持つ。受け渡しの表示と照合の両方がそこを読む

### 取引の紐付け

取引詳細URLから、ネットワーク・Safeアドレス・`safeTxHash` を取り出す。次のいずれかに当たる場合は保存しない。

- ネットワークがPolygonではない、またはSafeがその工程の正式なSafeではない
- サービスの応答の `safe` がURLのSafeと一致しない
- 操作内容が申請と一致しない(下記の照合条件のうち、実行前に判定できる項目)
- 同じ `safeTxHash` が、すでに別の申請または別の工程に紐付いている

### 完了を反映できる条件

「追加済みにして次へ」「配布済みにする」を有効にするのは、次をすべて満たしたときだけとする。完了を確定するServer Actionは、押された時点で同じ条件を取り直して再検証する。

| 対象 | 条件 |
| --- | --- |
| 共通 | `safe` が正式なSafe、`to` がHENKAKUトークン、`value` が0、`operation` が0(delegatecallではない) |
| 共通 | `isExecuted` と `isSuccessful` がともに真 |
| 共通 | Polygonのレシートが成功で、同じ `safeTxHash` の `ExecutionSuccess` イベントを正式なSafeが出している |
| 共通 | 実行ブロックの番号が `finalized` のブロック番号以下 |
| Allowlist | `data` が、申請者アドレスを引数とする `addWhitelistUser(address)` の呼び出しと全バイト一致する |
| Allowlist | `isAllowed(申請者)` が真(Issue #91 と同じ読み方) |
| 配布 | `data` が、申請者アドレスと `10 * 10^18` を引数とする `transfer(address,uint256)` の呼び出しと全バイト一致する |
| 配布 | レシートに、HENKAKUトークンが出した `Transfer`(送付元が配布用Safe、宛先が申請者、数量が `10 * 10^18`)がある |

操作内容は、サービスが解釈した `dataDecoded` ではなく `data` を自前で組み立てた値と比べる。外側のトランザクションが成功していても、Safe内部の処理が失敗している場合がある([Safeの説明](https://help.safe.global/articles/7835581861-my-safe-transaction-failed-but-etherscan-reports-success-why-is-that))ため、レシートの成功だけで判断せず `ExecutionSuccess` を見る。

MultiSendによる複数件のまとめ送付は `operation` が1になるため、初期版では照合に通らない。1件ずつ処理する方針と合わせ、まとめ送付には対応しない。

### 取消・置換の判定

- 未実行の取引の `nonce` より、Safeの現在の `nonce` が大きい場合、同じ `nonce` で別の取引が実行されている。このときに取消・置換が確定したと判定する
- サービスが404を返す、またはSafeのキューから取引が消えただけの場合は、取消の確定とは判定しない。「取消・置換を確認中」または「取得できない」と表示する
- 取消・置換が確定するまで、同じ工程の新しい提案の作成を案内しない
- 置換先の取引は、別の取引として紐付け直し、同じ条件で照合する

### 保存構造

テーブル `application_safe_transactions` を追加する。既存のテーブルと `transition_application` 関数は変更しない。

| 列 | 内容 |
| --- | --- |
| `id` | 主キー |
| `application_id` | 申請 |
| `step` | `allowlist` / `distribution` |
| `safe_address` | 紐付けた時点の正式なSafe |
| `safe_tx_hash` | Safeの提案ID。テーブル全体で一意 |
| `safe_nonce` | Safeのnonce |
| `tx_hash` | 実行後のオンチェーンtx hash。未実行の間は空 |
| `observed_status` | 最後に取得できた状態 |
| `observed_at` | 最後に取得できた時刻 |
| `linked_by` | 紐付けた管理者のアドレス |
| `created_at` | 紐付けた時刻 |

- `safe_tx_hash` と `tx_hash` は別の列に持つ。提案IDは実行前から存在し、tx hashは実行後に決まる
- 再試行と置換は行を追加する。元の行を上書き・削除しない。工程の現在の取引は、その工程で最後に紐付けた行とする
- 取得に失敗したときは `observed_status` と `observed_at` を書き換えない
- 完了の確定は、これまでどおり `transition_application` に `tx_hash` を渡して行う。`applications.distribution_tx_id` と `application_events.tx_id` の意味は変わらない。同じ工程を2回完了にする操作は、既存の `expected_status` の条件で0行になり、記録は重複しない
- RLSを有効にし、`service_role` にだけ権限を与える。アクセスはRepository経由とする

### 既存の記録

- 連携前に完了した申請、手入力したtx hash、途中まで完了した申請は、そのまま保持する。紐付けの行がないことを理由に、未完了へ戻したり再実行を促したりしない
- 手入力済みのtx hashは、Polygonのレシートから `ExecutionSuccess` と `Transfer` を読むことで照合に使える。Safe Transaction Serviceには `transactionHash` から提案を引く経路もあるため、どちらを使うかは実装時に決める

### 復旧

- migrationはテーブルの追加だけにする。アプリを前のデプロイへ戻しても、前の版はこのテーブルを読まないため動作する。紐付けの行は残り、再デプロイ後に続きから使える
- 紐付けの行は、それだけでは申請の状態を変えない。誤って紐付けた場合は、正しい取引を紐付け直す
- Safe Transaction ServiceまたはRPCが応答しない間は、完了を確定できない。この間の扱いは下記の未決事項に含める

### 実装の分け方

1. Safeへのリンクと入力値のコピー、工程ごとの案内(保存構造の変更なし)
2. 取引URLの紐付けと状況の取得・表示(migration、Repository、取得と照合のドメインロジック)
3. 照合後の完了確定、取消・置換・失敗・取得不能の案内
4. 手入力済みtx hashの照合と、テスト用の資産・環境での実務者による一巡

## 残っていること

- **手入力での完了確定を残すか。** 合意は「照合できない結果を管理者の操作だけで完了にしない」である。一方、連携後に手入力の経路を閉じると、Safe Transaction Serviceの障害中は完了を確定できなくなる。案: 実務者の一巡(Issue #48)が済むまでは手入力の経路を残し、一巡の結果を見て閉じるかどうかを決める
- **本番のAPIキーを誰のアカウントで発行するか。** 上限はアカウント単位で、キーはVercelの環境変数に置く。運営の判断が必要
- 承認人数・役割分担・完了連絡の運用。Issue #48 の決定に合わせ、工程4の後の案内に反映する
- 上記「未確認のこと」の3点
- プライバシーポリシーとの関係。保存するのは公開されているSafeの提案IDとtx hashで、閲覧できるのは `/admin` の管理者だけである。申請者に見せる範囲を `/passport` で広げる場合は、ポリシーの記載を確認する
