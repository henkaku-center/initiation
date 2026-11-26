// ABOUTME: Community Fieldに出す集計の形と、関心タグの数え方を定義する(Issue #132)。
// ABOUTME: 返すのは件数だけ。メンバーID・呼び名・ウォレットアドレス・回答本文はこの型に含めない。
import { interestOptions, readJourneyAnswer } from "@/lib/initiation/journey";

const INTERESTS_STEP_ID = "v2-interests";
const DAY_MS = 24 * 60 * 60 * 1000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** チェックインを数える日数。今日を含む。 */
export const FIELD_WINDOW_DAYS = 7;

export type InterestSummary = {
  /** 関心タグを1つ以上選んだ人の数。スキップした人は含めない。 */
  respondents: number;
  tags: { tag: string; count: number }[];
  /** 同じ人が一緒に選んだ2つのタグの件数。 */
  combinations: { tags: [string, string]; count: number }[];
};

export type CommunityField = {
  checkins: { days: number; count: number; members: number };
  interests: InterestSummary;
};

/**
 * 集計期間の最初の日(JST)。`checkins.checkin_date` が Asia/Tokyo の日付で決まるのに揃える。
 */
export function fieldWindowStart(now: Date): string {
  const start = new Date(now.getTime() + JST_OFFSET_MS - (FIELD_WINDOW_DAYS - 1) * DAY_MS);
  return start.toISOString().slice(0, 10);
}

/**
 * 保存された「気になること」の回答から、タグ別と、2つのタグの組み合わせ別の件数を出す。
 * 閾値は置かず1件から数える(Issue #132「決まったこと」1)。申請や承認の有無では絞らない。
 * 現在の選択肢として読めない回答は数えない。並びは件数の多い順、同数なら選択肢の順。
 */
export function summarizeInterests(answers: readonly (string | null)[]): InterestSummary {
  const order = new Map<string, number>(interestOptions.map((tag, index) => [tag, index]));
  const tagCounts = new Map<string, number>();
  const pairCounts = new Map<string, number>();
  let respondents = 0;

  for (const stored of answers) {
    const answer = readJourneyAnswer(INTERESTS_STEP_ID, stored);
    if (answer?.status !== "answered" || !Array.isArray(answer.value)) continue;
    respondents += 1;
    const tags = [...answer.value].sort((a, b) => order.get(a)! - order.get(b)!);
    tags.forEach((tag, index) => {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      for (const other of tags.slice(index + 1)) {
        const key = `${tag}\n${other}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    });
  }

  const tags = [...tagCounts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || order.get(a.tag)! - order.get(b.tag)!);
  const combinations = [...pairCounts]
    .map(([key, count]) => ({ tags: key.split("\n") as [string, string], count }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        order.get(a.tags[0])! - order.get(b.tags[0])! ||
        order.get(a.tags[1])! - order.get(b.tags[1])!,
    );
  return { respondents, tags, combinations };
}
