// ABOUTME: tick と Tone.js の "bars:beats:sixteenths" 表記を相互変換する純粋関数群。
// ABOUTME: beat は四分音符固定で、Tone.js の Transport.timeSignature と同じ数え方に揃える。

export type TimeSignature = readonly [numerator: number, denominator: number];

/** Tone.js の Transport.timeSignature に渡す値(1小節あたりの四分音符の数)。 */
export const beatsPerBar = ([numerator, denominator]: TimeSignature): number =>
  (numerator * 4) / denominator;

export const ticksPerBar = (ppq: number, timeSignature: TimeSignature): number =>
  ppq * beatsPerBar(timeSignature);

const SIXTEENTHS_PER_BEAT = 4;
const SIXTEENTH_DECIMALS = 6;

const roundSixteenths = (value: number): number =>
  Number(value.toFixed(SIXTEENTH_DECIMALS));

/** tick を Tone.js が解釈する "bars:beats:sixteenths" 文字列にする。 */
export const ticksToBarsBeatsSixteenths = (
  ticks: number,
  ppq: number,
  timeSignature: TimeSignature,
): string => {
  const barTicks = ticksPerBar(ppq, timeSignature);
  const bars = Math.floor(ticks / barTicks);
  const withinBar = ticks - bars * barTicks;
  const beats = Math.floor(withinBar / ppq);
  const sixteenths = roundSixteenths(
    ((withinBar - beats * ppq) / ppq) * SIXTEENTHS_PER_BEAT,
  );
  return `${bars}:${beats}:${sixteenths}`;
};

/** ticksToBarsBeatsSixteenths の逆変換。JSON を検証するために使う。 */
export const barsBeatsSixteenthsToTicks = (
  value: string,
  ppq: number,
  timeSignature: TimeSignature,
): number => {
  const parts = value.split(":").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`bars:beats:sixteenths として解釈できません: ${value}`);
  }
  const [bars, beats, sixteenths] = parts;
  const ticks =
    bars * ticksPerBar(ppq, timeSignature) +
    beats * ppq +
    (sixteenths * ppq) / SIXTEENTHS_PER_BEAT;
  return Math.round(ticks);
};

/** "1/16" のような分割表記を tick 数にする。 */
export const divisionToTicks = (division: string, ppq: number): number => {
  const match = /^1\/(\d+)(t)?$/.exec(division);
  if (!match) {
    throw new Error(`分割表記は 1/4, 1/16, 1/8t の形式で指定してください: ${division}`);
  }
  const straight = (ppq * 4) / Number(match[1]);
  return match[2] ? (straight * 2) / 3 : straight;
};

export const quantizeTicks = (ticks: number, gridTicks: number): number =>
  Math.round(ticks / gridTicks) * gridTicks;
