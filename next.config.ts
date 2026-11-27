import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  redirects() {
    // Browsers retain the fragment, which PortalHome maps to the normal route.
    return [{ source: "/demo", destination: "/", permanent: true }];
  },
};

export default nextConfig;
