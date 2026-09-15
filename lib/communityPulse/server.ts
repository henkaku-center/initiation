import { unstable_cache } from "next/cache";
import { createPulseFetcher } from "./github";
import { PULSE_REVALIDATE_SECONDS } from "./types";

const fetchSnapshot = createPulseFetcher();

// Keep success time inside the cached value. Throwing on failure preserves the last success.
// Use the existing Data Cache model; enabling Cache Components would affect the whole app.
export const getPulseSnapshot = unstable_cache(
  () => fetchSnapshot(),
  ["community-pulse", "henkaku-center/initiation", "open-updated-6-v1"],
  { revalidate: PULSE_REVALIDATE_SECONDS },
);
