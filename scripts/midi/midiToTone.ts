// ABOUTME: MIDI のノートだけを取り出し、Tone.js がそのまま読める曲データに組み立てる。
// ABOUTME: Program Change と Control Change は音源固有の設定なので取り込まない。

import type { Midi, Track } from "@tonejs/midi";
import type { RawTrackMeta } from "./midiMeta";
import { looksLikeDrumKit, percussionMapFor } from "./gmPercussion";
import {
  beatsPerBar,
  divisionToTicks,
  quantizeTicks,
  ticksPerBar,
  ticksToBarsBeatsSixteenths,
  type TimeSignature,
} from "./musicalTime";

export type ToneNoteEvent = {
  readonly time: string;
  readonly note: string;
  readonly duration: string;
  readonly velocity: number;
};

export type ToneTrack = {
  readonly name: string;
  readonly sourceName: string;
  readonly noteCount: number;
  /** true のとき note は音程ではなく打楽器の指定(drumMap を参照)。 */
  readonly isPercussion: boolean;
  readonly drumMap?: Readonly<Record<string, string>>;
  readonly events: readonly ToneNoteEvent[];
};

export type ToneSong = {
  readonly title: string;
  /** CC BY 4.0 は帰属表示が条件なので、再生する画面で出せるようにここへ持たせる。 */
  readonly artist: string | null;
  readonly license: string | null;
  readonly source: string;
  readonly bpm: number;
  readonly timeSignature: readonly [number, number];
  readonly toneTimeSignature: number;
  readonly ppq: number;
  readonly lengthBars: number;
  readonly loopBars: number;
  readonly durationSeconds: number;
  readonly loop: { readonly start: string; readonly end: string };
  readonly quantize: string | null;
  readonly trimClipOverlap: boolean;
  readonly tracks: readonly ToneTrack[];
};

export type DiscardedEvents = {
  readonly programChanges: number;
  readonly controlChanges: ReadonlyArray<{ number: number; count: number }>;
};

export type ConvertOptions = {
  readonly title: string;
  readonly artist?: string | null;
  readonly license?: string | null;
  readonly source: string;
  /** 音源名 -> 論理トラック名の読み替え。 */
  readonly aliases?: Readonly<Record<string, string>>;
  /** "1/16" など。指定するとノートの開始位置だけを丸める。 */
  readonly quantize?: string | null;
  /** 素材全体の長さを小節数で上書きする。 */
  readonly lengthBars?: number | null;
  /** ループの折り返し位置を小節数で指定する。既定は lengthBars。 */
  readonly loopBars?: number | null;
  /** GM パーカッションとして扱う音源名。 */
  readonly percussionSources?: readonly string[];
  /** 次のクリップへはみ出したノートを捨てる(DAW で同じトラックに並べたときの鳴り方に合わせる)。 */
  readonly trimClipOverlap?: boolean;
};

const VELOCITY_DECIMALS = 3;

const isBlank = (value: string | null): boolean => (value ?? "").trim() === "";

const trackSignature = (track: Track): { name: string; noteCount: number } => ({
  name: track.name ?? "",
  noteCount: track.notes.length,
});

/**
 * @tonejs/midi のトラックに、SMF から読んだ楽器名メタを対応づける。
 * 先頭のメタ専用トラックが取り込まれる数はパーサ次第なので、
 * トラック名とノート数が一致するものを前から順に消費して照合する。
 */
export const alignInstrumentNames = (
  rawTracks: readonly RawTrackMeta[],
  toneTracks: readonly Track[],
): ReadonlyArray<RawTrackMeta | null> => {
  let cursor = 0;
  return toneTracks.map((track) => {
    const { name, noteCount } = trackSignature(track);
    for (let index = cursor; index < rawTracks.length; index += 1) {
      const raw = rawTracks[index];
      if ((raw.trackName ?? "") === name && raw.noteOnCount === noteCount) {
        cursor = index + 1;
        return raw;
      }
    }
    return null;
  });
};

const camelCase = (value: string): string =>
  value
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("");

/** "e piano" のような音源名を、コードから参照しやすい論理名にする。 */
export const toLogicalName = (
  sourceName: string,
  aliases: Readonly<Record<string, string>> = {},
): string => aliases[sourceName] ?? camelCase(sourceName) ?? sourceName;

