// ABOUTME: Check resumption and the server-owned completion state of the adopted journey.
// ABOUTME: The current production step IDs remain the only required steps.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { initiationSteps } from "@/lib/initiation/content";
import { PortalJourney } from "@/components/portal/PortalJourney";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/initiation/actions", () => ({ saveStep: vi.fn() }));
vi.mock("@/app/members/actions", () => ({ saveDisplayName: vi.fn() }));

describe("portal journey", () => {
  const props = { steps: initiationSteps, entries: [], displayName: null, complete: false };
  it("starts with an optional name, outside the required four steps", () => {
    const html = renderToStaticMarkup(createElement(PortalJourney, props));
    expect(html).toContain("呼び名（任意）");
    expect(html).toContain("名前を入力せずにはじめる");
    expect(html).not.toContain("NFTを受け取る");
  });
  it("resumes at the first unsaved production step", () => {
    const entries = [{ stepId: "q-introduction", answer: "保存した回答", completedAt: "2026-09-12T00:00:00Z" }];
    const html = renderToStaticMarkup(createElement(PortalJourney, { ...props, entries }));
    expect(html).toContain("HENKAKUをどこで知りましたか？");
    expect(html).toContain("answer-q-how-found");
    expect(html).not.toContain("まだ言葉にしない");
  });
  it("uses the server completion result to offer the passport", () => {
    const html = renderToStaticMarkup(createElement(PortalJourney, { ...props, complete: true }));
    expect(html).toContain("WELCOME TO");
    expect(html).toContain('href="/passport"');
    expect(html).not.toContain("このブラウザ内に保存");
  });
});
