// ABOUTME: 実際の .mid を変換し、ノートだけが正しく Tone.js 用 JSON になることを確認する。
// ABOUTME: Program Change / Control Change が混ざらないこともここで担保する。
import { readFileSync } from "node:fs";
import path from "node:path";
import midiPackage from "@tonejs/midi";
import { beforeAll, describe, expect, it } from "vitest";
import { readRawTracks, type RawTrackMeta } from "@/scripts/midi/midiMeta";
import {
  alignInstrumentNames,
  collectNotesBySource,
  collectDiscardedEvents,
  convertToToneSong,
  percussionCandidates,
  toLogicalName,
  type ToneSong,
} from "@/scripts/midi/midiToTone";
import { verifyToneSong } from "@/scripts/midi/verifyToneSong";

const { Midi } = midiPackage;
const FIXTURE = path.resolve(process.cwd(), "assets/music/karawapo-breeze-zero.mid");
const OPTIONS = {
  title: "Breeze Zero",
  artist: "karawapo",
  license: "CC BY 4.0",
  source: "karawapo-breeze-zero.mid",
  aliases: { "808": "drums" },
  loopBars: 28,
};

let data: Buffer;
let midi: InstanceType<typeof Midi>;
let raw: ReturnType<typeof readRawTracks>;
let song: ToneSong;

beforeAll(() => {
  data = readFileSync(FIXTURE);
  midi = new Midi(data);
  raw = readRawTracks(data);
  song = convertToToneSong(midi, raw.tracks, OPTIONS);
});

describe("readRawTracks", () => {
  it("@tonejs/midi が落とす楽器名メタを読み出す", () => {
    const instruments = [...new Set(raw.tracks.map((t) => t.instrumentName).filter(Boolean))];
    expect(instruments).toEqual(["e piano", "lead", "bass", "808"]);
  });

  it("ヘッダの分解能とフォーマットを読む", () => {
    expect(raw.ppq).toBe(480);
    expect(raw.format).toBe(1);
  });
});

describe("collectDiscardedEvents", () => {
  it("この曲に Program Change がないことと、CC が変調のみであることを示す", () => {
    const discarded = collectDiscardedEvents(raw.tracks);
    expect(discarded.programChanges).toBe(0);
    expect(discarded.controlChanges).toEqual([{ number: 1, count: 23 }]);
  });
});

describe("toLogicalName", () => {
  it("別名があればそれを使い、なければ camelCase にする", () => {
    expect(toLogicalName("808", { "808": "drums" })).toBe("drums");
    expect(toLogicalName("e piano")).toBe("ePiano");
    expect(toLogicalName("lead")).toBe("lead");
  });
});

describe("alignInstrumentNames", () => {
  it("先頭にメタ専用トラックがずれて入っても名前を取り違えない", () => {
    const rawTracks = [
      { index: 0, trackName: null, instrumentName: null, noteOnCount: 0 },
      { index: 1, trackName: null, instrumentName: null, noteOnCount: 0 },
      { index: 2, trackName: "Untitled", instrumentName: "bass", noteOnCount: 3 },
      { index: 3, trackName: "Untitled", instrumentName: "lead", noteOnCount: 3 },
    ].map((t) => ({ ...t, programChangeCount: 0, controlChanges: [] })) as RawTrackMeta[];
    const toneTracks = [
      { name: "", notes: [] },
      { name: "Untitled", notes: [1, 2, 3] },
      { name: "Untitled", notes: [1, 2, 3] },
    ] as unknown as Parameters<typeof alignInstrumentNames>[1];

    expect(alignInstrumentNames(rawTracks, toneTracks).map((t) => t?.instrumentName)).toEqual([
      null,
      "bass",
      "lead",
    ]);
  });
});

