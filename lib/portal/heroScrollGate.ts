// Match the assembly animation's 820px breakpoint.
export function heroScrollGateMs(isNarrowScreen: boolean): number {
  // Trim only the completed-kanji pause; keep assembly duration and zoom pacing intact.
  return isNarrowScreen ? 1460 : 810;
}
