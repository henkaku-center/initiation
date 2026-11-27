// ABOUTME: /initiation がCommunity Fieldの集計を入口へ渡す条件を固定する(Issue #132)。
// ABOUTME: 見られるのはサインイン済みの人だけ。集計を取得できなくてもInitiationは止めない。
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommunityField } from "@/lib/domain/communityField";

const journey = vi.hoisted(() => vi.fn((props: Record<string, unknown>) => (props ? "Journey" : "")));
const state = vi.hoisted(() => ({
  signedIn: true,
  summary: vi.fn(),
  listByMember: vi.fn(async () => []),
}));
const Unauthenticated = vi.hoisted(() => class extends Error {});

vi.mock("@/components/portal/PortalJourney", () => ({ PortalJourney: journey }));
vi.mock("@/components/portal/MemberBoundary", () => ({ MemberBoundary: ({ children }: { children: unknown }) => children }));
vi.mock("@/lib/auth/guards", () => ({
  UnauthenticatedError: Unauthenticated,
  requireMember: vi.fn(async () => {
    if (!state.signedIn) throw new Unauthenticated();
    return { id: "m1", walletAddress: "0x1111111111111111111111111111111111111111", displayName: null };
  }),
}));
vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({
    progress: { listByMember: state.listByMember },
    communityField: { summary: state.summary },
  }),
}));

import InitiationPage from "@/app/initiation/page";

const field: CommunityField = {
  checkins: { days: 7, count: 3, members: 2 },
  interests: { respondents: 1, tags: [{ tag: "AI", count: 1 }], combinations: [] },
};

beforeEach(() => {
  journey.mockClear();
  state.signedIn = true;
  state.summary.mockReset();
  state.summary.mockResolvedValue(field);
});

describe("initiation page", () => {
  it("passes the field to the entrance for a signed-in person", async () => {
    renderToStaticMarkup(await InitiationPage());
    expect(state.summary).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(journey).toHaveBeenCalledWith(expect.objectContaining({ field }), undefined);
  });

  it("does not read the field for someone who has not signed in", async () => {
    state.signedIn = false;
    renderToStaticMarkup(await InitiationPage());
    expect(state.summary).not.toHaveBeenCalled();
    expect(journey).toHaveBeenCalledWith(expect.objectContaining({ signedIn: false }), undefined);
    expect(journey.mock.calls[0][0]).not.toHaveProperty("field");
  });

  it("keeps Initiation open when the field cannot be read", async () => {
    state.summary.mockRejectedValue(new Error("db down"));
    renderToStaticMarkup(await InitiationPage());
    expect(journey).toHaveBeenCalledWith(expect.objectContaining({ field: null, entries: [] }), undefined);
  });
});
