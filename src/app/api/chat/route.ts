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
          
          // Extract image URL and structured prompt from result
          let mediaUrl = "";
          let imageUrl = ""; // MCP-provided URL for reuse
          let structuredPrompt = null;
          let mediaType = "image";
          
          if (result.content && result.content.length > 0) {
            // Check all content items
            for (const content of result.content) {
              if (content.type === "text" && content.text) {
                // Extract image URL from "for full image Preview use: [URL]" format (case-insensitive)
                const urlMatch = content.text.match(/for full image Preview use:\s*(https?:\/\/[^\s]+)/i);
                if (urlMatch && urlMatch[1]) {
                  imageUrl = urlMatch[1];
                  console.log(`Chat API: Extracted MCP image URL:`, imageUrl);
                }
                
                // Extract structured prompt (JSON string)
                // It's a complete JSON object, not embedded in text
                try {
                  // Try to parse the entire text as JSON
                  const parsed = JSON.parse(content.text);
                  if (parsed && typeof parsed === 'object' && 
                      (parsed.short_description || parsed.objects || parsed.aesthetics)) {
                    structuredPrompt = parsed;
                    console.log(`Chat API: Extracted structured prompt`);
                  }
                } catch (e) {
                  // Not JSON, continue
                }
              }
            }
            
            // Find image content for display
            const imageContent = result.content.find((c: any) => 
              c.type === "image" || c.mimeType?.startsWith("image/")
            );
            
            if (imageContent) {
              console.log(`Chat API: Content type: ${imageContent.type}, mimeType: ${imageContent.mimeType}`);
              
              // Prefer MCP URL, fall back to base64
              if (imageUrl) {
                mediaUrl = imageUrl;
                console.log(`Chat API: Using MCP URL (token-efficient)`);
              } else {
                // Fallback to base64
                const imageData = imageContent.data || imageContent.text || "";
                if (imageData && !imageData.startsWith("data:")) {
                  const mimeType = imageContent.mimeType || "image/jpeg";
                  mediaUrl = `data:${mimeType};base64,${imageData}`;
                  console.log(`Chat API: Using base64 (no URL available)`);
                } else {
                  mediaUrl = imageData;
                }
              }
            }
          }
          
          console.log(`Chat API: Final media URL:`, mediaUrl.substring(0, 100));
          if (structuredPrompt) {
            console.log(`Chat API: Structured prompt available:`, !!structuredPrompt);
          }
          
          toolResults.push({
            name: toolCall.name,
            result,
            mediaUrl,
            imageUrl, // Store URL separately for context reuse
            structuredPrompt, // Store structured prompt for Priority 4
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

