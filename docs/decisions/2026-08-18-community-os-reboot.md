<!-- ABOUTME: Records the decision to position Initiation as a Community Gateway / Community OS Reboot project. -->
<!-- ABOUTME: Separates the long-term product direction from the scope of each delivery phase. -->

# 2026-08-18 Community Gateway / Community OSとしてRebootする（Issue #14）

## 背景

このプロジェクトは、Deworkへの依存をやめ、Initiationを自前で提供する必要から始まった。その後、[Issue #14](https://github.com/henkaku-center/initiation/issues/14)で、単なるDework置き換えに留めるか、henkakuの入口や活動基盤まで含めて捉えるかを議論した。

定例ミーティングとDiscordでの議論を重ね、プロジェクトの位置づけについてラフコンセンサスが取れたと判断したため、結論を記録する。

## 決定

このプロジェクトを、単なるDework置き換えではなく、Community Gateway / Community OSを目指す**Rebootプロジェクト**として進める。

目指す範囲には、次の観点を含む。

- henkakuを外部から知り、新しいメンバーが参加するための入口
- メンバーの活動場所と、活動が見える仕組み
- 議論や知識を蓄積し、必要な人が参照できる基盤
- 少人数でもコミュニティを運営できる管理機能

Deworkへの依存解消は引き続き必須だが、それをプロジェクトの到達点にはしない。

現在開発しているInitiationは、この方向へ進む最初の縦切りとする。この決定は、すべての機能を一度に実装することや、現在のフェーズを直ちに拡張することを意味しない。各フェーズのスコープと優先順位は、利用状況と検証結果を見ながら決める。

## 理由

- Deworkの既存機能だけを置き換えると、従来ツールの境界をそのまま引き継ぐ可能性がある。
- 入口、活動、知識、運営を一つの方向で捉えることで、個別機能を一貫したコミュニティ体験につなげられる。
- 長期的な方向と直近の実装範囲を分けることで、構想を残しながら段階的に検証できる。

## 影響

- 新しいIssueや計画は、Community Gateway / Community OSの方向にどう寄与するかも判断材料にする。
- `docs/development-plan.md` は引き続き各フェーズの実装範囲と完了条件の基準とする。フェーズを変更するときは、同ファイルを別途更新する。
- 公開範囲、機能の優先順位、Dework停止時期などの実行判断は、個別のIssueまたは決定ログで扱う。
- この決定ログがmainへマージされた時点で、方向性を議論したIssue #14はcloseできる。
