// ABOUTME: ドラムトラックの音高を打楽器名に読み替えるマップの振る舞いを確認する。
import { describe, expect, it } from "vitest";
import { isGmPercussionPitch, looksLikeDrumKit, percussionMapFor } from "@/scripts/midi/gmPercussion";

describe("isGmPercussionPitch", () => {
  it("GM のパーカッション音高だけを認める", () => {
    expect(isGmPercussionPitch(36)).toBe(true);
    expect(isGmPercussionPitch(81)).toBe(true);
    expect(isGmPercussionPitch(34)).toBe(false);
    expect(isGmPercussionPitch(82)).toBe(false);
  });
});

describe("looksLikeDrumKit", () => {
  it("コアキットの範囲に3音色以上あればドラムとみなす", () => {
    expect(looksLikeDrumKit([36, 40, 42, 42, 46])).toBe(true);
  });

  it("メロディの音域を含むトラックは対象外にする", () => {
    expect(looksLikeDrumKit([62, 65, 69])).toBe(false);
    expect(looksLikeDrumKit([36, 40, 67])).toBe(false);
  });

  it("音色が少なすぎる場合は判断しない", () => {
    expect(looksLikeDrumKit([36, 36, 42])).toBe(false);
    expect(looksLikeDrumKit([])).toBe(false);
  });
});

describe("percussionMapFor", () => {
  it("使われている音高だけを音名順に並べた対応表を返す", () => {
    expect(
      percussionMapFor([
        { midi: 42, name: "F#2" },
        { midi: 36, name: "C2" },
        { midi: 36, name: "C2" },
      ]),
    ).toEqual({ "C2": "bassDrum", "F#2": "closedHiHat" });
  });
});