type ClipNotes = Track["notes"][number][];
/**
 * ノートの開始位置。量子化を指定した場合は丸めたあとの位置を返す。
 *
 * どのノートを残すかは、JSON に書き出すのと同じ位置で判定する必要がある。元の位置で
 * 切ってから丸めると、境界の手前にあった音が丸めで境界へ戻り、取り除いたはずの重なりが
 * 復活する。一方、クリップの境界そのものは元の tick で測る。丸めた位置で測ると、
 * 近接したクリップの頭が同じ位置に潰れて長さの推定が壊れる。
 */
const startTicksWith =
  (gridTicks: number | null) =>
  (note: { readonly ticks: number }): number =>
    gridTicks ? quantizeTicks(note.ticks, gridTicks) : note.ticks;

const startOf = (clip: ClipNotes): number => Math.min(...clip.map((note) => note.ticks));

/** クリップの並びから1クリップの長さ(tick)を推定する。 */
const clipLengthOf = (orderedClips: readonly ClipNotes[]): number | null => {
  if (orderedClips.length < 2) return null;
  const starts = orderedClips.map(startOf);
  const gaps = starts.slice(1).map((start, index) => start - starts[index]).sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
};

/**
 * そのクリップの音を残す上限。次のクリップがあればその頭、
 * 最後のクリップは推定したクリップ長から算出する(最後のクリップにも同じはみ出しがあるため)。
 *
 * 最後の境界は必ず「そのクリップ自身の頭 + クリップ長」で求める。前のクリップから
 * 推定すると、クリップの間隔が不規則な曲(途中に空白があるなど)で境界が手前にずれ、
 * 最後のクリップの頭を消してしまう。クリップ長はあくまで推定値である点は変わらない。
 */
const boundaryOf = (orderedClips: readonly ClipNotes[], index: number): number | null => {
  const next = orderedClips[index + 1];
  if (next) return startOf(next);
  const length = clipLengthOf(orderedClips);
  return length === null ? null : startOf(orderedClips[index]) + length;
};

/**
 * 論理名ごとに、クリップに分かれたトラックのノートを1本にまとめる。
 *
 * trimClipOverlap を付けると、クリップの長さを超えて鳴り出すノートを捨てる。
 * 書き出し元では1クリップ=1トラックなので重なっても問題にならないが、
 * 1本にまとめると前のクリップのはみ出しが次のクリップの頭と同時に鳴ってしまう。
 * 最後のクリップにも同じはみ出しが含まれるので、そこも推定したクリップ長で切る。
 */
export const collectNotesBySource = (
  midi: Midi,
  rawTracks: readonly RawTrackMeta[],
  options: { readonly trimClipOverlap?: boolean; readonly gridTicks?: number | null } = {},
): Map<string, ClipNotes> => {
  const startTicks = startTicksWith(options.gridTicks ?? null);
  const rawByTrack = alignInstrumentNames(rawTracks, midi.tracks);
  const clipsBySource = new Map<string, ClipNotes[]>();
  midi.tracks.forEach((track, index) => {
    if (track.notes.length === 0) return;
    const raw = rawByTrack[index];
    const sourceName = !isBlank(raw?.instrumentName ?? null)
      ? (raw!.instrumentName as string)
      : !isBlank(track.name)
        ? track.name
        : `track${index}`;
    clipsBySource.set(sourceName, [...(clipsBySource.get(sourceName) ?? []), [...track.notes]]);
  });

  return new Map(
    [...clipsBySource].map(([sourceName, clips]) => {
      const ordered = [...clips].sort((a, b) => startOf(a) - startOf(b));
      const notes = ordered.flatMap((clip, index) => {
        if (!options.trimClipOverlap) return clip;
        const boundary = boundaryOf(ordered, index);
        return boundary === null ? clip : clip.filter((note) => startTicks(note) < boundary);
      });
      return [sourceName, notes] as const;
    }),
  );
};

const resolveTempo = (midi: Midi): number => {
  const tempos = midi.header.tempos;
  if (tempos.length === 0) return 120;
  const rounded = tempos.map((tempo) => Number(tempo.bpm.toFixed(3)));
  const distinct = [...new Set(rounded)];
  if (distinct.length > 1) {
    throw new Error(
      `テンポ変化がある MIDI には未対応です(検出: ${distinct.join(", ")} BPM)`,
    );
  }
  return distinct[0];
};

