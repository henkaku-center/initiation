// ABOUTME: Initiationの入口に、コミュニティの現在地を集計だけで見せる(Issue #132)。
// ABOUTME: 動いた記録(チェックイン)と入口の表明(関心タグ)を別の見出しで並べる。個人は出さない。
import type { CommunityField } from "@/lib/domain/communityField";

/** 組み合わせは多い順に上位だけ出す。入口のカードを問いより長くしないため。 */
const MAX_COMBINATIONS = 3;

export function CommunityFieldPanel({ field }: { field: CommunityField }) {
  const { checkins, interests } = field;
  return (
    <section className="pd-field" aria-label="コミュニティの現在地">
      <p className="pd-field-label">
        <span>COMMUNITY FIELD</span>
        <span>集計のみ。名前や回答は表示しません</span>
      </p>
      <div className="pd-field-block">
        <h3>この{checkins.days}日間の動き</h3>
        <dl className="pd-field-numbers">
          <div>
            <dt>チェックイン</dt>
            <dd>
              <b>{checkins.count}</b>件
            </dd>
          </div>
          <div>
            <dt>チェックインした人</dt>
            <dd>
              <b>{checkins.members}</b>人
            </dd>
          </div>
        </dl>
      </div>
      <div className="pd-field-block">
        <h3>入口で選ばれたもの</h3>
        {interests.tags.length === 0 ? (
          <p className="pd-field-empty">まだ選ばれていません。</p>
        ) : (
          <>
            <ul className="pd-field-tags">
              {interests.tags.map(({ tag, count }) => (
                <li key={tag}>
                  {tag} <b>{count}</b>
                </li>
              ))}
            </ul>
            {interests.combinations.length > 0 && (
              <ul className="pd-field-combinations">
                {interests.combinations.slice(0, MAX_COMBINATIONS).map(({ tags, count }) => (
                  <li key={tags.join("-")}>
                    {tags.join(" × ")} が{count}件
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
