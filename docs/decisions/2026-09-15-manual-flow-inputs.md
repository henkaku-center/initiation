# 2026-09-15 手動運用フローの正式な実行元と配布数量(Issue #48)

- 課題: `docs/runbook-manual-operations.md` は Allowlist 追加と HENKAKU 配布の手順を持っていたが、実コントラクトの関数名、実行元の Safe、配布数量が「確定した時点で追記」のままだった。フェーズ1の完了条件「手動運用フローを文書化する」には具体値が必要だった。
- 決定: Issue #48 で運営が確認した次の値を Runbook の「運用入力」節に記載し、手順3・4をこの値に沿った具体的な操作と確認項目に書き換える。
  - ネットワーク: Polygon(chain ID 137)
  - HENKAKU トークンコントラクト: `0x0cc91a5FFC2E9370eC565Ab42ECE33bbC08C11a2`
  - Allowlist 追加: Safe `0x3F1D35bF5f182D7b4ef95a3f298f059BC33d2020`(コントラクトの `gateKeeper`)から `addWhitelistUser(address)` を呼ぶ
  - HENKAKU 配布: Safe `0x1C9D58eBd2A9F4952C2A4a8f9906FeF133056a33` から申請者1名あたり 10 HENKAKU(18 decimals)を送付する
  - Allowlist 追加と配布は直列にし、配布は `/admin` で Allowlist が `added` になってから行う
- 理由: 2つの Safe が現在も正式な実行元であることを運営が確認した(Issue #48、2026-08-18)。Allowlist の実体はトークンコントラクト内の `whitelist` で、`addWhitelistUser` は `onlyAdmin`(owner / gateKeeper / dev)のみ実行できることを [henkaku-v2 `HenkakuToken.sol`](https://github.com/henkaku-center/henkaku-v2/blob/main/contracts/HenkakuToken.sol) で確認した。未登録アドレスへの転送はコントラクトが拒否するため、順序を守らないと配布が失敗する。
- MVP-1 で実装しないこと(Issue #48 で決定済み): Safe Transaction Service 連携、アプリからの Safe トランザクション提案、専用のタスクキュー、自動通知。件数や転記ミス、滞留が増えた場合に再検討する。
- 残っていること: 実務者によるコピー＆ペーストでの一巡確認(Issue #48 の完了条件3)、各工程の担当者・確認人数・滞留時の連絡手段(Runbook「暫定の判断基準」はコミュニティ決定待ち)、`/admin` で配布操作を Allowlist 追加済みまで出さない誤操作防止(別 Issue)。
