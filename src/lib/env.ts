// Environment configuration utility
// Reads from process.env - ensure .env.local is properly configured

const ENV_KEYS = {
  GOOGLE_GENERATIVE_AI_API_KEY: "GOOGLE_GENERATIVE_AI_API_KEY",
  BRIA_MCP_URL: "BRIA_MCP_URL",
  BRIA_MCP_API_TOKEN: "BRIA_MCP_API_TOKEN",
} as const;

export type EnvKey = keyof typeof ENV_KEYS;

/**
 * Get environment variable value
 * Throws error if required key is missing
 */
export function getEnv(key: EnvKey): string {
  const value = process.env[key];
  
  if (!value) {
    throw new Error(
      `Environment variable ${key} is not set. Please check your .env.local file.`
    );
  }
  
  return value;
}

/**
 * Check if environment variable exists
 */
export function hasEnv(key: EnvKey): boolean {
  return !!process.env[key];
}

