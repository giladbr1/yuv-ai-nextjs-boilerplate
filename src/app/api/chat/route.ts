import { NextRequest, NextResponse } from "next/server";
// IMPORTANT: Import env-init FIRST to ensure environment variables are loaded
import "@/lib/env-init";
import { getGeminiAgent } from "@/lib/gemini-agent";
import { getMCPClient } from "@/lib/mcp-client";

export async function POST(request: NextRequest) {
  try {
    const { message, currentParams } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Initialize services
    const agent = getGeminiAgent();
    const mcpClient = getMCPClient();

    // Connect to MCP if not already connected
    if (!mcpClient.isConnected()) {
      console.log("Chat API: Connecting to MCP...");
      await mcpClient.connect();
      console.log("Chat API: MCP connected");
    }

    // Initialize agent with MCP tools (dynamic discovery)
    // Agent will automatically learn tool schemas and map parameters
    const tools = mcpClient.getTools();
    console.log("Chat API: Discovered MCP tools:", tools.map(t => t.name));
    
    agent.initializeWithMCPTools(tools);

    // Send message to agent with current UI parameters
    // Agent will dynamically select correct tool and map params
    const response = await agent.sendMessage(message, currentParams);

    // If the agent called tools, execute them via MCP
    if (response.toolCalls && response.toolCalls.length > 0) {
      console.log("Chat API: Agent requested tool calls:", response.toolCalls);
      
      const toolResults = [];
      for (const toolCall of response.toolCalls) {
        try {
          console.log(`\n[Chat API] ===== Executing MCP tool: ${toolCall.name} =====`);
          console.log(`[Chat API] Tool args:`, JSON.stringify(toolCall.args, null, 2));
          console.log(`[Chat API] Timestamp:`, new Date().toISOString());
          
          // Execute the MCP tool and wait for result
          const result = await mcpClient.callTool(toolCall.name, toolCall.args);
          console.log(`[Chat API] Tool ${toolCall.name} SUCCESS`);
          console.log(`[Chat API] Raw result:`, JSON.stringify(result).substring(0, 500));
          
          // Extract image URL or data from result
          let mediaUrl = "";
          let mediaType = "image";
          
          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            console.log(`Chat API: Content type: ${content.type}, mimeType: ${content.mimeType}`);
            
            // Check for image data
            if (content.type === "image" || content.mimeType?.startsWith("image/")) {
              const imageData = content.data || content.text || "";
              
              // If it's base64 data without the data URL prefix, add it
              if (imageData && !imageData.startsWith("data:")) {
                const mimeType = content.mimeType || "image/jpeg";
                mediaUrl = `data:${mimeType};base64,${imageData}`;
                console.log(`Chat API: Converted base64 to data URL (${mimeType})`);
              } else {
                mediaUrl = imageData;
              }
            } else if (content.type === "text" && content.text) {
              // Some MCP servers return URL as text
              mediaUrl = content.text;
            }
          }
          
          console.log(`Chat API: Final media URL:`, mediaUrl.substring(0, 100));
          
          toolResults.push({
            name: toolCall.name,
            result,
            mediaUrl,
            mediaType,
          });
        } catch (err: any) {
          console.error(`\n[Chat API] ===== Tool ${toolCall.name} FAILED =====`);
          console.error(`[Chat API] Error message:`, err?.message || err);
          console.error(`[Chat API] Error code:`, err?.code);
          console.error(`[Chat API] Original error:`, err?.originalError);
          console.error(`[Chat API] Tool args were:`, JSON.stringify(toolCall.args, null, 2));
          console.error(`[Chat API] Full error object:`, JSON.stringify(err, Object.getOwnPropertyNames(err), 2).substring(0, 1000));
          
          toolResults.push({
            name: toolCall.name,
            error: err instanceof Error ? err.message : String(err),
            errorDetails: {
              code: err?.code,
              args: toolCall.args,
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      return NextResponse.json({
        ...response,
        toolResults,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

