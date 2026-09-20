// ABOUTME: Discord名の正規化が、実在確認をせずに保存できる形だけを判定することを固定する。
// ABOUTME: 表記ゆれを受け入れるのは、突き合わせるのが承認時の運営だからである(Issue #117)。
import { describe, expect, it } from "vitest";
import { DISCORD_USERNAME_MAX_LENGTH, normalizeDiscordUsername } from "@/lib/domain/discordUsername";

describe("normalizeDiscordUsername", () => {
  it("removes surrounding whitespace", () => {
    expect(normalizeDiscordUsername("  traveler  ")).toBe("traveler");
  });

  it.each(["@traveler", "traveler#1234", "たびびと", "traveler_01"])("keeps %s as written", (input) => {
    expect(normalizeDiscordUsername(input)).toBe(input);
  });

  it.each(["", "   ", "\n\t"])("rejects a blank name (%j)", (input) => {
    expect(normalizeDiscordUsername(input)).toBeNull();
  });

  it("accepts a name at the stored limit and rejects one beyond it", () => {
    expect(normalizeDiscordUsername("a".repeat(DISCORD_USERNAME_MAX_LENGTH))).toHaveLength(DISCORD_USERNAME_MAX_LENGTH);
    expect(normalizeDiscordUsername("a".repeat(DISCORD_USERNAME_MAX_LENGTH + 1))).toBeNull();
  });

  it("measures the limit after trimming so padding alone never rejects", () => {
    expect(normalizeDiscordUsername(`  ${"a".repeat(DISCORD_USERNAME_MAX_LENGTH)}  `)).toHaveLength(DISCORD_USERNAME_MAX_LENGTH);
  });
});
