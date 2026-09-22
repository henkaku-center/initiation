// ABOUTME: 申請者のDiscord名を受け取るときの正規化と長さ上限を定義する。
// ABOUTME: アプリはDiscordを見ないため実在確認はせず、書かれたまま保持する(Issue #117)。

/**
 * Discordのユーザー名は32文字までだが、ここでは `@name` / `name#1234` / 表示名の
 * 表記ゆれをそのまま受け取る。突き合わせるのは承認時の運営で、アプリではない。
 */
export const DISCORD_USERNAME_MAX_LENGTH = 64;

/** 保存できる形なら前後の空白を除いた文字列、空や長すぎる場合は null を返す。 */
export function normalizeDiscordUsername(input: string): string | null {
  const name = input.trim();
  if (name === "" || name.length > DISCORD_USERNAME_MAX_LENGTH) return null;
  return name;
}
