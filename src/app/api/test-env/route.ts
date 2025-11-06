import { NextResponse } from "next/server";
import { getEnv, hasEnv } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    // Check process.env first
    processEnv: {
      hasGoogleKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      hasMcpUrl: !!process.env.BRIA_MCP_URL,
      hasMcpToken: !!process.env.BRIA_MCP_API_TOKEN,
    },
    // Check if env vars exist
    envExists: {
      hasGoogleKey: hasEnv("GOOGLE_GENERATIVE_AI_API_KEY"),
      hasMcpUrl: hasEnv("BRIA_MCP_URL"),
      hasMcpToken: hasEnv("BRIA_MCP_API_TOKEN"),
    },
    // Check final values used
    finalValues: {
      googleKeyLength: hasEnv("GOOGLE_GENERATIVE_AI_API_KEY") ? getEnv("GOOGLE_GENERATIVE_AI_API_KEY").length : 0,
      mcpUrl: hasEnv("BRIA_MCP_URL") ? getEnv("BRIA_MCP_URL") : "not set",
      mcpTokenLength: hasEnv("BRIA_MCP_API_TOKEN") ? getEnv("BRIA_MCP_API_TOKEN").length : 0,
    },
  });
}

