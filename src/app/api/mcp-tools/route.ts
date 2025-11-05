import { NextRequest, NextResponse } from "next/server";
import { getMCPClient } from "@/lib/mcp-client";

export async function GET() {
  try {
    const mcpClient = getMCPClient();

    // Connect if not already connected
    if (!mcpClient.isConnected()) {
      await mcpClient.connect();
    }

    // Get available tools
    const tools = mcpClient.getTools();

    return NextResponse.json({ tools });
  } catch (error) {
    console.error("Error listing MCP tools:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list tools" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { toolName, args } = await request.json();

    if (!toolName) {
      return NextResponse.json({ error: "Tool name is required" }, { status: 400 });
    }

    const mcpClient = getMCPClient();

    // Connect if not already connected
    if (!mcpClient.isConnected()) {
      await mcpClient.connect();
    }

    // Execute tool
    const result = await mcpClient.callTool(toolName, args || {});

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error calling MCP tool:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tool execution failed" },
      { status: 500 }
    );
  }
}

