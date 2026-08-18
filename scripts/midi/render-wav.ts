#!/usr/bin/env npx tsx
// ABOUTME: 変換後の JSON を WAV に書き出す CLI。ブラウザを開かずに耳で確認するために使う。
// ABOUTME: 使い方: npx tsx scripts/midi/render-wav.ts public/music/karawapo-breeze-zero.json -o preview.wav

import { readFileSync, writeFileSync } from "node:fs";
import type { ToneSong } from "./midiToTone";
import { DEFAULT_SAMPLE_RATE, encodeWav, renderSongToPcm } from "./renderAudio";

const [input, ...rest] = process.argv.slice(2);
if (!input) {
  throw new Error("使い方: npx tsx scripts/midi/render-wav.ts <song.json> [-o out.wav]");
}
const outputIndex = rest.findIndex((arg) => arg === "-o" || arg === "--output");
const output = outputIndex >= 0 ? rest[outputIndex + 1] : input.replace(/\.json$/i, ".wav");
if (!output) throw new Error("-o には出力先が必要です");

const song = JSON.parse(readFileSync(input, "utf8")) as ToneSong;
const samples = renderSongToPcm(song, DEFAULT_SAMPLE_RATE);
writeFileSync(output, encodeWav(samples, DEFAULT_SAMPLE_RATE));

const peak = samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
console.log(
  `${output}: ${(samples.length / DEFAULT_SAMPLE_RATE).toFixed(2)}s / peak ${peak.toFixed(3)} / ${song.tracks.length} tracks`,
);
