import { NextResponse } from "next/server";
import { ENV, getEnv } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    // Check process.env first
    processEnv: {
      hasGoogleKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      hasMcpUrl: !!process.env.BRIA_MCP_URL,
      hasMcpToken: !!process.env.BRIA_MCP_API_TOKEN,
    },
    // Check hardcoded config
    hardcodedConfig: {
      hasGoogleKey: !!ENV.GOOGLE_GENERATIVE_AI_API_KEY,
      hasMcpUrl: !!ENV.BRIA_MCP_URL,
      hasMcpToken: !!ENV.BRIA_MCP_API_TOKEN,
      mcpUrl: ENV.BRIA_MCP_URL,
      tokenLength: ENV.BRIA_MCP_API_TOKEN.length,
    },
    // Check final values used
    finalValues: {
      googleKeyLength: getEnv("GOOGLE_GENERATIVE_AI_API_KEY").length,
      mcpUrl: getEnv("BRIA_MCP_URL"),
      mcpTokenLength: getEnv("BRIA_MCP_API_TOKEN").length,
    },
  });
}

