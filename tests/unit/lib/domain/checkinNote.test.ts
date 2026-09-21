// ABOUTME: チェックインに添える一言の受け取り方を固定する。
// ABOUTME: 空は「一言なし」、長すぎる入力は保存前に拒否する(Issue #119)。
import { describe, expect, it } from "vitest";
import { CHECKIN_NOTE_MAX_LENGTH, readCheckinNote } from "@/lib/domain/checkinNote";

describe("readCheckinNote", () => {
  it("keeps the agreed length", () => {
    // Fieldのカードに省略せず出せる長さとして140文字で合意した(#46 / Issue #119)。
    expect(CHECKIN_NOTE_MAX_LENGTH).toBe(140);
  });

  it("removes surrounding whitespace", () => {
    expect(readCheckinNote("  Tone.jsで音を鳴らした  ")).toEqual({ ok: true, note: "Tone.jsで音を鳴らした" });
  });

  it.each(["", "   ", "\n\t"])("reads a blank input (%j) as no note so it can be cleared", (input) => {
    expect(readCheckinNote(input)).toEqual({ ok: true, note: null });
  });

  it("accepts a note at the limit", () => {
    const result = readCheckinNote("あ".repeat(CHECKIN_NOTE_MAX_LENGTH));
    expect(result).toEqual({ ok: true, note: "あ".repeat(CHECKIN_NOTE_MAX_LENGTH) });
  });

  it("rejects a note beyond the limit", () => {
    const result = readCheckinNote("あ".repeat(CHECKIN_NOTE_MAX_LENGTH + 1));
    expect(result.ok).toBe(false);
  });

  it("measures the limit after trimming so padding alone never rejects", () => {
    expect(readCheckinNote(`  ${"あ".repeat(CHECKIN_NOTE_MAX_LENGTH)}  `).ok).toBe(true);
  });

  it("keeps line breaks inside the note", () => {
    expect(readCheckinNote("一行目\n二行目")).toEqual({ ok: true, note: "一行目\n二行目" });
  });
});
