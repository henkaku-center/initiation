"use client";
import { useSyncExternalStore } from "react";

export function tokyoDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    new Date(),
  );
}
function subscribe(listener: () => void) {
  const timer = setInterval(listener, 1000);
  window.addEventListener("focus", listener);
  return () => {
    clearInterval(timer);
    window.removeEventListener("focus", listener);
  };
}
// React only rerenders when the date string changes, including an overnight tab.
export function useTokyoDate() {
  return useSyncExternalStore(subscribe, tokyoDate, tokyoDate);
}
