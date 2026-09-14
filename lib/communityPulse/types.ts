export const PULSE_LABEL = "community-pulse";
export const PULSE_LIMIT = 6;
export const PULSE_REVALIDATE_SECONDS = 3600;
export const PULSE_SOURCE_URL = "https://github.com/henkaku-center/initiation/issues?q=is%3Aissue+is%3Aopen+label%3Acommunity-pulse";

export type PulseIssue = {
  number: number;
  title: string;
  url: string;
  updatedAt: string;
};
export type PulseSnapshot = { issues: PulseIssue[]; lastSuccessAt: string };
export type PulseResponse = {
  status: "fresh" | "stale" | "unavailable";
  issues: PulseIssue[];
  lastSuccessAt: string | null;
  sourceUrl: string;
};
