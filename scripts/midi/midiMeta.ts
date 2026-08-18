// ABOUTME: SMF のバイト列を直接読み、@tonejs/midi が落とす情報(楽器名メタ・Program Change)を拾う。
// ABOUTME: 変換には使わず、トラックの命名と「何を捨てたか」の集計だけに使う。

export type RawTrackMeta = {
  readonly index: number;
  readonly trackName: string | null;
  readonly instrumentName: string | null;
  readonly noteOnCount: number;
  readonly programChangeCount: number;
  readonly controlChanges: ReadonlyArray<{ number: number; count: number }>;
};

const META_TRACK_NAME = 0x03;
const META_INSTRUMENT_NAME = 0x04;
const META_END_OF_TRACK = 0x2f;

class Cursor {
  constructor(
    private readonly buffer: Buffer,
    public position = 0,
  ) {}

  readAscii(length: number): string {
    const value = this.buffer.toString("ascii", this.position, this.position + length);
    this.position += length;
    return value;
  }

  readUInt32(): number {
    const value = this.buffer.readUInt32BE(this.position);
    this.position += 4;
    return value;
  }

  readUInt16(): number {
    const value = this.buffer.readUInt16BE(this.position);
    this.position += 2;
    return value;
  }

  readUInt8(): number {
    return this.buffer[this.position++];
  }

  peekUInt8(): number {
    return this.buffer[this.position];
  }

  readVariableLength(): number {
    let value = 0;
    let byte: number;
    do {
      byte = this.readUInt8();
      value = (value << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    return value;
  }

  readString(length: number): string {
    const value = this.buffer.toString("utf8", this.position, this.position + length);
    this.position += length;
    return value;
  }

  skip(length: number): void {
    this.position += length;
  }
}

const readTrack = (cursor: Cursor, index: number): RawTrackMeta => {
  const chunkType = cursor.readAscii(4);
  const length = cursor.readUInt32();
  const end = cursor.position + length;
  if (chunkType !== "MTrk") {
    cursor.position = end;
    throw new Error(`MTrk 以外のチャンクを検出しました: ${chunkType}`);
  }

  let trackName: string | null = null;
  let instrumentName: string | null = null;
  let noteOnCount = 0;
  let programChangeCount = 0;
  const controlChanges = new Map<number, number>();
  let runningStatus = 0;

  while (cursor.position < end) {
    cursor.readVariableLength(); // delta time
    let status = cursor.peekUInt8();
    if (status & 0x80) {
      cursor.readUInt8();
      runningStatus = status;
    } else {
      status = runningStatus;
    }

    if (status === 0xff) {
      const type = cursor.readUInt8();
      const dataLength = cursor.readVariableLength();
      const text = cursor.readString(dataLength);
      if (type === META_TRACK_NAME) trackName = text;
      if (type === META_INSTRUMENT_NAME) instrumentName = text;
      if (type === META_END_OF_TRACK) break;
      continue;
    }

    if (status === 0xf0 || status === 0xf7) {
      cursor.skip(cursor.readVariableLength());
      continue;
    }

    const kind = status & 0xf0;
    if (kind === 0xc0 || kind === 0xd0) {
      cursor.skip(1);
      if (kind === 0xc0) programChangeCount += 1;
      continue;
    }
    const controller = kind === 0xb0 ? cursor.peekUInt8() : null;
    const first = cursor.readUInt8();
    const second = cursor.readUInt8();
    if (controller !== null) {
      controlChanges.set(controller, (controlChanges.get(controller) ?? 0) + 1);
    }
    if (kind === 0x90 && second > 0) noteOnCount += 1;
    void first;
  }

  cursor.position = end;
  return {
    index,
    trackName,
    instrumentName,
    noteOnCount,
    programChangeCount,
    controlChanges: [...controlChanges].map(([number, count]) => ({ number, count })),
  };
};

/** SMF のヘッダとトラックごとのメタ情報を読み出す。 */
export const readRawTracks = (
  data: Buffer,
): { ppq: number; format: number; tracks: RawTrackMeta[] } => {
  const cursor = new Cursor(data);
  if (cursor.readAscii(4) !== "MThd") {
    throw new Error("MThd で始まっていません。SMF ではない可能性があります");
  }
  const headerLength = cursor.readUInt32();
  const headerEnd = cursor.position + headerLength;
  const format = cursor.readUInt16();
  const trackCount = cursor.readUInt16();
  const division = cursor.readUInt16();
  cursor.position = headerEnd;
  if (division & 0x8000) {
    throw new Error("SMPTE ベースの division には未対応です");
  }

  const tracks = Array.from({ length: trackCount }, (_, index) => readTrack(cursor, index));
  return { ppq: division, format, tracks };
};
