"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, type Theme } from "./theme";

const changeEvent = "henkaku:appearance-change";
function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    document.documentElement.dataset.theme = event.newValue === "dark" ? "dark" : "light";
    listener();
  };
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Keep the choice for this visit. */ }
  window.dispatchEvent(new Event(changeEvent));
}

export function useTheme() {
  return useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
}
