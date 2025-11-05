// Environment configuration
// Since .env.local isn't being loaded on your system, we're using hardcoded values for development

export const ENV = {
  GOOGLE_GENERATIVE_AI_API_KEY: "AIzaSyDlF9DPrN9JKLzhjt66VwwDe7w4Z9xPKFs",
  BRIA_MCP_URL: "https://mcp.prod.bria-api.com/mcp",
  BRIA_MCP_API_TOKEN: "32864e2cd5894c61862efe93d4de311c",
};

// Helper to get environment variable with fallback
export function getEnv(key: keyof typeof ENV): string {
  return process.env[key] || ENV[key];
}

