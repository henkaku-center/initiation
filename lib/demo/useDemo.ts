"use client";
import { useSyncExternalStore } from "react";
import {
  createDemoState,
  demoReducer,
  DEMO_STORAGE_KEY,
  restoreDemoState,
  type DemoAction,
} from "./state";

const initial = { state: createDemoState(), persistent: true };
let current = initial;
let loaded = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function load() {
  try {
    current = {
      state: restoreDemoState(localStorage.getItem(DEMO_STORAGE_KEY)),
      persistent: true,
    };
  } catch {
    current = { ...current, persistent: false };
  }
}
function storageChanged(event: StorageEvent) {
  if (event.key === DEMO_STORAGE_KEY || event.key === null) {
    load();
    notify();
  }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) {
    loaded = true;
    load();
  }
  if (listeners.size === 1) window.addEventListener("storage", storageChanged);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", storageChanged);
  };
}
export function dispatchDemo(action: DemoAction) {
  const state = demoReducer(current.state, action);
  let persistent = true;
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch {
    persistent = false;
  }
  current = { state, persistent };
  notify();
}
export function useDemo() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => initial,
  );
}

export const screens = [
  "home",
  "setup",
  "journey",
  "passport",
  "community",
] as const;
export type DemoScreen = (typeof screens)[number];
function readScreen(): DemoScreen {
  const value = window.location.hash.slice(1);
  return screens.includes(value as DemoScreen) ? (value as DemoScreen) : "home";
}
function subscribeScreen(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}
export function useDemoScreen() {
  return useSyncExternalStore(
    subscribeScreen,
    readScreen,
    () => "home" as DemoScreen,
  );
}
export function navigateDemo(screen: DemoScreen) {
  window.location.hash = screen;
  window.scrollTo({ top: 0, behavior: "instant" });
}
