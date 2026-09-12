# 2026-09-13 ウォレット状態表示の判定元と表示方針(Issue #91)【決定案】

> 状態: **決定案**。Issue #91 での合意後に「決定案」の表記を外し、実装Issueへ分ける。

- 課題: `/setup` の「YOUR CURRENT STATUS」と `/passport` の「WALLET STATUS」は、PR #105 以降も HENKAKU 保有と Allowlist 登録を「準備中」と表示している。Issue #91 が求める「接続中のアドレスの状態を、別画面や外部ツールを探さずに把握できる」体験には、判定元・表示場所・取得失敗時の扱いの決定が必要だった。

## 前提として確認した事実(2026-09-13、Polygon mainnet)

- HENKAKU トークン(`0x0cc91a5FFC2E9370eC565Ab42ECE33bbC08C11a2`)の実体は [henkaku-center/henkaku-v2 の `HenkakuToken.sol`](https://github.com/henkaku-center/henkaku-v2/blob/main/contracts/HenkakuToken.sol)。Allowlist は同じコントラクト内の `mapping(address => bool) private whitelist` で、`_beforeTokenTransfer` が送信者・受信者の両方に登録を要求する。つまり **Allowlist の正本はこのコントラクトのストレージ**であり、別の Allowlist コントラクトは存在しない。
- `unlock` フラグ(storage slot 10)は `false`。Allowlist による転送制限は現在も有効。
- 読み取り関数 `isAllowed(address)` は `onlyOwner` の view 関数で、通常の `eth_call` は `Ownable: caller is not the owner` で revert する。ただし `eth_call` は署名を伴わないため、`from` に `owner()`(`0x5983c3bd118d29606466213d81ea478501b31b1e`)を指定すれば誰でも読める。
- 代替経路として、`whitelist` の storage slot(slot 7、`keccak256(abi.encode(address, 7))`)を `eth_getStorageAt` で直接読める。
- 上記2経路を保有上位5アドレス(すべて `true`)と、owner・`0x…dEaD`・gateKeeper(すべて `false`)で突き合わせ、公開RPC2系統(`polygon.drpc.org` / `polygon-bor-rpc.publicnode.com`)で一致を確認した。
- `dev`(定期更新用EOA)は zero address。`gateKeeper`(multisig)は `0x3F1D35bF5f182D7b4ef95a3f298f059BC33d2020` で、Allowlist 未登録・残高0。
- viem の polygon チェーン既定RPCは `https://polygon.drpc.org`(`node_modules/viem` で確認)。`https://polygon-rpc.com` は「API key disabled」で応答せず、`rpc.ankr.com` はAPIキー必須。`lib/wagmi.ts` の `http()` は既定RPCを使うため、現状のままでも `eth_call` は通るが、無料枠の制限(例: `eth_getLogs` は10,000ブロックまで)がある。

## 決定案

### 1. 表示場所

`/setup` の「YOUR CURRENT STATUS」と `/passport` の「WALLET STATUS」の両方(既存の `PortalWalletStatus`)に、**オンチェーンの読み取り結果**を表示する。`/passport` の申請記録(`allowlistStatus` / `distributionStatus`)はそのまま残し、オンチェーン欄と並べて見せる。新しい画面や共通ステータス領域は作らない。

理由: 表示枠は PR #105 で既に用意されており、Issue #91 の「接続後にまとめて確認」は `/setup` で、「申請記録との関係」は `/passport` で満たせる。

### 2. HENKAKU 保有の判定

- `balanceOf(address) > 0` を「保有している」とする。
- 残高も表示する(`formatUnits` で18桁を整数に切り捨て、例「1,234 HENKAKU」)。0 と「読めていない」を見分けやすくするため、数値の横に判定語(保有している / 保有していない)を置く。

理由: 保有の有無だけを出すと、配布直後の確認(10 HENKAKU が届いたか)ができない。残高は公開情報で、追加コストなく同じ呼び出しで取れる。

### 3. Allowlist の判定元と読み方

- **正本はオンチェーン**(コントラクトの `whitelist`)。アプリ内の `applications.allowlist_status` は「運営が実行を記録したか」を表す業務記録であり、登録の証明ではない。
- 読み取りは `isAllowed(address)` を `from = owner()` で `eth_call` する。`owner()` は固定値にせず、同じバッチで読む(`useReadContracts` で `owner` → `isAllowed` の2段、または `owner` を長めにキャッシュ)。
- storage 直読み(slot 7)は、`isAllowed` が読めなくなった場合の代替として決定記録に残すが、初版では実装しない。

理由: 転送可否を決めているのはコントラクトのストレージだけで、アプリ記録が「追加済み」でも実際に未登録なら送付は失敗する。`from` 指定の `eth_call` は署名不要・読み取り専用で、秘密情報を扱わない。

### 4. オンチェーンと申請記録が食い違ったとき

2つの値を1つに統合せず、**別々の行として表示**する。組み合わせごとの補足文:

| オンチェーン | 申請記録 | 表示する補足 |
| --- | --- | --- |
| 追加済み | `pending` | 「運営の記録更新を待っています」 |
| 追加済み | `added` | 補足なし |
| 未追加 | `added` | 「オンチェーンで確認できません。運営に連絡してください」+ 記録済みの tx hash へのリンク |
| 未追加 | `pending` / 申請なし | 補足なし |
| 取得失敗 | 任意 | オンチェーン欄だけ「取得できませんでした」+ 再試行。申請記録は通常どおり |

理由: 監査ログ(`application_events`)が唯一の裏付けという既存方針(`2026-08-09-repeated-failure.md`)を崩さず、利用者には実態を隠さない。

### 5. 取得タイミングと失敗時の見せ方

- 取得は接続中のアドレスに対して行い、**サインインは要求しない**(公開情報のため)。未接続なら「ウォレットを接続すると表示します」。
- wagmi の `useReadContracts` を使い、クエリキーにアドレスを含める。アカウント切替時は新しいアドレスの取得中表示に切り替わり、前のアドレスの値を残さない。チェーン切替では再取得しない(読み取りは常に Polygon の transport で行うため。表示に「Polygon上の状態」と明記)。
- `staleTime` 30秒、ウィンドウフォーカスでの自動再取得は無効、手動の「再取得」ボタンを置く。配布直後の確認に使えれば十分で、公開RPCへの呼び出しを増やさない。
- 状態は **取得中 / 取得できませんでした / 保有していない・未追加 / 保有している・追加済み** の4つを別の表示にし、`—` や空欄を「未保有・未追加」の意味で使わない。
- RPC は任意の環境変数 `NEXT_PUBLIC_POLYGON_RPC_URL` で差し替え可能にし、未設定なら viem の既定を使う。`.env.example` に「未設定でも動く」と明記する。

### 6. プライバシー

ブラウザから RPC 事業者へ「接続中のウォレットアドレス」と「閲覧者のIPアドレス」が送られる。ウォレット拡張自身も同様の通信を行うため新しい種類の情報ではないが、`docs/privacy-policy.md` の「外部サービスと第三者提供」に、公開RPCへ問い合わせる事実と送信内容を一文追加する。

## 実装Issueへの分割案

1. `lib/domain/walletStatus.ts`: 読み取り結果と申請記録から表示状態(4状態 + 補足文)を返す純粋関数と、その単体テスト(DB・ネットワーク不要)
2. `lib/henkakuToken.ts` に ABI(`balanceOf` / `owner` / `isAllowed`)を追加し、`PortalWalletStatus` を `useReadContracts` で接続。wagmi をモックした単体テストで4状態と、アドレス切替時に前の値が残らないことを検証
3. `/passport` の申請記録との並列表示と補足文
4. `.env.example`・`docs/guide/portal-app.md` の「準備中の範囲」・`docs/privacy-policy.md` の更新

手動検証は、上記「前提として確認した事実」で使った保有上位アドレスと未登録アドレスを watch-only で接続するか、テスト用ウォレットで行う。本番RPCへの呼び出しはCIに含めない。

## 採らなかった案

- アプリ内の申請記録を Allowlist の正本にする: 実行を記録するだけで登録を保証しないため、利用者に誤った「追加済み」を見せうる。
- サーバー側(Route Handler)で RPC を代理する: 未認証エンドポイントが増え、#50 のレート制限の対象が広がる。読み取りは公開情報で、ブラウザから直接読んでも秘密情報を扱わない。
- Transfer イベントの集計で保有を判定する: 公開RPCの `eth_getLogs` 制限に当たり、`balanceOf` で足りる。
