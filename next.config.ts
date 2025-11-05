import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Hardcode environment variables for development (replace with your actual values in production)
  env: {
    GOOGLE_GENERATIVE_AI_API_KEY: "AIzaSyDlF9DPrN9JKLzhjt66VwwDe7w4Z9xPKFs",
    BRIA_MCP_URL: "https://mcp.prod.bria-api.com/mcp",
    BRIA_MCP_API_TOKEN: "32864e2cd5894c61862efe93d4de311c",
  },
};

export default nextConfig;
