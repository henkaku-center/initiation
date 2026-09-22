// ABOUTME: Messages between the portal and the intro frame it embeds.
// ABOUTME: The intro keeps its anchors' own navigation until the portal says it is listening (Issue #123).
export const INTRO_READY_MESSAGE = "henkaku:intro:ready";
export const INTRO_LISTENING_MESSAGE = "henkaku:intro:listening";

type FrameWindow = { postMessage: (message: unknown, targetOrigin: string) => void } | null | undefined;
type FrameMessage = { source: unknown; origin: string; data?: { type?: unknown } | null };

/** Tell the intro frame the portal now routes its links. Before this it navigates like a plain page. */
export function tellIntroListening(frame: FrameWindow, origin: string) {
  frame?.postMessage({ type: INTRO_LISTENING_MESSAGE }, origin);
}

/** Whether a message is the intro frame asking if the portal is listening. */
export function isIntroReady(event: FrameMessage, frame: unknown, origin: string) {
  return event.origin === origin && frame != null && event.source === frame && event.data?.type === INTRO_READY_MESSAGE;
}
