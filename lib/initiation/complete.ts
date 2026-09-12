// ABOUTME: Initiationの全ステップ完走判定を提供する。
// ABOUTME: Server Actionに依存しない純粋関数として画面と申請条件から共有する。
import { initiationSteps } from "./content";
import { journeySteps, readJourneyAnswer } from "./journey";
import type { ProgressEntry } from "@/lib/domain/types";

export function isInitiationComplete(entries: ProgressEntry[]): boolean {
  const done = new Set(entries.map((entry) => entry.stepId));
  // Retain already-earned qualification without importing legacy answers into this questionnaire.
  return initiationSteps.every((step) => done.has(step.id)) || isJourneyComplete(entries);
}

export function isJourneyComplete(entries: ProgressEntry[]): boolean {
  const byId = new Map(entries.map((entry) => [entry.stepId, entry.answer]));
  return journeySteps.every((step) => readJourneyAnswer(step.id, byId.get(step.id)) !== null);
}