describe("convertToToneSong", () => {
  it("作品名・制作者・ライセンスを持つ(CC BY 4.0 の帰属表示に使う)", () => {
    expect(song.title).toBe("Breeze Zero");
    expect(song.artist).toBe("karawapo");
    expect(song.license).toBe("CC BY 4.0");
  });

  it("制作者とライセンスの指定がなければ null にする(既定値を勝手に入れない)", () => {
    const anonymous = convertToToneSong(midi, raw.tracks, {
      title: "Breeze Zero",
      source: OPTIONS.source,
    });
    expect(anonymous.artist).toBeNull();
    expect(anonymous.license).toBeNull();
  });

  it("テンポと拍子を明示的に持つ", () => {
    expect(song.bpm).toBe(134);
    expect(song.timeSignature).toEqual([4, 4]);
    expect(song.toneTimeSignature).toBe(4);
    expect(song.ppq).toBe(480);
  });

  it("クリップに分かれたトラックを楽器ごとに1本へまとめる", () => {
    expect(song.tracks.map((track) => track.name)).toEqual(["bass", "drums", "ePiano", "lead"]);
    expect(song.tracks.map((track) => track.noteCount)).toEqual([126, 301, 735, 49]);
    const midiNoteCount = midi.tracks.reduce((total, track) => total + track.notes.length, 0);
    expect(song.tracks.reduce((total, track) => total + track.noteCount, 0)).toBe(midiNoteCount);
  });

  it("イベントは Tone.js が読める time / note / duration / velocity だけを持つ", () => {
    const [event] = song.tracks.find((track) => track.name === "lead")!.events;
    expect(Object.keys(event).sort()).toEqual(["duration", "note", "time", "velocity"]);
    expect(event.time).toMatch(/^\d+:\d+:\d+(\.\d+)?$/);
    expect(event.note).toMatch(/^[A-G]#?-?\d$/);
    expect(event.velocity).toBeGreaterThan(0);
    expect(event.velocity).toBeLessThanOrEqual(1);
  });

  it("イベントを時間順に並べる", () => {
    song.tracks.forEach((track) => {
      const bars = track.events.map((event) => Number(event.time.split(":")[0]));
      expect(bars).toEqual([...bars].sort((a, b) => a - b));
    });
  });

  it("素材の長さとループの折り返し位置を分けて持つ", () => {
    expect(song.lengthBars).toBe(29);
    expect(song.loopBars).toBe(28);
    expect(song.loop).toEqual({ start: "0:0:0", end: "28:0:0" });
  });

  it("量子化を指定するとノートの開始位置がグリッドに乗る", () => {
    const quantized = convertToToneSong(midi, raw.tracks, { ...OPTIONS, quantize: "1/16" });
    const offGrid = quantized.tracks
      .flatMap((track) => track.events)
      .filter((event) => Number(event.time.split(":")[2]) % 1 !== 0);
    expect(offGrid).toEqual([]);
    expect(quantized.quantize).toBe("1/16");
  });

  it("既定ではタイミングを丸めず、元の揺れを残す", () => {
    const offGrid = song.tracks
      .flatMap((track) => track.events)
      .filter((event) => Number(event.time.split(":")[2]) % 1 !== 0);
    expect(offGrid.length).toBeGreaterThan(0);
    expect(song.quantize).toBeNull();
  });

  it("テンポが途中で変わる MIDI は変換しない", () => {
    const changed = new Midi(data);
    changed.header.tempos[1].bpm = 90;
    expect(() => convertToToneSong(changed, raw.tracks, OPTIONS)).toThrow(/テンポ変化/);
  });
});

describe("verifyToneSong", () => {
  it("生成した JSON が MIDI のノートと一致する", () => {
    expect(verifyToneSong(song, midi, raw.tracks)).toEqual([]);
  });

  it("ノートがずれていれば検出する", () => {
    const [first, ...rest] = song.tracks[0].events;
    const broken = {
      ...song,
      tracks: [
        { ...song.tracks[0], events: [{ ...first, note: "C7" }, ...rest] },
        ...song.tracks.slice(1),
      ],
    };
    expect(verifyToneSong(broken, midi, raw.tracks).length).toBeGreaterThan(0);
  });

  it("ループが素材より長ければ検出する", () => {
    expect(verifyToneSong({ ...song, loopBars: 99 }, midi, raw.tracks)).toContain(
      "loopBars 99 が素材の長さ 29 を超えています",
    );
  });
});

describe("パーカッショントラック", () => {
  it("GM ドラムとして指定した音源に drumMap を付ける", () => {
    const percussive = convertToToneSong(midi, raw.tracks, {
      ...OPTIONS,
      percussionSources: ["808"],
    });
    const drums = percussive.tracks.find((track) => track.name === "drums")!;
    expect(drums.isPercussion).toBe(true);
    expect(drums.drumMap).toMatchObject({ C2: "bassDrum", "F#2": "closedHiHat" });
    expect(Object.keys(drums.drumMap!)).toHaveLength(8);
    percussive.tracks
      .filter((track) => track.name !== "drums")
      .forEach((track) => {
        expect(track.isPercussion).toBe(false);
        expect(track.drumMap).toBeUndefined();
      });
  });

  it("指定がなければ音程ありのトラックとして扱う", () => {
    const drums = song.tracks.find((track) => track.name === "drums")!;
    expect(drums.isPercussion).toBe(false);
  });
});

describe("percussionCandidates", () => {
  it("ドラムパターンらしいトラックだけを挙げる", () => {
    expect(percussionCandidates(midi, raw.tracks)).toEqual(["808"]);
  });
});

describe("クリップの重なりの処理", () => {
  const notesAt = (track: { events: readonly { time: string; note: string }[] }, time: string) =>
    track.events.filter((event) => event.time === time).map((event) => event.note).sort();
  const CLIP_BOUNDARY = "4:0:0"; // 2つ目のクリップの頭(7.164s)

  it("既定では前のクリップの終止和音が次のクリップの頭と重なる", () => {
    const ePiano = song.tracks.find((track) => track.name === "ePiano")!;
    expect(notesAt(ePiano, CLIP_BOUNDARY)).toEqual(["A4", "B4", "D4", "E4", "F4", "G4"]);
    expect(song.trimClipOverlap).toBe(false);
  });

  it("trimClipOverlap を付けると、はみ出した音を捨てて次のクリップの和音だけを残す", () => {
    const trimmed = convertToToneSong(midi, raw.tracks, { ...OPTIONS, trimClipOverlap: true });
    const ePiano = trimmed.tracks.find((track) => track.name === "ePiano")!;
    expect(notesAt(ePiano, CLIP_BOUNDARY)).toEqual(["A4", "D4", "F4"]);
    expect(trimmed.trimClipOverlap).toBe(true);
  });

  it("はみ出していたトラックだけが減り、他のトラックは変わらない", () => {
    const trimmed = convertToToneSong(midi, raw.tracks, { ...OPTIONS, trimClipOverlap: true });
    const noteCounts = Object.fromEntries(
      trimmed.tracks.map((track) => [track.name, track.noteCount]),
    );
    // ePiano は 4和音 x 8打 x 3音 = 96音/クリップ。はみ出しの9音が7クリップぶん消える。
    expect(noteCounts).toEqual({ bass: 126, drums: 301, ePiano: 96 * 7, lead: 49 });
  });

  it("最後のクリップのはみ出しも削り、素材をちょうど28小節にする", () => {
    const trimmed = convertToToneSong(midi, raw.tracks, {
      ...OPTIONS,
      loopBars: null,
      trimClipOverlap: true,
    });
    const ePiano = trimmed.tracks.find((track) => track.name === "ePiano")!;
    expect(notesAt(ePiano, "28:0:0")).toEqual([]);
    expect(trimmed.lengthBars).toBe(28);
    expect(trimmed.loop).toEqual({ start: "0:0:0", end: "28:0:0" });
  });

  it("残ったノートは4和音を8打ずつ繰り返す形になる", () => {
    const trimmed = convertToToneSong(midi, raw.tracks, { ...OPTIONS, trimClipOverlap: true });
    const ePiano = trimmed.tracks.find((track) => track.name === "ePiano")!;
    const chordsInFirstClip = ["0:0:0", "1:0:0", "2:0:0", "3:0:0"].map((time) =>
      notesAt(ePiano, time).join(" "),
    );
    expect(chordsInFirstClip).toEqual(["A4 D4 F4", "A4 C5 F4", "B4 E4 G4", "B4 D5 G4"]);
    const hitsPerChord = ["0:0:0", "0:0:2", "0:1:0", "0:1:2", "0:2:0", "0:2:2", "0:3:0", "0:3:2"];
    hitsPerChord.forEach((time) => expect(notesAt(ePiano, time)).toEqual(["A4", "D4", "F4"]));
  });

  it("削った結果も MIDI と突き合わせて検証できる", () => {
    const trimmed = convertToToneSong(midi, raw.tracks, { ...OPTIONS, trimClipOverlap: true });
    expect(verifyToneSong(trimmed, midi, raw.tracks)).toEqual([]);
  });
});

describe("collectNotesBySource", () => {
  it("クリップに分かれたトラックを楽器ごとにまとめる", () => {
    const grouped = collectNotesBySource(midi, raw.tracks);
    expect([...grouped.keys()].sort()).toEqual(["808", "bass", "e piano", "lead"]);
    expect(grouped.get("e piano")!.length).toBe(735);
  });

  it("重なりを削るのは、次のクリップが始まったあとに鳴り出す音だけ", () => {
    const grouped = collectNotesBySource(midi, raw.tracks, { trimClipOverlap: true });
    expect(grouped.get("e piano")!.length).toBe(672);
    expect(grouped.get("bass")!.length).toBe(126);
  });
});
