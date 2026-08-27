// ABOUTME: tick と Tone.js の時間表記の変換が往復で壊れないことを確認する。
import { describe, expect, it } from "vitest";
import {
  barsBeatsSixteenthsToTicks,
  beatsPerBar,
  divisionToTicks,
  parseBarCount,
  quantizeTicks,
  ticksPerBar,
  ticksToBarsBeatsSixteenths,
} from "@/scripts/midi/musicalTime";

const PPQ = 480;
const FOUR_FOUR = [4, 4] as const;

describe("beatsPerBar", () => {
  it("四分音符を単位として1小節の拍数を返す", () => {
    expect(beatsPerBar(FOUR_FOUR)).toBe(4);
    expect(beatsPerBar([6, 8])).toBe(3);
  });
});

describe("ticksPerBar", () => {
  it("ppq と拍子から1小節の tick 数を求める", () => {
    expect(ticksPerBar(PPQ, FOUR_FOUR)).toBe(1920);
    expect(ticksPerBar(PPQ, [3, 4])).toBe(1440);
  });
});

describe("ticksToBarsBeatsSixteenths", () => {
  it("小節・拍・16分音符に分解する", () => {
    expect(ticksToBarsBeatsSixteenths(0, PPQ, FOUR_FOUR)).toBe("0:0:0");
    expect(ticksToBarsBeatsSixteenths(1920, PPQ, FOUR_FOUR)).toBe("1:0:0");
    expect(ticksToBarsBeatsSixteenths(2040, PPQ, FOUR_FOUR)).toBe("1:0:1");
    expect(ticksToBarsBeatsSixteenths(2400, PPQ, FOUR_FOUR)).toBe("1:1:0");
  });

  it("グリッドに乗らない tick は16分音符の小数で表す", () => {
    expect(ticksToBarsBeatsSixteenths(84, PPQ, FOUR_FOUR)).toBe("0:0:0.7");
  });
});

describe("barsBeatsSixteenthsToTicks", () => {
  it("ticksToBarsBeatsSixteenths の結果を元の tick に戻す", () => {
    const samples = [0, 1, 84, 113, 542, 1920, 7680, 46080, 54302];
    samples.forEach((ticks) => {
      const text = ticksToBarsBeatsSixteenths(ticks, PPQ, FOUR_FOUR);
      expect(barsBeatsSixteenthsToTicks(text, PPQ, FOUR_FOUR)).toBe(ticks);
    });
  });

  it("形式が違う文字列は拒否する", () => {
    expect(() => barsBeatsSixteenthsToTicks("1:2", PPQ, FOUR_FOUR)).toThrow();
    expect(() => barsBeatsSixteenthsToTicks("4n", PPQ, FOUR_FOUR)).toThrow();
  });
});

describe("divisionToTicks", () => {
  it("分割表記を tick に直す", () => {
    expect(divisionToTicks("1/4", PPQ)).toBe(480);
    expect(divisionToTicks("1/16", PPQ)).toBe(120);
    expect(divisionToTicks("1/8t", PPQ)).toBe(160);
  });

  it("未対応の表記は拒否する", () => {
    expect(() => divisionToTicks("16", PPQ)).toThrow();
  });
});

describe("quantizeTicks", () => {
  it("最も近いグリッドに丸める", () => {
    expect(quantizeTicks(113, 120)).toBe(120);
    expect(quantizeTicks(45, 120)).toBe(0);
    expect(quantizeTicks(7680, 120)).toBe(7680);
  });
});

describe("parseBarCount", () => {
  it("小節数として使える整数を読む", () => {
    expect(parseBarCount("28", "--bars")).toBe(28);
    expect(parseBarCount("1", "--loop-bars")).toBe(1);
  });

  it("JSON を壊す値を弾く", () => {
    expect(() => parseBarCount("NaN", "--bars")).toThrow("--bars");
    expect(() => parseBarCount("Infinity", "--bars")).toThrow("--bars");
    expect(() => parseBarCount("-1", "--bars")).toThrow("--bars");
    expect(() => parseBarCount("1.5", "--bars")).toThrow("--bars");
    expect(() => parseBarCount("", "--bars")).toThrow("--bars");
  });

  it("0 は受け取らない(長さ0のループは再生できないため)", () => {
    expect(() => parseBarCount("0", "--bars")).toThrow("1 以上");
    expect(() => parseBarCount("0", "--loop-bars")).toThrow("1 以上");
  });
});

describe("divisionToTicks の分母", () => {
  it("分母が0の指定を入力エラーにする", () => {
    // 素通しすると Infinity になり、開始 tick が NaN になって解析例外で落ちる。
    expect(() => divisionToTicks("1/0", 480)).toThrow("分割表記");
    expect(() => divisionToTicks("1/0t", 480)).toThrow("分割表記");
  });

  it("有限の tick になる指定は通す", () => {
    expect(divisionToTicks("1/16", 480)).toBe(120);
    expect(Number.isFinite(divisionToTicks("1/8t", 480))).toBe(true);
  });
});
