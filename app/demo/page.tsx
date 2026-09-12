// ABOUTME: Keep the complete reference experience available in a dedicated demo route.
// ABOUTME: Demo controls only update the demo store, independently of member records.
import { PortalDemo } from "@/components/demo/PortalDemo";
export default function DemoPage() {
  return <PortalDemo applicationHref={process.env.HENKAKU_DEMO_ONLY === "1" ? undefined : "/"} />;
}
