import { getPulseSnapshot } from "@/lib/communityPulse/server";
import { PulseFetchError } from "@/lib/communityPulse/github";
import { PULSE_REVALIDATE_SECONDS, type PulseResponse } from "@/lib/communityPulse/types";

// Run on requests while allowing the successful snapshot to use the Data Cache.
// force-dynamic would disable that cache; force-static would also cache the freshness flag.
export const revalidate = 0;

export async function GET() {
  try {
    const snapshot = await getPulseSnapshot();
    const body: PulseResponse = {
      ...snapshot,
      status: Date.now() - Date.parse(snapshot.lastSuccessAt) >= PULSE_REVALIDATE_SECONDS * 1000 ? "stale" : "fresh",
    };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const retryAfter = error instanceof PulseFetchError ? Math.max(1, Math.ceil((error.retryAt - Date.now()) / 1000)) : 60;
    const body: PulseResponse = { status: "unavailable", issues: [], lastSuccessAt: null };
    return Response.json(body, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": String(retryAfter) } });
  }
}
