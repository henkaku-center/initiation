// ABOUTME: Map portal screens to the application's stable URLs.
// ABOUTME: Old demo fragments are navigation hints only, never member state.
export const portalRoutes = {
  home: "/",
  setup: "/setup",
  journey: "/initiation",
  community: "/community",
  passport: "/passport",
} as const;

export type PortalScreen = keyof typeof portalRoutes;

export function legacyPortalDestination(hash: string): string | null {
  const screen = hash.slice(1);
  return screen !== "home" && Object.hasOwn(portalRoutes, screen)
    ? portalRoutes[screen as PortalScreen]
    : null;
}
