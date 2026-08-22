// ABOUTME: 変換後の JSON をそのまま音にするための、確認用の簡易シンセと WAV エンコーダ。
// ABOUTME: 音色を再現するものではなく、音程・タイミング・長さが合っているかを聴いて確かめるために使う。

import type { ToneSong, ToneTrack } from "./midiToTone";
import { barsBeatsSixteenthsToTicks } from "./musicalTime";

export const DEFAULT_SAMPLE_RATE = 44100;
const TAIL_SECONDS = 1;

type Voice = (
  buffer: Float32Array,
  sampleRate: number,
  startSample: number,
  durationSamples: number,
  frequency: number,
  velocity: number,
) => void;

const midiFromNoteName = (name: string): number => {
  const match = /^([A-G])(#|b)?(-?\d+)$/.exec(name);
  if (!match) throw new Error(`音名として解釈できません: ${name}`);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1]]!;
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  return base + accidental + (Number(match[3]) + 1) * 12;
};

export const frequencyOf = (noteName: string): number =>
  440 * 2 ** ((midiFromNoteName(noteName) - 69) / 12);

const addSample = (buffer: Float32Array, index: number, value: number): void => {
  if (index >= 0 && index < buffer.length) buffer[index] += value;
};

const pitchedVoice =
  (harmonics: readonly number[], gain: number): Voice =>
  (buffer, sampleRate, start, duration, frequency, velocity) => {
    const attack = Math.floor(sampleRate * 0.005);
    const release = Math.floor(sampleRate * 0.08);
    const total = duration + release;
    for (let i = 0; i < total; i += 1) {
      const envelope =
        i < attack ? i / attack : i < duration ? 1 - 0.4 * ((i - attack) / Math.max(duration, 1)) : (1 - (i - duration) / release) * 0.6;
      const t = i / sampleRate;
      let value = 0;
      harmonics.forEach((amplitude, index) => {
        value += amplitude * Math.sin(2 * Math.PI * frequency * (index + 1) * t);
      });
      addSample(buffer, start + i, value * envelope * velocity * gain);
    }
  };

const noiseVoice =
  (decaySeconds: number, gain: number): Voice =>
  (buffer, sampleRate, start, _duration, _frequency, velocity) => {
    const total = Math.floor(sampleRate * decaySeconds);
    let previous = 0;
    for (let i = 0; i < total; i += 1) {
      const noise = Math.random() * 2 - 1;
      const highPassed = noise - previous;
      previous = noise;
      const envelope = (1 - i / total) ** 2;
      addSample(buffer, start + i, highPassed * envelope * velocity * gain);
    }
  };

const drumVoice =
  (fromHz: number, toHz: number, decaySeconds: number, gain: number): Voice =>
  (buffer, sampleRate, start, _duration, _frequency, velocity) => {
    const total = Math.floor(sampleRate * decaySeconds);
    let phase = 0;
    for (let i = 0; i < total; i += 1) {
      const progress = i / total;
      const frequency = fromHz + (toHz - fromHz) * progress;
      phase += (2 * Math.PI * frequency) / sampleRate;
      const envelope = (1 - progress) ** 2;
      addSample(buffer, start + i, Math.sin(phase) * envelope * velocity * gain);
    }
  };

const PERCUSSION_VOICES: Record<string, Voice> = {
  bassDrum: drumVoice(120, 45, 0.35, 0.9),
  acousticBassDrum: drumVoice(120, 45, 0.35, 0.9),
  acousticSnare: noiseVoice(0.15, 0.5),
  electricSnare: noiseVoice(0.13, 0.5),
  sideStick: noiseVoice(0.05, 0.35),
  handClap: noiseVoice(0.12, 0.4),
  closedHiHat: noiseVoice(0.04, 0.25),
  pedalHiHat: noiseVoice(0.05, 0.2),
  openHiHat: noiseVoice(0.25, 0.22),
  crashCymbal1: noiseVoice(0.9, 0.22),
  crashCymbal2: noiseVoice(0.9, 0.22),
  rideCymbal1: noiseVoice(0.5, 0.18),
  rideCymbal2: noiseVoice(0.5, 0.18),
  lowFloorTom: drumVoice(180, 90, 0.3, 0.6),
  lowTom: drumVoice(220, 110, 0.3, 0.6),
};
const FALLBACK_PERCUSSION = noiseVoice(0.12, 0.35);

const TRACK_VOICES: Record<string, Voice> = {
  ePiano: pitchedVoice([0.6, 0.2, 0.08], 0.18),
  lead: pitchedVoice([0.5, 0.25, 0.12, 0.06], 0.16),
  bass: pitchedVoice([0.7, 0.15], 0.28),
};
const FALLBACK_PITCHED = pitchedVoice([0.6, 0.2], 0.18);

const voiceFor = (track: ToneTrack, noteName: string): Voice => {
  if (!track.isPercussion) return TRACK_VOICES[track.name] ?? FALLBACK_PITCHED;
  const instrument = track.drumMap?.[noteName];
  return (instrument && PERCUSSION_VOICES[instrument]) || FALLBACK_PERCUSSION;
};

/** 曲データを 1ch の PCM に描画する。ループはせず、素材の長さぶんだけ鳴らす。 */
export const renderSongToPcm = (
  song: ToneSong,
  sampleRate: number = DEFAULT_SAMPLE_RATE,
): Float32Array => {
  const timeSignature = song.timeSignature as readonly [number, number];
  const secondsPerTick = 60 / song.bpm / song.ppq;
  const buffer = new Float32Array(
    Math.ceil((song.durationSeconds + TAIL_SECONDS) * sampleRate),
  );

  song.tracks.forEach((track) => {
    track.events.forEach((event) => {
      const startTicks = barsBeatsSixteenthsToTicks(event.time, song.ppq, timeSignature);
      const durationTicks = barsBeatsSixteenthsToTicks(event.duration, song.ppq, timeSignature);
      voiceFor(track, event.note)(
        buffer,
        sampleRate,
        Math.round(startTicks * secondsPerTick * sampleRate),
        Math.max(1, Math.round(durationTicks * secondsPerTick * sampleRate)),
        track.isPercussion ? 0 : frequencyOf(event.note),
        event.velocity,
      );
    });
  });

  const peak = buffer.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
  if (peak > 1) {
    for (let i = 0; i < buffer.length; i += 1) buffer[i] /= peak;
  }
  return buffer;
};

/** 16bit モノラルの WAV バイト列にする。 */
export const encodeWav = (
  samples: Float32Array,
  sampleRate: number = DEFAULT_SAMPLE_RATE,
): Buffer => {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    data.writeInt16LE(Math.round(clamped * 32767), index * 2);
  });
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
};
