// ABOUTME: Community displays only the authenticated member's persisted check-ins.
// ABOUTME: Sample activities and invented counts do not appear in the normal application.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PortalCommunity } from "@/components/portal/PortalCommunity";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/checkin/actions", () => ({ checkin: vi.fn() }));

describe("portal community", () => {
  it("shows an honest empty history and no fictional activity cards", () => {
    const html = renderToStaticMarkup(createElement(PortalCommunity, { history: [], today: "2026-09-12" }));
    expect(html).toContain("まだ履歴はありません");
    expect(html).not.toContain("つくりながら、AIと話そう");
    expect(html).toContain("準備中");
  });
  it("shows saved dates and an already checked-in state for the server's day", () => {
    const html = renderToStaticMarkup(createElement(PortalCommunity, { today: "2026-09-12", history: [{ id: "c1", memberId: "m1", checkinDate: "2026-09-12", createdAt: "2026-09-11T15:00:00Z" }] }));
    expect(html).toContain("2026-09-12");
    expect(html).toContain("今日はチェックイン済みです");
  });
});
