"use client";

import { setTheme, useTheme } from "@/lib/useTheme";

export function ThemeToggle() {
  const theme = useTheme();
  return (
    <div className="theme-toggle" role="group" aria-label="画面の配色">
      <button type="button" aria-label="ライトモード" aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
        ライト
      </button>
      <button type="button" aria-label="ダークモード" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" /></svg>
        ダーク
      </button>
    </div>
  );
}
