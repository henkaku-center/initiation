// ABOUTME: Validate the adopted questionnaire and explicit optional-answer records.
// ABOUTME: Legacy completion stays valid without importing or rewriting old answers.
import { describe, expect, it } from "vitest";
import { journeyRecords, journeySteps, needsOpeningRecord, validateJourneyAnswer, readJourneyAnswer } from "@/lib/initiation/journey";
import { isJourneyComplete, isInitiationComplete } from "@/lib/initiation/complete";
import { initiationSteps } from "@/lib/initiation/content";

describe("journey questionnaire", () => {
  it("uses five distinct IDs, apart from the optional profile name and legacy four", () => {
    expect(journeySteps.map((step) => step.id)).toEqual(["v2-interests", "v2-curiosity", "v2-experience", "v2-readiness", "v2-contribution"]);
    expect(journeySteps.map((step) => step.kind)).toEqual(["multiple", "text", "text", "single", "single"]);
    expect(journeySteps.every((step) => !initiationSteps.some((old) => old.id === step.id))).toBe(true);
  });
  it.each([
    ["v2-interests", ["AI", "MUSIC"]], ["v2-curiosity", "音楽をつくりたい"],
    ["v2-experience", "みんなで展示をつくった"], ["v2-readiness", "まだ迷っている"], ["v2-contribution", "CURIOSITY"],
  ])("accepts the demo's answer format for %s", (id, value) => {
    expect(validateJourneyAnswer(id, { status: "answered", value })).toEqual({ status: "answered", value });
  });
  it("records skipping explicitly for every question", () => {
    for (const step of journeySteps) expect(validateJourneyAnswer(step.id, { status: "skipped" })).toEqual({ status: "skipped" });
  });
  it.each([
    ["v2-curiosity", null], ["v2-curiosity", "text"], ["v2-curiosity", { status: "answered", value: "  " }],
    ["v2-curiosity", { status: "answered", value: "x".repeat(2001) }],
    ["v2-curiosity", { status: "skipped", memberId: "other-member" }],
    ["v2-curiosity", { status: "skipped", value: "hidden answer" }],
    ["v2-interests", { status: "answered", value: ["NOT AN OPTION"] }],
    ["v2-interests", { status: "answered", value: ["AI", "AI"] }],
    ["v2-interests", { status: "answered", value: [] }],
    ["v2-readiness", { status: "answered", value: ["はい、やってみたい！"] }],
    ["v2-contribution", { status: "answered", value: "NFT" }],
    ["q-introduction", { status: "skipped" }], ["unknown", { status: "skipped" }],
  ])("rejects invalid answers for %s", (id, value) => {
    expect(validateJourneyAnswer(id, value)).toBeNull();
  });
  it("validates stored JSON before displaying an answer", () => {
    expect(readJourneyAnswer("v2-curiosity", '{"status":"answered","value":"Saved"}')).toEqual({ status: "answered", value: "Saved" });
    expect(readJourneyAnswer("v2-curiosity", "old free text")).toBeNull();
    expect(readJourneyAnswer("v2-curiosity", null)).toBeNull();
  });
});

describe("versioned completion", () => {
  const all = () => journeySteps.map((step) => ({ stepId: step.id, answer: JSON.stringify({ status: "skipped" }), completedAt: "2026-09-12T00:00:00Z" }));
  it("requires all five validated records, allowing explicit skips", () => {
    expect(isJourneyComplete(all())).toBe(true);
    expect(isInitiationComplete(all())).toBe(true);
    expect(isJourneyComplete(all().slice(1))).toBe(false);
    expect(isJourneyComplete([...all().slice(1), all()[1]])).toBe(false);
    expect(isJourneyComplete(all().map((entry) => ({ ...entry, answer: null })))).toBe(false);
    expect(isJourneyComplete(all().map((entry) => ({ ...entry, answer: '{"status":"finished"}' })))).toBe(false);
  });
  it("preserves qualification for legacy finishers while their current questionnaire remains unanswered", () => {
    const legacy = initiationSteps.map((step) => ({ stepId: step.id, answer: step.kind === "quest" ? null : "Old answer", completedAt: "2026-09-01T00:00:00Z" }));
    expect(isInitiationComplete(legacy)).toBe(true);
    expect(isJourneyComplete(legacy)).toBe(false);
    expect(isInitiationComplete(legacy.slice(1))).toBe(false);
    expect(isJourneyComplete([...legacy, ...all().slice(1)])).toBe(false);
    expect(isInitiationComplete([...legacy, ...all().slice(1)])).toBe(true);
  });
});

describe("visit record", () => {
  // 「開いたが1つも書かなかった人」を数えるための1行。完走には数えない(Issue #120)。
  it("defines the opening record apart from the questions", () => {
    expect(journeyRecords.map((step) => step.id)).toEqual(["v2-opened"]);
    expect(journeySteps.some((step) => journeyRecords.some((record) => record.id === step.id))).toBe(false);
  });

  it("accepts only a seen record for it", () => {
    expect(validateJourneyAnswer("v2-opened", { status: "seen" })).toEqual({ status: "seen" });
    expect(validateJourneyAnswer("v2-opened", { status: "skipped" })).toBeNull();
    expect(validateJourneyAnswer("v2-opened", { status: "answered", value: "見た" })).toBeNull();
    expect(validateJourneyAnswer("v2-opened", { status: "seen", value: "extra" })).toBeNull();
  });

  it("never reads a seen record as an answer to a question", () => {
    for (const step of journeySteps) expect(validateJourneyAnswer(step.id, { status: "seen" })).toBeNull();
  });

  it("does not count towards completion", () => {
    const opened = [{ stepId: "v2-opened", answer: '{"status":"seen"}', completedAt: "2026-09-21T00:00:00Z" }];
    // 記録があっても完走にはならず、記録が増えても完走の条件は変わらない。
    expect(isJourneyComplete(opened)).toBe(false);
    const answered = journeySteps.map((step) => ({ stepId: step.id, answer: '{"status":"skipped"}', completedAt: "t" }));
    expect(isJourneyComplete([...opened, ...answered])).toBe(true);
    expect(isJourneyComplete(answered)).toBe(true);
  });
});

describe("needsOpeningRecord", () => {
  it("asks for the record when the visitor has none", () => {
    expect(needsOpeningRecord([])).toBe(true);
  });

  it("does not ask again once the opening is recorded", () => {
    expect(needsOpeningRecord([{ stepId: "v2-opened", answer: '{"status":"seen"}', completedAt: "t" }])).toBe(false);
  });

  it("asks even when questions are already answered, so an old visitor is counted once", () => {
    const answered = journeySteps.map((step) => ({ stepId: step.id, answer: '{"status":"skipped"}', completedAt: "t" }));
    expect(needsOpeningRecord(answered)).toBe(true);
  });
});
