// ABOUTME: GM のパーカッションマップ。ドラムトラックの音高を音色名に対応づける。
// ABOUTME: このマップに載る音高は「音程」ではなく「どの打楽器か」を表す。

export const GM_PERCUSSION: Readonly<Record<number, string>> = {
  35: "acousticBassDrum",
  36: "bassDrum",
  37: "sideStick",
  38: "acousticSnare",
  39: "handClap",
  40: "electricSnare",
  41: "lowFloorTom",
  42: "closedHiHat",
  43: "highFloorTom",
  44: "pedalHiHat",
  45: "lowTom",
  46: "openHiHat",
  47: "lowMidTom",
  48: "hiMidTom",
  49: "crashCymbal1",
  50: "highTom",
  51: "rideCymbal1",
  52: "chineseCymbal",
  53: "rideBell",
  54: "tambourine",
  55: "splashCymbal",
  56: "cowbell",
  57: "crashCymbal2",
  58: "vibraslap",
  59: "rideCymbal2",
  60: "hiBongo",
  61: "lowBongo",
  62: "muteHiConga",
  63: "openHiConga",
  64: "lowConga",
  65: "highTimbale",
  66: "lowTimbale",
  67: "highAgogo",
  68: "lowAgogo",
  69: "cabasa",
  70: "maracas",
  71: "shortWhistle",
  72: "longWhistle",
  73: "shortGuiro",
  74: "longGuiro",
  75: "claves",
  76: "hiWoodBlock",
  77: "lowWoodBlock",
  78: "muteCuica",
  79: "openCuica",
  80: "muteTriangle",
  81: "openTriangle",
};

const GM_RANGE = { min: 35, max: 81 } as const;
/** バスドラムからライドまで。一般的なドラムパターンはこの範囲に収まる。 */
const CORE_KIT_RANGE = { min: 35, max: 51 } as const;

export const isGmPercussionPitch = (midiNote: number): boolean =>
  midiNote >= GM_RANGE.min && midiNote <= GM_RANGE.max && midiNote in GM_PERCUSSION;

/**
 * ドラムトラックらしさの判定。GM の全域(35-81)はメロディの音域と重なるため、
 * 誤検出を避けてコアキットの範囲に限定し、音色数の下限も設ける。
 */
export const looksLikeDrumKit = (midiNotes: readonly number[]): boolean => {
  if (midiNotes.length === 0) return false;
  const inRange = midiNotes.every(
    (note) => note >= CORE_KIT_RANGE.min && note <= CORE_KIT_RANGE.max,
  );
  return inRange && new Set(midiNotes).size >= 3;
};

/** 使われている音高だけを含む、音名 -> 打楽器名の対応表を作る。 */
export const percussionMapFor = (
  notes: ReadonlyArray<{ midi: number; name: string }>,
): Record<string, string> => {
  const map: Record<string, string> = {};
  notes.forEach((note) => {
    const instrument = GM_PERCUSSION[note.midi];
    if (instrument) map[note.name] = instrument;
  });
  return Object.fromEntries(
    Object.entries(map).sort(([a], [b]) => a.localeCompare(b)),
  );
};
