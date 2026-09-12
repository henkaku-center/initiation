// ABOUTME: Check resumption and the server-owned completion state of the adopted journey.
// ABOUTME: The adopted questions, optional answers and original scenes stay aligned.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { journeySteps } from "@/lib/initiation/journey";
import { PortalJourney } from "@/components/portal/PortalJourney";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/initiation/actions", () => ({ saveStep: vi.fn() }));
vi.mock("@/app/members/actions", () => ({ saveDisplayName: vi.fn() }));

describe("portal journey", () => {
  const props = { steps: journeySteps, entries: [], displayName: null, complete: false };
  it("starts with the reference arrival scene before the optional questions", () => {
    const html = renderToStaticMarkup(createElement(PortalJourney, props));
    expect(html).toContain("はじめまして、旅人。");
    expect(html).toContain("まだ何なのか、分からない世界。");
    expect(html).toContain("A PATH NOT YET TAKEN");
    expect(html).toContain("Music: Breeze Zero");
    expect(html).not.toContain("NFTを受け取る");
  });
  it("resumes at the first unsaved question after a recorded skip", () => {
    const entries = [{ stepId: "v2-interests", answer: '{"status":"skipped"}', completedAt: "2026-09-12T00:00:00Z" }];
    const html = renderToStaticMarkup(createElement(PortalJourney, { ...props, entries }));
    expect(html).toContain("いま、気になっていることを教えてください。");
    expect(html).toContain("answer-v2-curiosity");
    expect(html).toContain("pd-world-night");
    expect(html).toContain("あなたの中で、動きはじめたこと。");
    expect(html).toContain("まだ言葉にしない");
  });
  it("does not display old answers as responses to the current questions", () => {
    const entries = [{ stepId: "q-introduction", answer: "旧自己紹介", completedAt: "2026-09-12T00:00:00Z" }];
    const html = renderToStaticMarkup(createElement(PortalJourney, { ...props, entries }));
    expect(html).toContain("はじめまして、旅人。");
    expect(html).not.toContain("旧自己紹介");
  });
  it("opens the adopted name form when a finisher chooses to edit", () => {
    const html = renderToStaticMarkup(createElement(PortalJourney, { ...props, complete: true, review: true, displayName: "Saved name" }));
    expect(html).toContain("あなたを、なんとお呼びしたらいいですか？");
    expect(html).toContain('value="Saved name"');
    expect(html).not.toContain("WELCOME TO");
  });
  it("uses the server completion result to offer the passport", () => {
    const html = renderToStaticMarkup(createElement(PortalJourney, { ...props, complete: true }));
    expect(html).toContain("WELCOME TO");
    expect(html).toContain('href="/passport"');
    expect(html).not.toContain("このブラウザ内に保存");
  });
});
