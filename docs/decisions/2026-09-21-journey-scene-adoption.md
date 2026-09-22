# 2026-09-21 Initiationの5場面を採用し、A案から2点を残す

Issue #46 のレビューで、現行の5場面・6つの入力・完走条件を採用として確定した。実装は[質問の切替決定](./2026-09-12-journey-questionnaire.md)で既に入っているため、この決定で動作は変わらない。ここに残すのは、**どの案を採ったのか**と、**採らなかった案から何を残したのか**である。

## 採ったもの

geekneesさんの「入口や体験中のインパクトにはゲーム形式の案を生かし、質問の設計や参加後のコミュニティの見せ方には8画面の案を生かす」という組み合わせを採る。FLOTANCさんが2026-08-27に形にした5場面の案が、そのまま現在のアプリに入っている。

| 5場面の案 | 実装 |
| --- | --- |
| 01 ARRIVAL まだ何なのか分からない世界 | `journeyScenes[0]` |
| 02 SIGNALS 呼び名（空欄のままでも進める） | `journeyScenes[1]` ＋ `members.display_name`（任意・完走条件外） |
| 03 COMMUNITY 気になること（9つから複数選択） | `journeyScenes[2]` ＋ `v2-interests` |
| 04 YOUR MOVE いま気になっていること | `journeyScenes[3]` ＋ `v2-curiosity` |
| 05 HENKAKU 3問（巻き込んだ経験／活動の準備／持ち込むもの） | `journeyScenes[4]` ＋ `v2-experience` / `v2-readiness` / `v2-contribution` |
| 完走後の4枚のカード | `/passport` の 01 PARTICIPANT / 02 ALLOWLIST / 03 HENKAKU / 04 MEMBERSHIP |

場面は `lib/portal/journeyScenes.ts`、問いと選択肢は `lib/initiation/journey.ts` が持つ。

完走の条件は、5件がすべて回答または明示的なスキップとして保存されていることとする（`lib/initiation/complete.ts`）。呼び名は任意で完走条件に含めない。Discord名は申請の条件であって完走の条件ではない（Issue #117）。

## A案から残したもの

0xsalomeさんの[A案 NIGHT PASSAGE](https://claude.ai/public/artifacts/d7e7e7e1-4f83-4349-9234-72ba54d52f04)は、全体としては採らない。ただし「答えずに進む道を、選択肢の中に用意する」という考え方は採り、次の2つとして現在のコードに入っている。

- **「まだ言葉にしない」** — 5問すべてに出るスキップ（`components/portal/PortalJourney.tsx`）。`{ "status": "skipped" }` として保存し、未回答と区別する。A案の「まだ ことばに しない」から借りた
- **「今は静かに見たい」** — 活動の準備を聞く問いの3つ目の選択肢（`lib/initiation/journey.ts` の `readinessOptions`）。A案が「まだ きめていない」「こたえずに すすむ」を選択肢として持っていた考え方を、この問いに移した

A案の称号と配色の分岐、ひらがなの文体、4ステージの構成は採らない。場面と問いの設計を8画面の案から採ったため、世界観を二重に持たせないという理由による。

## C案はInitiationに入れない

cinnamonさんの[C案 THE LAST KEY](https://claude.ai/public/artifacts/28e1990c-039b-42bc-8fa4-94a2ea0b2b80)（ウォレットのセキュリティ訓練）は、Initiationの流れには入れない。C案が教えるのはウォレットの守り方で、Initiationで聞いているのはその人の関心であり、聞いていることが違うため、同じ流れに混ぜると長くなる。

採らないのではなく、**Initiationの外で使う。** ウォレットを準備する `/setup` の近くに置く方向で、別Issueとして検討する。C案は回答を送信しない設計なので、回答の保存やプライバシーの判断を伴わない。

## この決定に含めないもの

- COMMUNITY FIELD（既存メンバーの活動を見せる画面）。5場面の案のうち、唯一実装に入っていない部分であり、範囲と表示の形は別に決める
- 「記録するが完走に数えない」ステップ（Issue #120）
- 回答やSignalを他のメンバーへ見せる範囲（Issue #36）
- 見た目と世界観（Issue #13 / #52）
