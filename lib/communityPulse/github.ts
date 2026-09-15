// Server-side GitHub transport. Cache the complete validated snapshot in server.ts.
import { PULSE_LABEL, PULSE_LIMIT, type PulseIssue, type PulseSnapshot } from "./types";

const API = "https://api.github.com/repos/henkaku-center/initiation/issues";
const PAGE_SIZE = 100;
const FILTERS = { state: "open", labels: PULSE_LABEL, sort: "updated", direction: "desc", per_page: String(PAGE_SIZE) };
const MAX_PAGES = 5;
const RETRY_MS = 60_000;

export class PulseFetchError extends Error {
  constructor(readonly retryAt: number) {
    // Never include the upstream response, request headers, or token in errors/logs.
    super("Community Pulse is temporarily unavailable");
    this.name = "PulseFetchError";
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function selectIssue(value: unknown): PulseIssue | null {
  if (!object(value)) throw new Error("Invalid issue");
  if ("pull_request" in value || value.state !== "open") return null;
  if (!Array.isArray(value.labels)) throw new Error("Invalid labels");
  if (!value.labels.some((label) => {
    const name = object(label) ? label.name : label;
    return typeof name === "string" && name.toLowerCase() === PULSE_LABEL;
  })) return null;
  const { number, title, html_url: url, updated_at: updatedAt } = value;
  if (typeof number !== "number" || !Number.isSafeInteger(number) || number <= 0
    || typeof title !== "string" || !title.trim()
    || url !== `https://github.com/henkaku-center/initiation/issues/${number}`
    || typeof updatedAt !== "string" || !Number.isFinite(Date.parse(updatedAt))) throw new Error("Invalid issue fields");
  return { number, title, url, updatedAt: new Date(updatedAt).toISOString() };
}

function retryTime(response: Response, now: number): number {
  const retryAfter = response.headers.get("retry-after");
  const retryAt = retryAfter === null ? 0 : /^\d+$/.test(retryAfter) ? now + Number(retryAfter) * 1000 : Date.parse(retryAfter);
  const reset = response.headers.get("x-ratelimit-remaining") === "0" ? Number(response.headers.get("x-ratelimit-reset")) * 1000 : 0;
  return Math.max(now + RETRY_MS, Number.isFinite(retryAt) ? retryAt : 0, Number.isFinite(reset) ? reset : 0);
}

export function createPulseFetcher({
  fetch: request = (url, init) => fetch(url, init),
  now = Date.now,
  token = () => process.env.COMMUNITY_PULSE_GITHUB_TOKEN,
}: { fetch?: (url: string, init: RequestInit) => Promise<Response>; now?: () => number; token?: () => string | undefined } = {}) {
  let inFlight: Promise<PulseSnapshot> | undefined;
  let retryAt = 0;

  async function read(): Promise<PulseSnapshot> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10",
      "User-Agent": "henkaku-initiation-community-pulse",
    };
    const credential = token();
    if (credential) headers.Authorization = `Bearer ${credential}`;
    const signal = AbortSignal.timeout(8000);
    const issues = new Map<number, PulseIssue>();
    for (let page = 1; page <= MAX_PAGES; page++) {
      // GitHub Link URLs may use numeric repository IDs and cursors. Construct
      // page URLs ourselves so credentials always stay on the fixed endpoint.
      const url = `${API}?${new URLSearchParams({ ...FILTERS, page: String(page) })}`;
      const response = await request(url, { headers, signal, cache: "no-store", redirect: "error" });
      if (!response.ok) throw new PulseFetchError(retryTime(response, now()));
      const values: unknown = await response.json();
      if (!Array.isArray(values) || values.length > PAGE_SIZE) throw new Error("Invalid issue list");
      for (const value of values) {
        const issue = selectIssue(value);
        if (issue && !issues.has(issue.number)) issues.set(issue.number, issue);
      }
      if (issues.size >= PULSE_LIMIT || values.length < PAGE_SIZE) break;
      if (page === MAX_PAGES) throw new Error("Pagination limit");
    }
    return {
      issues: [...issues.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.number - a.number).slice(0, PULSE_LIMIT),
      lastSuccessAt: new Date(now()).toISOString(),
    };
  }

  return function load(): Promise<PulseSnapshot> {
    if (inFlight) return inFlight;
    if (now() < retryAt) return Promise.reject(new PulseFetchError(retryAt));
    inFlight = read().catch((error: unknown) => {
      retryAt = error instanceof PulseFetchError ? error.retryAt : now() + RETRY_MS;
      throw new PulseFetchError(retryAt);
    }).finally(() => { inFlight = undefined; });
    return inFlight;
  };
}
