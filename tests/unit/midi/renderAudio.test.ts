// ABOUTME: 確認用レンダラが JSON の時間・音高どおりに波形を書けているかを検査する。
import { describe, expect, it } from "vitest";
import type { ToneSong } from "@/scripts/midi/midiToTone";
import { encodeWav, frequencyOf, renderSongToPcm } from "@/scripts/midi/renderAudio";

const SAMPLE_RATE = 8000;

const song = (overrides: Partial<ToneSong> = {}): ToneSong =>
  ({
    title: "test",
    artist: null,
    license: null,
    source: "test.mid",
    bpm: 120,
    timeSignature: [4, 4],
    toneTimeSignature: 4,
    ppq: 480,
    lengthBars: 2,
    loopBars: 2,
    durationSeconds: 4,
    loop: { start: "0:0:0", end: "2:0:0" },
    quantize: null,
    tracks: [
      {
        name: "lead",
        sourceName: "lead",
        noteCount: 1,
        isPercussion: false,
        events: [{ time: "1:0:0", note: "A4", duration: "0:1:0", velocity: 1 }],
      },
    ],
    ...overrides,
  }) as ToneSong;

describe("frequencyOf", () => {
  it("音名を周波数にする", () => {
    expect(frequencyOf("A4")).toBeCloseTo(440, 6);
    expect(frequencyOf("A3")).toBeCloseTo(220, 6);
    expect(frequencyOf("C4")).toBeCloseTo(261.626, 3);
    expect(frequencyOf("F#2")).toBeCloseTo(92.499, 3);
  });

  it("音名でない文字列は拒否する", () => {
    expect(() => frequencyOf("H4")).toThrow();
  });
});

describe("renderSongToPcm", () => {
  it("素材の長さに余韻を足した長さで書き出す", () => {
    const samples = renderSongToPcm(song(), SAMPLE_RATE);
    expect(samples.length).toBe((4 + 1) * SAMPLE_RATE);
  });

  it("ノートが始まるまでは無音で、始まってからは音が出る", () => {
    const samples = renderSongToPcm(song(), SAMPLE_RATE);
    const noteStart = 2 * SAMPLE_RATE; // 120BPM の 1小節目
    const before = samples.slice(0, noteStart - 1);
    const after = samples.slice(noteStart, noteStart + SAMPLE_RATE / 2);
    expect(before.every((sample) => sample === 0)).toBe(true);
    expect(Math.max(...after.map(Math.abs))).toBeGreaterThan(0.01);
  });

  it("パーカッションは drumMap の音色で鳴らし、音程には依存しない", () => {
    const drums = song({
      tracks: [
        {
          name: "drums",
          sourceName: "808",
          noteCount: 1,
          isPercussion: true,
          drumMap: { C2: "bassDrum" },
          events: [{ time: "0:0:0", note: "C2", duration: "0:0:1", velocity: 1 }],
        },
      ],
    } as Partial<ToneSong>);
    const samples = renderSongToPcm(drums, SAMPLE_RATE);
    expect(Math.max(...samples.slice(0, SAMPLE_RATE).map(Math.abs))).toBeGreaterThan(0.01);
  });

  it("音が割れないよう全体を 1.0 以内に収める", () => {
    const loud = song({
      tracks: Array.from({ length: 12 }, () => song().tracks[0]),
    } as Partial<ToneSong>);
    const samples = renderSongToPcm(loud, SAMPLE_RATE);
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(1);
  });
});

describe("encodeWav", () => {
  it("16bit モノラルの WAV ヘッダを書く", () => {
    const wav = encodeWav(new Float32Array([0, 1, -1]), SAMPLE_RATE);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(SAMPLE_RATE);
    expect(wav.readUInt32LE(40)).toBe(6);
    expect(wav.readInt16LE(44)).toBe(0);
    expect(wav.readInt16LE(46)).toBe(32767);
    expect(wav.readInt16LE(48)).toBe(-32767);
  });
});
