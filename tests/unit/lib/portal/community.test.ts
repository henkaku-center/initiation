// ABOUTME: Community displays only the authenticated member's persisted check-ins.
// ABOUTME: Shared activity previews remain clearly labelled samples without member state.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PortalCommunity } from "@/components/portal/PortalCommunity";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/checkin/actions", () => ({ checkin: vi.fn() }));

describe("portal community", () => {
  it("shows an honest empty history alongside labelled sample activity cards", () => {
    const html = renderToStaticMarkup(createElement(PortalCommunity, { history: [], today: "2026-09-12" }));
    expect(html).toContain("まだ履歴はありません");
    expect(html).toContain("つくりながら、AIと話そう");
    expect(html).toContain("SAMPLE ACTIVITIES");
    expect(html).toContain("実際の募集ではありません");
    expect(html).toContain('class="pd-checkin-button');
  });
  const entry = (overrides: Partial<{ id: string; checkinDate: string; note: string | null }> = {}) =>
    ({ id: "c1", memberId: "m1", checkinDate: "2026-09-12", note: null, createdAt: "2026-09-11T15:00:00Z", ...overrides });
  const render = (props: { history?: unknown[]; today?: string; signedIn?: boolean }) =>
    renderToStaticMarkup(createElement(PortalCommunity, { history: [], today: "2026-09-12", ...props } as never));

  it("offers the note field so a signed-in member can write today's signal", () => {
    // 「書いてから押す」も「押してから書く」も同じ欄で受ける(Issue #119)。
    expect(render({})).toContain("portal-checkin-note");
    expect(render({ history: [entry()] })).toContain("portal-checkin-note");
  });

  it("prefills today's note so it can be rewritten", () => {
    expect(render({ history: [entry({ note: "Tone.jsで音を鳴らした" })] })).toContain("Tone.jsで音を鳴らした");
  });

  it("shows the note of a past day in the history instead of the fixed label", () => {
    const html = render({ today: "2026-09-13", history: [entry({ checkinDate: "2026-09-12", note: "昼に動いた" })] });
    expect(html).toContain("昼に動いた");
  });

  it("keeps the fixed label for a day with no note", () => {
    expect(render({ today: "2026-09-13", history: [entry({ checkinDate: "2026-09-12" })] })).toContain("CHECKED IN");
  });

  it("does not offer the note field to signed-out visitors", () => {
    expect(render({ signedIn: false })).not.toContain("portal-checkin-note");
  });

  it("shows saved dates and an already checked-in state for the server's day", () => {
    const html = renderToStaticMarkup(createElement(PortalCommunity, { today: "2026-09-12", history: [{ id: "c1", memberId: "m1", checkinDate: "2026-09-12", note: null, createdAt: "2026-09-11T15:00:00Z" }] }));
    expect(html).toContain("2026-09-12");
    expect(html).toContain("今日はチェックイン済みです");
  });
});
