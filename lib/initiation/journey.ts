// ABOUTME: Define the adopted journey questions and their versioned answer format.
// ABOUTME: Share validation between server saves, completion checks and answer restoration.
export const interestOptions = ["AI", "ART", "DAO", "MUSIC", "EDUCATION", "PODCAST", "PROJECTS", "EVENTS", "QUESTIONS"] as const;
export const contributionOptions = ["QUESTION", "EXPERIENCE", "IDEA", "CODE", "ART", "DESIGN", "CONNECTION", "CURIOSITY"] as const;
export const readinessOptions = ["はい、やってみたい！", "まだ迷っている", "今は静かに見たい"] as const;

export type JourneyStep = { id: string; title: string; note?: string } & (
  | { kind: "text"; placeholder: string }
  | { kind: "single" | "multiple"; options: readonly string[] }
);
export type JourneyAnswer = { status: "skipped" } | { status: "answered"; value: string | string[] };

export const journeySteps: JourneyStep[] = [
  { id: "v2-interests", kind: "multiple", title: "HENKAKUで、気になることは？", note: "いくつでも選べます。", options: interestOptions },
  { id: "v2-curiosity", kind: "text", title: "いま、気になっていることを教えてください。", note: "まだ輪郭のないアイデアでも。", placeholder: "たとえば、AIと音楽で何かつくってみたい。" },
  { id: "v2-experience", kind: "text", title: "誰かと一緒に、何かを動かした経験はありますか？", placeholder: "どんな小さなことでも、あなたの言葉で。" },
  { id: "v2-readiness", kind: "single", title: "HENKAKUで活動する準備は？", options: readinessOptions },
  { id: "v2-contribution", kind: "single", title: "この場所に、何を持っていきますか？", options: contributionOptions },
];

export function validateJourneyAnswer(stepId: string, input: unknown): JourneyAnswer | null {
  const step = journeySteps.find((item) => item.id === stepId);
  if (!step || !input || typeof input !== "object" || Array.isArray(input)) return null;
  const answer = input as Record<string, unknown>;
  const keys = Object.keys(answer);
  if (answer.status === "skipped" && keys.length === 1) return { status: "skipped" };
  if (answer.status !== "answered" || keys.length !== 2 || !keys.includes("value")) return null;
  const value = answer.value;
  if (step.kind === "multiple") {
    if (!Array.isArray(value) || !value.length || value.length > step.options.length
      || new Set(value).size !== value.length || !value.every((item) => typeof item === "string" && step.options.includes(item))) return null;
    return { status: "answered", value };
  }
  if (typeof value !== "string" || !value.trim() || value.length > 2000) return null;
  if (step.kind === "single" && !step.options.includes(value)) return null;
  return { status: "answered", value: value.trim() };
}

export function readJourneyAnswer(stepId: string, stored: string | null | undefined): JourneyAnswer | null {
  if (!stored) return null;
  try { return validateJourneyAnswer(stepId, JSON.parse(stored)); } catch { return null; }
}
