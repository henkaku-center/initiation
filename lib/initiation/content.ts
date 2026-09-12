// ABOUTME: Retain the four legacy question IDs for existing completion records.
// ABOUTME: Current questions and accepted save inputs are defined in journey.ts.

export type InitiationStep =
  | { id: string; kind: "question"; title: string; prompt: string }
  | { id: string; kind: "quest"; title: string; description: string };

export const initiationSteps: InitiationStep[] = [
  {
    id: "q-introduction",
    kind: "question",
    title: "自己紹介",
    prompt: "HENKAKUで何をしてみたいですか？一言で教えてください。",
  },
  {
    id: "q-how-found",
    kind: "question",
    title: "きっかけ",
    prompt: "HENKAKUをどこで知りましたか？",
  },
  {
    id: "quest-wallet-setup",
    kind: "quest",
    title: "ウォレットの準備",
    description: "/setupでウォレット接続・Polygon切り替え・HENKAKUトークン追加を済ませよう。",
  },
  {
    id: "quest-discord-hello",
    kind: "quest",
    title: "あいさつ",
    description: "Discordの自己紹介チャンネルであいさつしよう。",
  },
];

export function findStep(stepId: string): InitiationStep | undefined {
  return initiationSteps.find((step) => step.id === stepId);
}