const resolveTimeSignature = (midi: Midi): TimeSignature => {
  const signatures = midi.header.timeSignatures;
  if (signatures.length === 0) return [4, 4];
  const distinct = [...new Set(signatures.map((s) => s.timeSignature.join("/")))];
  if (distinct.length > 1) {
    throw new Error(`拍子変化がある MIDI には未対応です(検出: ${distinct.join(", ")})`);
  }
  const [numerator, denominator] = signatures[0].timeSignature;
  return [numerator, denominator];
};

export const collectDiscardedEvents = (
  rawTracks: readonly RawTrackMeta[],
): DiscardedEvents => {
  const controlChanges = new Map<number, number>();
  let programChanges = 0;
  rawTracks.forEach((track) => {
    programChanges += track.programChangeCount;
    track.controlChanges.forEach(({ number, count }) => {
      controlChanges.set(number, (controlChanges.get(number) ?? 0) + count);
    });
  });
  return {
    programChanges,
    controlChanges: [...controlChanges]
      .map(([number, count]) => ({ number, count }))
      .sort((a, b) => a.number - b.number),
  };
};

/** ノートイベントだけを持つ Tone.js 用の曲データを組み立てる。 */
export const convertToToneSong = (
  midi: Midi,
  rawTracks: readonly RawTrackMeta[],
  options: ConvertOptions,
): ToneSong => {
  const bpm = resolveTempo(midi);
  const timeSignature = resolveTimeSignature(midi);
  const ppq = midi.header.ppq;
  const barTicks = ticksPerBar(ppq, timeSignature);
  const gridTicks = options.quantize ? divisionToTicks(options.quantize, ppq) : null;

  const grouped = collectNotesBySource(midi, rawTracks, {
    trimClipOverlap: options.trimClipOverlap,
    gridTicks,
  });

  const startTicksOf = startTicksWith(gridTicks);
  /** JSON に書き出す長さと同じ値。0 の長さは 1 tick として扱う。 */
  const endTicksOf = (note: { ticks: number; durationTicks: number }): number =>
    startTicksOf(note) + Math.max(note.durationTicks, 1);

  const tracks: ToneTrack[] = [...grouped]
    .map(([sourceName, notes]) => {
      const events = notes
        .map((note) => ({ note, ticks: startTicksOf(note) }))
        .sort((a, b) => a.ticks - b.ticks || a.note.midi - b.note.midi)
        .map(({ note, ticks }) => ({
          time: ticksToBarsBeatsSixteenths(ticks, ppq, timeSignature),
          note: note.name,
          duration: ticksToBarsBeatsSixteenths(
            Math.max(note.durationTicks, 1),
            ppq,
            timeSignature,
          ),
          velocity: Number(note.velocity.toFixed(VELOCITY_DECIMALS)),
        }));
      const isPercussion = (options.percussionSources ?? []).includes(sourceName);
      return {
        name: toLogicalName(sourceName, options.aliases),
        sourceName,
        noteCount: events.length,
        isPercussion,
        ...(isPercussion ? { drumMap: percussionMapFor(notes) } : {}),
        events,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // 開始位置だけで測ると、小節の終わり近くで始まる長いノートが素材長からはみ出す。
  const lastNoteEnd = Math.max(
    0,
    ...[...grouped.values()].flatMap((notes) => notes.map(endTicksOf)),
  );
  const lengthBars = options.lengthBars ?? Math.max(1, Math.ceil(lastNoteEnd / barTicks));
  const loopBars = options.loopBars ?? lengthBars;

  return {
    title: options.title,
    artist: options.artist ?? null,
    license: options.license ?? null,
    source: options.source,
    bpm,
    timeSignature,
    toneTimeSignature: beatsPerBar(timeSignature),
    ppq,
    lengthBars,
    loopBars,
    durationSeconds: Number(
      ((lengthBars * beatsPerBar(timeSignature) * 60) / bpm).toFixed(6),
    ),
    loop: { start: "0:0:0", end: `${loopBars}:0:0` },
    quantize: options.quantize ?? null,
    trimClipOverlap: options.trimClipOverlap ?? false,
    tracks,
  };
};

/** ドラムパターンらしいトラックを返す(--percussion の指定漏れ検出用)。 */
export const percussionCandidates = (
  midi: Midi,
  rawTracks: readonly RawTrackMeta[],
): string[] => {
  const grouped = collectNotesBySource(midi, rawTracks);
  return [...grouped]
    .filter(([, notes]) => looksLikeDrumKit(notes.map((note) => note.midi)))
    .map(([sourceName]) => sourceName);
};
