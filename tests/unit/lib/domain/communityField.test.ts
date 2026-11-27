// ABOUTME: Community Fieldの集計が、個人を出さずに件数だけを返すことを固定する(Issue #132)。
// ABOUTME: 1件から数え、スキップや壊れた回答は数えない。組み合わせは同じ人が一緒に選んだ2つのタグ。
import { describe, expect, it } from "vitest";
import { fieldWindowStart, summarizeInterests } from "@/lib/domain/communityField";

const answered = (...tags: string[]) => JSON.stringify({ status: "answered", value: tags });

describe("summarizeInterests", () => {
  it("is empty when nobody has answered", () => {
    expect(summarizeInterests([])).toEqual({ respondents: 0, tags: [], combinations: [] });
  });

  it("counts a single answer, so the field is not blank while the community is small", () => {
    expect(summarizeInterests([answered("AI", "EDUCATION")])).toEqual({
      respondents: 1,
      tags: [
        { tag: "AI", count: 1 },
        { tag: "EDUCATION", count: 1 },
      ],
      combinations: [{ tags: ["AI", "EDUCATION"], count: 1 }],
    });
  });

  it("counts tags and pairs across people, most chosen first", () => {
    const summary = summarizeInterests([
      answered("AI", "EDUCATION"),
      answered("EDUCATION", "AI", "MUSIC"),
      answered("MUSIC"),
      answered("AI", "EDUCATION"),
    ]);
    expect(summary.respondents).toBe(4);
    expect(summary.tags).toEqual([
      { tag: "AI", count: 3 },
      { tag: "EDUCATION", count: 3 },
      { tag: "MUSIC", count: 2 },
    ]);
    expect(summary.combinations).toEqual([
      { tags: ["AI", "EDUCATION"], count: 3 },
      { tags: ["AI", "MUSIC"], count: 1 },
      { tags: ["MUSIC", "EDUCATION"], count: 1 },
    ]);
  });

  it("names a pair in the order of the options, whatever order a person picked them in", () => {
    expect(summarizeInterests([answered("EDUCATION", "AI")]).combinations).toEqual([{ tags: ["AI", "EDUCATION"], count: 1 }]);
  });

  it("does not count skips, missing answers, or answers that are not valid choices", () => {
    const summary = summarizeInterests([
      JSON.stringify({ status: "skipped" }),
      null,
      "",
      "not json",
      JSON.stringify({ status: "answered", value: ["AI", "SECRET"] }),
      JSON.stringify({ status: "answered", value: "AI" }),
      answered("DAO"),
    ]);
    expect(summary).toEqual({ respondents: 1, tags: [{ tag: "DAO", count: 1 }], combinations: [] });
  });
});

describe("fieldWindowStart", () => {
  it("covers today and the six days before it, by the Japan date the check-ins use", () => {
    // 2026-11-26 23:30 JST
    expect(fieldWindowStart(new Date("2026-11-26T14:30:00Z"))).toBe("2026-11-20");
    // 2026-11-27 00:30 JST(UTCではまだ26日)
    expect(fieldWindowStart(new Date("2026-11-26T15:30:00Z"))).toBe("2026-11-21");
  });

  it("crosses a month boundary", () => {
    expect(fieldWindowStart(new Date("2026-12-03T03:00:00Z"))).toBe("2026-11-27");
  });
});
