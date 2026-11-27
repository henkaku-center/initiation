// ABOUTME: Initiationの入口に出すCommunity Fieldの表示を固定する(Issue #132)。
// ABOUTME: 動いた記録(チェックイン)と入口の表明(関心タグ)を別の見出しで出し、0件でも成立させる。
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CommunityFieldPanel } from "@/components/portal/CommunityFieldPanel";
import { PortalJourney } from "@/components/portal/PortalJourney";
import type { CommunityField } from "@/lib/domain/communityField";
import { journeySteps } from "@/lib/initiation/journey";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/initiation/actions", () => ({ saveStep: vi.fn() }));
vi.mock("@/app/members/actions", () => ({ saveDisplayName: vi.fn() }));

const field: CommunityField = {
  checkins: { days: 7, count: 12, members: 5 },
  interests: {
    respondents: 4,
    tags: [
      { tag: "AI", count: 3 },
      { tag: "EDUCATION", count: 3 },
      { tag: "MUSIC", count: 2 },
    ],
    combinations: [
      { tags: ["AI", "EDUCATION"], count: 3 },
      { tags: ["AI", "MUSIC"], count: 1 },
    ],
  },
};
const empty: CommunityField = { checkins: { days: 7, count: 0, members: 0 }, interests: { respondents: 0, tags: [], combinations: [] } };
const panel = (value: CommunityField) => renderToStaticMarkup(createElement(CommunityFieldPanel, { field: value }));

describe("CommunityFieldPanel", () => {
  it("shows check-ins as movement and interests as what was chosen at the entrance, under separate headings", () => {
    const html = panel(field);
    expect(html).toContain("この7日間の動き");
    expect(html).toContain("12");
    expect(html).toContain("5");
    expect(html).toContain("入口で選ばれたもの");
    expect(html).toContain("AI × EDUCATION");
    expect(html.indexOf("この7日間の動き")).toBeLessThan(html.indexOf("入口で選ばれたもの"));
  });

  it("does not describe interest tags as activity", () => {
    const html = panel(field);
    const interests = html.slice(html.indexOf("入口で選ばれたもの"));
    expect(interests).not.toContain("動いて");
  });

  it("says the numbers are totals and that nobody is shown individually", () => {
    expect(panel(field)).toContain("集計");
    expect(panel(field)).toContain("名前や回答は表示しません");
  });

  it("still stands when nobody is here yet", () => {
    const html = panel(empty);
    expect(html).toContain("この7日間の動き");
    expect(html).toContain("0");
    expect(html).toContain("まだ選ばれていません");
  });
});

describe("portal journey entrance", () => {
  const props = { steps: journeySteps, entries: [], displayName: null, complete: false };

  it("shows the field at the entrance, before the questions", () => {
    const html = renderToStaticMarkup(createElement(PortalJourney, { ...props, field }));
    expect(html).toContain("はじめまして、旅人。");
    expect(html).toContain("COMMUNITY FIELD");
    expect(html).toContain("AI × EDUCATION");
  });

  it("keeps the entrance as it was when the field is not available", () => {
    const html = renderToStaticMarkup(createElement(PortalJourney, props));
    expect(html).toContain("はじめまして、旅人。");
    expect(html).not.toContain("COMMUNITY FIELD");
  });

  it("does not show the field to someone who has not signed in", () => {
    const html = renderToStaticMarkup(createElement(PortalJourney, { ...props, signedIn: false, field }));
    expect(html).not.toContain("COMMUNITY FIELD");
  });

  it("does not carry the field into the questions", () => {
    const entries = [{ stepId: "v2-interests", answer: '{"status":"skipped"}', completedAt: "2026-09-12T00:00:00Z" }];
    const html = renderToStaticMarkup(createElement(PortalJourney, { ...props, entries, field }));
    expect(html).not.toContain("COMMUNITY FIELD");
  });
});
