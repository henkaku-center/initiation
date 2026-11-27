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
| 取消・置換を確認中 | 「Safeで状況を確認する」「状況を再取得する」。新しい提案の作成は案内しない |
| 取消・置換済み | 置換先の実行結果を照合する。照合できなければ「確認待ち」とし、新しい提案の作成は案内しない |
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

### 取引詳細URLと実際の取引の形

- 取引詳細URLは `https://app.safe.global/transactions/tx?safe=matic:<Safeアドレス>&id=multisig_<Safeアドレス>_<safeTxHash>`。`id` の形は [Safe Walletのソース](https://github.com/safe-global/safe-wallet-monorepo/blob/dev/apps/web/src/utils/transactions.ts)(`getSafeTxHashFromTxId`)で確認した
- 配布用SafeからのHENKAKU送付は、`to` がHENKAKUトークン、`data` が `transfer(address,uint256)` の呼び出し(セレクタ `0xa9059cbb`)、`operation` が0だった。Runbookの参考トランザクション `0x7be6…1eaf7` で確認した
- **1つのオンチェーントランザクションで、複数のSafe取引が実行されることがある。** 上の参考トランザクションは、6件のSafe取引(nonce 1982〜1987)をまとめて実行したもので、レシートの `to` はSafeではなく、同じ宛先への `Transfer` が6件並ぶ。tx hashと `safeTxHash` は1対1に対応しない
- 正式な2つのSafeは、どちらもバージョン 1.3.0+L2。`ExecutionSuccess` の提案IDはindexedではなく、イベントのdataの先頭に入る
- 未実行のまま残っている取引が、Allowlist用Safeに13件、配布用Safeに75件ある。いずれも `nonce` がSafeの現在の `nonce` より小さい
- `GET /api/v2/safes/{Safe}/multisig-transactions/?nonce={nonce}&executed=true` は、そのnonceで実行された取引を返す(2026-11-27に確認)。Allowlist用Safeの未実行の取引3件(nonce 282・284・287)について、それぞれ別の `safeTxHash` の実行済み取引が1件ずつ返った。3件とも、`polygon.drpc.org` が返したレシートに、Allowlist用Safeが出したその `safeTxHash` の `ExecutionSuccess` があった。`executed` を付けなければ、同じnonceの未実行の取引も並ぶ
- 存在しない `safeTxHash` を引くと、サービスは404を返す
- `polygon-bor-rpc.publicnode.com` は、参考トランザクションのレシートを返さなかった(アーカイブへの問い合わせには個別のトークンが要る)。`polygon.drpc.org` は返した

### 未確認のこと

- Safe内部の処理が失敗した取引で、サービスとレシートが実際に返す値。配布用Safeの直近200件の実行済み取引に、`isSuccessful` が `false` のものはなかった。テスト用のSafeで確認する
- 署名待ち・実行待ちの取引でサービスが返す値のうち、現在のキューにあるもの。今回確認できた未実行の取引は、すべて置換済みだった

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
| 共通 | Polygonのレシートが成功で、同じ `safeTxHash` の `ExecutionSuccess` イベントを正式なSafeが出している。レシートの `to` がSafeであることは条件にしない(まとめて実行された場合、`to` は別のコントラクトになる) |
| 共通 | 実行ブロックの番号が `finalized` のブロック番号以下 |
| Allowlist | `data` が、申請者アドレスを引数とする `addWhitelistUser(address)` の呼び出しと全バイト一致する |
| Allowlist | `isAllowed(申請者)` が真(Issue #91 と同じ読み方) |
| 配布 | `data` が、申請者アドレスと `10 * 10^18` を引数とする `transfer(address,uint256)` の呼び出しと全バイト一致する |
| 配布 | レシートに、HENKAKUトークンが出した `Transfer`(送付元が配布用Safe、宛先が申請者、数量が `10 * 10^18`)がある。数えるのは、その提案の `ExecutionSuccess` と、直前のSafe取引の実行結果の間にあるログだけとする |

操作内容は、サービスが解釈した `dataDecoded` ではなく `data` を自前で組み立てた値と比べる。外側のトランザクションが成功していても、Safe内部の処理が失敗している場合がある([Safeの説明](https://help.safe.global/articles/7835581861-my-safe-transaction-failed-but-etherscan-reports-success-why-is-that))ため、レシートの成功だけで判断せず `ExecutionSuccess` を見る。

同じトランザクションでまとめて実行された別のSafe取引の `Transfer` を、この申請の配布として数えない。上の条件でログの範囲を限るのはこのためである。

1つのSafe取引の中で複数の送付をまとめるMultiSendは `operation` が1になるため、初期版では照合に通らない。1件ずつ処理する方針と合わせ、対応しない。提案を1件ずつ作り、実行だけをまとめた場合は照合できる。

### 取消・置換の判定

- 未実行の取引の `nonce` より、Safeの現在の `nonce` が大きいことだけでは、取消・置換が確定したと判定しない。元の提案自体が実行されてnonceが進み、その実行結果がサービスの応答にまだ反映されていないだけの場合がある。ここで置換済みとして新しい提案を案内すると、同じ追加・配布を二重に実行させてしまう
- 取消・置換が確定したと判定するのは、次をすべて満たしたときだけとする
  - 紐付けた取引が未実行で、その `nonce` よりSafeの現在の `nonce` が大きい
  - 同じSafe・同じ `nonce` で、**別の `safeTxHash`** の取引が実行済みになっている(`isExecuted` が真で、`transactionHash` と `blockNumber` がある)
  - その `transactionHash` のレシートが成功で、ブロック番号がサービスの応答と一致し、置換先の `safeTxHash` について正式なSafeが実行結果のイベント(`ExecutionSuccess` または `ExecutionFailure`)を出している。サービスの報告だけでは置換先の実行を信用しない。置換先がSafe内部で失敗していても、nonceは消費されているため置換とみなす
  - その実行ブロックの番号が `finalized` のブロック番号以下
  - 同じ `nonce` の実行済み取引に、紐付けた取引と同じ `safeTxHash` のものがない(あれば元の提案が実行されており、再取得して通常の照合へ進む)
- 上を満たさない間は「取消・置換を確認中」と表示する。同じ `nonce` の実行済み取引やそのレシートを取得できない、まだ返ってこない、確定していない場合を含む
- サービスが404を返す、またはSafeのキューから取引が消えただけの場合も、取消の確定とは判定しない。「取消・置換を確認中」または「取得できない」と表示する
- 「取消・置換済み」はSafeの提案の状態であり、申請の工程が未実施であることを意味しない。初期版では、取消・置換を理由に同じ工程の新しい提案の作成を案内しない
- アプリは置換先の取引を、同じ申請・工程の完了条件で照合する。条件を満たせば、その取引を完了確認の根拠として紐付け直せるようにする。完了の確定は従来どおり、照合結果を再検証したうえで管理者が行う
- 置換先を取得・照合できない場合は「確認待ち」とし、工程の状態を変えない。配布自体の中止はSafeの提案の取消と同一視せず、取消・置換を理由に配布を再開しない

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
| `tx_hash` | 実行後のオンチェーンtx hash。未実行の間は空。複数のSafe取引が同じ値を持ちうるため、一意制約は置かない |
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
- 上記「未確認のこと」の2点
- 手入力済みの古いtx hashを照合に使う場合のRPC。古いレシートを返さないRPCがある
- プライバシーポリシーとの関係。保存するのは公開されているSafeの提案IDとtx hashで、閲覧できるのは `/admin` の管理者だけである。申請者に見せる範囲を `/passport` で広げる場合は、ポリシーの記載を確認する
