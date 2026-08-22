// ABOUTME: 生成した JSON を MIDI と突き合わせ、時間・音高・長さが失われていないか検査する。
// ABOUTME: 音を鳴らさずに検証できる部分をここに寄せ、耳での確認は preview.html に任せる。

import type { Midi } from "@tonejs/midi";
import type { RawTrackMeta } from "./midiMeta";
import { collectNotesBySource, type ToneSong } from "./midiToTone";
import {
  barsBeatsSixteenthsToTicks,
  divisionToTicks,
  quantizeTicks,
  ticksPerBar,
} from "./musicalTime";

const noteKey = (ticks: number, name: string, durationTicks: number, velocity: number) =>
  `${ticks}|${name}|${durationTicks}|${velocity.toFixed(3)}`;

/** JSON から MIDI の tick を復元し、元のノート集合と一致するかを検査する。 */
export const verifyToneSong = (
  song: ToneSong,
  midi: Midi,
  rawTracks: readonly RawTrackMeta[],
): string[] => {
  const issues: string[] = [];
  const timeSignature = song.timeSignature as readonly [number, number];
  const gridTicks = song.quantize ? divisionToTicks(song.quantize, song.ppq) : null;

  const expected = new Map<string, number>();
  collectNotesBySource(midi, rawTracks, {
    trimClipOverlap: song.trimClipOverlap,
  }).forEach((notes, sourceName) => {
    notes.forEach((note) => {
      const ticks = gridTicks ? quantizeTicks(note.ticks, gridTicks) : note.ticks;
      const key = `${sourceName}#${noteKey(ticks, note.name, Math.max(note.durationTicks, 1), note.velocity)}`;
      expected.set(key, (expected.get(key) ?? 0) + 1);
    });
  });

  const actual = new Map<string, number>();
  song.tracks.forEach((track) => {
    let previousTicks = -1;
    track.events.forEach((event) => {
      const ticks = barsBeatsSixteenthsToTicks(event.time, song.ppq, timeSignature);
      const durationTicks = barsBeatsSixteenthsToTicks(event.duration, song.ppq, timeSignature);
      if (ticks < previousTicks) {
        issues.push(`${track.name}: イベントが時間順に並んでいません (${event.time})`);
      }
      previousTicks = ticks;
      if (durationTicks <= 0) {
        issues.push(`${track.name}: 長さが 0 のイベントがあります (${event.time})`);
      }
      if (event.velocity <= 0 || event.velocity > 1) {
        issues.push(`${track.name}: velocity が 0..1 の範囲外です (${event.velocity})`);
      }
      const key = `${track.sourceName}#${noteKey(ticks, event.note, durationTicks, event.velocity)}`;
      actual.set(key, (actual.get(key) ?? 0) + 1);
    });
    if (track.events.length !== track.noteCount) {
      issues.push(`${track.name}: noteCount とイベント数が一致しません`);
    }
  });

  expected.forEach((count, key) => {
    if (actual.get(key) !== count) {
      issues.push(`MIDI にあるノートが JSON で再現できません: ${key}`);
    }
  });
  actual.forEach((count, key) => {
    if (expected.get(key) !== count) {
      issues.push(`MIDI に存在しないノートが JSON にあります: ${key}`);
    }
  });

  // 開始位置ではなく終了位置と比べる。--bars で短く指定された場合もここで気づける。
  const lengthTicks = song.lengthBars * ticksPerBar(song.ppq, timeSignature);
  const lastEnd = Math.max(
    0,
    ...song.tracks.flatMap((track) =>
      track.events.map(
        (event) =>
          barsBeatsSixteenthsToTicks(event.time, song.ppq, timeSignature) +
          barsBeatsSixteenthsToTicks(event.duration, song.ppq, timeSignature),
      ),
    ),
  );
  if (lengthTicks < lastEnd) {
    issues.push(
      `lengthBars ${song.lengthBars} が最後のノート終了位置(tick ${lastEnd})より前です`,
    );
  }
  if (song.loopBars > song.lengthBars) {
    issues.push(`loopBars ${song.loopBars} が素材の長さ ${song.lengthBars} を超えています`);
  }

  return issues;
};
