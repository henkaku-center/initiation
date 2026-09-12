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
  it("shows saved dates and an already checked-in state for the server's day", () => {
    const html = renderToStaticMarkup(createElement(PortalCommunity, { today: "2026-09-12", history: [{ id: "c1", memberId: "m1", checkinDate: "2026-09-12", createdAt: "2026-09-11T15:00:00Z" }] }));
    expect(html).toContain("2026-09-12");
    expect(html).toContain("今日はチェックイン済みです");
  });
});
