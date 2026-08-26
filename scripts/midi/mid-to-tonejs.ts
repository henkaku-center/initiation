#!/usr/bin/env npx tsx
// ABOUTME: .mid を Tone.js 用の JSON に変換する CLI。曲ごとに1ファイルを出力する。
// ABOUTME: 使い方: npx tsx scripts/midi/mid-to-tonejs.ts <input.mid> -o <output.json> [--quantize 1/16]

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname } from "node:path";
import midiPackage from "@tonejs/midi";
import { readRawTracks } from "./midiMeta";
import { parseBarCount } from "./musicalTime";
import {
  collectDiscardedEvents,
  convertToToneSong,
  percussionCandidates,
} from "./midiToTone";
import { verifyToneSong } from "./verifyToneSong";

const { Midi } = midiPackage;

/** 音源名は DAW のプロジェクト由来なので、コードから使いやすい名前に読み替える。 */
const DEFAULT_ALIASES: Record<string, string> = { "808": "drums" };

/** "808" は GM のドラムマップで打ち込まれているので、音程ではなく打楽器として扱う。 */
const DEFAULT_PERCUSSION = ["808"];

type CliOptions = {
  input: string;
  output: string;
  title: string | null;
  artist: string | null;
  license: string | null;
  quantize: string | null;
  lengthBars: number | null;
  loopBars: number | null;
  aliases: Record<string, string>;
  percussionSources: string[];
  trimClipOverlap: boolean;
  verifyOnly: boolean;
};

const parseArgs = (argv: readonly string[]): CliOptions => {
  const positional: string[] = [];
  const options: Omit<CliOptions, "input" | "output"> & { output?: string } = {
    title: null,
    artist: null,
    license: null,
    quantize: null,
    lengthBars: null,
    loopBars: null,
    aliases: { ...DEFAULT_ALIASES },
    percussionSources: [...DEFAULT_PERCUSSION],
    trimClipOverlap: false,
    verifyOnly: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[++index];
      if (value === undefined) throw new Error(`${arg} には値が必要です`);
      return value;
    };
    if (arg === "-o" || arg === "--output") options.output = next();
    else if (arg === "--title") options.title = next();
    else if (arg === "--artist") options.artist = next();
    else if (arg === "--license") options.license = next();
    else if (arg === "--quantize") options.quantize = next();
    else if (arg === "--bars") options.lengthBars = parseBarCount(next(), arg);
    else if (arg === "--loop-bars") options.loopBars = parseBarCount(next(), arg, 0);
    else if (arg === "--verify-only") options.verifyOnly = true;
    else if (arg === "--trim-clip-overlap") options.trimClipOverlap = true;
    else if (arg === "--percussion") options.percussionSources.push(next());
    else if (arg === "--no-percussion") options.percussionSources = [];
    else if (arg === "--name") {
      const [source, logical] = next().split("=");
      if (!source || !logical) throw new Error("--name は 'source=logical' の形式で指定してください");
      options.aliases[source] = logical;
    } else if (arg.startsWith("-")) throw new Error(`不明なオプション: ${arg}`);
    else positional.push(arg);
  }
  const input = positional[0];
  if (!input) {
    throw new Error(
      "使い方: npx tsx scripts/midi/mid-to-tonejs.ts <input.mid> [-o out.json] [--title '曲名'] [--artist 名義] [--license 'CC BY 4.0'] [--quantize 1/16] [--bars N] [--loop-bars N] [--name '808=drums'] [--percussion 808] [--trim-clip-overlap]",
    );
  }
  return {
    input,
    output: options.output ?? input.replace(/\.midi?$/i, ".json"),
    title: options.title,
    artist: options.artist,
    license: options.license,
    quantize: options.quantize,
    lengthBars: options.lengthBars,
    loopBars: options.loopBars,
    aliases: options.aliases,
    percussionSources: options.percussionSources,
    trimClipOverlap: options.trimClipOverlap,
    verifyOnly: options.verifyOnly,
  };
};

const main = (): void => {
  const cli = parseArgs(process.argv.slice(2));
  const data = readFileSync(cli.input);
  const midi = new Midi(data);
  const raw = readRawTracks(data);

  const song = convertToToneSong(midi, raw.tracks, {
    title: cli.title ?? basename(cli.input, extname(cli.input)),
    artist: cli.artist,
    license: cli.license,
    source: basename(cli.input),
    aliases: cli.aliases,
    quantize: cli.quantize,
    lengthBars: cli.lengthBars,
    loopBars: cli.loopBars,
    percussionSources: cli.percussionSources,
    trimClipOverlap: cli.trimClipOverlap,
  });

  const discarded = collectDiscardedEvents(raw.tracks);
  console.log(`入力: ${cli.input} (SMF format ${raw.format} / ${raw.tracks.length} tracks / ${song.ppq} ppq)`);
  console.log(
    `作品: ${song.title} / ${song.artist ?? "(制作者未指定)"} / ${song.license ?? "(ライセンス未指定)"}`,
  );
  if (!song.artist || !song.license) {
    console.warn("  注意: --artist と --license は CC BY 4.0 の帰属表示に必要です");
  }
  console.log(
    `テンポ: ${song.bpm} BPM  拍子: ${song.timeSignature.join("/")}  素材: ${song.lengthBars} 小節 (${song.durationSeconds}s)  ループ: ${song.loop.start} - ${song.loop.end}`,
  );
  console.log(`量子化: ${song.quantize ?? "なし(元のタイミングを保持)"}`);
  const midiNoteCount = midi.tracks.reduce((total, track) => total + track.notes.length, 0);
  const keptNoteCount = song.tracks.reduce((total, track) => total + track.noteCount, 0);
  console.log(
    `クリップの重なり: ${
      cli.trimClipOverlap
        ? `次のクリップへはみ出した ${midiNoteCount - keptNoteCount} 音を削除`
        : "そのまま(前のクリップの終止音が次の頭と重なる)"
    }`,
  );
  console.log("破棄したイベント:");
  console.log(`  Program Change: ${discarded.programChanges}`);
  console.log(
    `  Control Change: ${
      discarded.controlChanges.length === 0
        ? "0"
        : discarded.controlChanges.map((cc) => `CC${cc.number} x${cc.count}`).join(", ")
    }`,
  );
  song.tracks.forEach((track) => {
    const kind = track.isPercussion
      ? `GM パーカッション(${Object.keys(track.drumMap ?? {}).length} 音色)`
      : "音程あり";
    console.log(`  トラック ${track.name} <- "${track.sourceName}" : ${track.noteCount} notes / ${kind}`);
  });
  percussionCandidates(midi, raw.tracks)
    .filter((source) => !cli.percussionSources.includes(source))
    .forEach((source) => {
      console.warn(`  注意: "${source}" は全音高が GM パーカッション域です。--percussion '${source}' の指定漏れかもしれません`);
    });

  const issues = verifyToneSong(song, midi, raw.tracks);
  if (issues.length > 0) {
    console.error(`検証に失敗しました (${issues.length} 件):`);
    issues.slice(0, 10).forEach((issue) => console.error(`  - ${issue}`));
    process.exitCode = 1;
    return;
  }
  console.log("検証: MIDI のノートと JSON が1対1で一致しました");

  if (cli.verifyOnly) return;
  mkdirSync(dirname(cli.output), { recursive: true });
  writeFileSync(cli.output, `${JSON.stringify(song, null, 2)}\n`);
  console.log(`出力: ${cli.output}`);
};

main();
