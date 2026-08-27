#!/usr/bin/env npx tsx
// ABOUTME: 変換前に .mid の中身を確かめるための調査用スクリプト。JSON を標準出力に流す。
// ABOUTME: 使い方: npx tsx scripts/midi/inspect-midi.ts <input.mid>

import { readFileSync } from "node:fs";
import midiPackage from "@tonejs/midi";
import { readRawTracks } from "./midiMeta";

const { Midi } = midiPackage;

const input = process.argv[2];
if (!input) {
  throw new Error("使い方: npx tsx scripts/midi/inspect-midi.ts <input.mid>");
}

const data = readFileSync(input);
const midi = new Midi(data);
const raw = readRawTracks(data);

const lowest = <T>(items: readonly T[], value: (item: T) => number): T =>
  items.reduce((best, item) => (value(item) < value(best) ? item : best));

console.log(
  JSON.stringify(
    {
      file: input,
      format: raw.format,
      ppq: raw.ppq,
      durationSeconds: midi.duration,
      tempos: [...new Set(midi.header.tempos.map((tempo) => Number(tempo.bpm.toFixed(3))))],
      timeSignatures: [
        ...new Set(midi.header.timeSignatures.map((signature) => signature.timeSignature.join("/"))),
      ],
      // 楽器名メタと Program Change / Control Change は SMF から直接読む(@tonejs/midi は保持しない)。
      rawTracks: raw.tracks.map((track) => ({
        index: track.index,
        trackName: track.trackName,
        instrumentName: track.instrumentName,
        noteOnCount: track.noteOnCount,
        programChangeCount: track.programChangeCount,
        controlChanges: track.controlChanges,
      })),
      parsedTracks: midi.tracks.map((track, index) => ({
        index,
        name: track.name,
        channel: track.channel,
        noteCount: track.notes.length,
        firstNoteTicks: track.notes[0]?.ticks ?? null,
        lastNoteEndTicks:
          track.notes.length === 0
            ? null
            : Math.max(...track.notes.map((note) => note.ticks + note.durationTicks)),
        pitchRange:
          track.notes.length === 0
            ? null
            : [
                lowest(track.notes, (note) => note.midi).name,
                lowest(track.notes, (note) => -note.midi).name,
              ],
      })),
    },
    null,
    2,
  ),
);
