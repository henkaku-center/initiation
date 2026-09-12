import { PortalDemo } from "@/components/demo/PortalDemo";
import { PortalHome } from "@/components/portal/PortalHome";

export default function Home() {
  if (process.env.HENKAKU_DEMO_ONLY === "1") return <PortalDemo />;
  return <PortalHome />;
}
