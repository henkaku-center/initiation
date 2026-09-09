import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only this nonsecret flag is embedded. Demo deployments need no service keys.
  env: { HENKAKU_DEMO_ONLY: process.env.HENKAKU_DEMO_ONLY === "1" ? "1" : "0" },
};

export default nextConfig;
