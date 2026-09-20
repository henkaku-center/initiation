// ABOUTME: チェックインに添える一言(Signal)の受け取り方を定義する。
// ABOUTME: 空は「一言なし」として扱い、消す操作もこの経路で表す(Issue #119)。

/**
 * 一言は本人の履歴に並ぶものなので、Initiationの自由記述(2000文字)より短くする。
 * 「いま何が動いているか」を1つ書ける長さを目安にしている。
 */
export const CHECKIN_NOTE_MAX_LENGTH = 200;

export type CheckinNoteResult =
  | { ok: true; note: string | null }
  | { ok: false; error: string };

/** 前後の空白を除いた一言。空なら null(一言なし)、長すぎる場合は拒否する。 */
export function readCheckinNote(input: string): CheckinNoteResult {
  const note = input.trim();
  if (note.length > CHECKIN_NOTE_MAX_LENGTH) {
    return { ok: false, error: `一言は${CHECKIN_NOTE_MAX_LENGTH}文字までです` };
  }
  return { ok: true, note: note === "" ? null : note };
}
