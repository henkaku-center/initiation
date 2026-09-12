// ABOUTME: Display the adopted Gateway artwork within the authenticated application's shell.
// ABOUTME: Navigation uses normal routes and never restores the demo's member state.
"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ReferenceGateway } from "@/components/demo/ReferenceGatewayView";
import { legacyPortalDestination, portalRoutes, type PortalScreen } from "@/lib/portal/navigation";

export function PortalHome() {
  const router = useRouter();
  const navigate = useCallback((screen: PortalScreen) => {
    if (screen !== "home") router.push(portalRoutes[screen]);
  }, [router]);
  useEffect(() => {
    const followBookmark = () => {
      const destination = legacyPortalDestination(window.location.hash);
      if (destination) router.replace(destination);
    };
    followBookmark();
    window.addEventListener("hashchange", followBookmark);
    return () => window.removeEventListener("hashchange", followBookmark);
  }, [router]);
  return <main><ReferenceGateway paused={false} application onNavigate={navigate} /></main>;
}
