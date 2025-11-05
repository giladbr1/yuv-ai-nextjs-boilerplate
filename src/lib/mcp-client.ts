import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// Streamable HTTP Transport for MCP
class StreamableHTTPTransport implements Transport {
  private url: string;
  private headers: Record<string, string>;
  private oncloseCallback?: () => void;
  private onerrorCallback?: (error: Error) => void;

  constructor(url: string, headers: Record<string, string> = {}) {
    this.url = url;
    this.headers = headers;
  }

  async start(): Promise<void> {
    // HTTP transport doesn't need a persistent connection
    console.log("StreamableHTTP transport initialized");
  }

  async send(message: any): Promise<void> {
    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.headers,
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle streaming response (SSE format or JSONL)
      const text = await response.text();
      console.log("MCP Response (first 200 chars):", text.substring(0, 200));

      // Skip empty responses
      if (!text || text.trim() === "") {
        console.log("Empty response, skipping");
        return;
      }

      // Parse SSE format: "data: {...}\n\n"
      let data: any = null;
      
      if (text.startsWith("data: ")) {
        // SSE format - extract JSON from "data: {...}" lines
        const lines = text.split("\n");
        const dataLines = lines
          .filter(line => line.startsWith("data: "))
          .map(line => line.substring(6).trim()) // Remove "data: " prefix
          .filter(line => line && line !== ""); // Filter empty lines
        
        if (dataLines.length > 0) {
          // Parse all data lines and collect them
          for (const jsonStr of dataLines) {
            try {
              const parsed = JSON.parse(jsonStr);
              data = parsed; // Use the last valid parsed data
              console.log("Parsed SSE data:", parsed);
            } catch (e) {
              console.warn("Failed to parse SSE line:", jsonStr.substring(0, 100), e);
            }
          }
        }
      } else {
        // Regular JSON response
        try {
          data = JSON.parse(text);
          console.log("Parsed JSON data:", data);
        } catch (e) {
          console.warn("Failed to parse JSON response:", text.substring(0, 100), e);
        }
      }
      
      // Trigger message handler if it exists
      if (this.onmessage && data) {
        this.onmessage(data);
      }
    } catch (error) {
      console.error("Error sending MCP message:", error);
      if (this.onerrorCallback) {
        this.onerrorCallback(error as Error);
      }
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.oncloseCallback) {
      this.oncloseCallback();
    }
  }

  // Message handler
  onmessage?: (message: any) => void;

  set onclose(callback: () => void) {
    this.oncloseCallback = callback;
  }

  set onerror(callback: (error: Error) => void) {
    this.onerrorCallback = callback;
  }
}

class BriaMCPClient {
  private client: Client | null = null;
  private transport: StreamableHTTPTransport | null = null;
  private tools: MCPTool[] = [];
  private connected: boolean = false;

  async connect(): Promise<void> {
    if (this.connected && this.client) {
      console.log("MCP client already connected");
      return;
    }

    // Import environment variables from config
    const { getEnv } = await import("./env");
    const mcpUrl = getEnv("BRIA_MCP_URL");
    const apiToken = getEnv("BRIA_MCP_API_TOKEN");

    console.log("MCP Connect attempt:", {
      hasUrl: !!mcpUrl,
      hasToken: !!apiToken,
      url: mcpUrl,
      tokenLength: apiToken?.length,
    });

    if (!mcpUrl || !apiToken) {
      const error = new Error(`MCP URL or API token not configured. URL: ${!!mcpUrl}, Token: ${!!apiToken}`);
      console.error("MCP Configuration Error:", error);
      throw error;
    }

    try {
      // Create Streamable HTTP transport for MCP communication
      // Bria MCP requires api_token header (not Authorization Bearer)
      this.transport = new StreamableHTTPTransport(mcpUrl, {
        "api_token": apiToken,
      });

      this.client = new Client(
        {
          name: "bria-agentic-interface",
          version: "1.0.0",
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      await this.client.connect(this.transport);
      this.connected = true;

      // Discover available tools
      await this.discoverTools();
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      throw error;
    }
  }

  async discoverTools(): Promise<MCPTool[]> {
    if (!this.client || !this.connected) {
      throw new Error("MCP client not connected");
    }

    try {
      const response = await this.client.listTools();
      this.tools = response.tools as MCPTool[];
      return this.tools;
    } catch (error) {
      console.error("Failed to discover MCP tools:", error);
      throw error;
    }
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  /**
   * Convert MCP tools to Gemini FunctionDeclaration format
   * This enables automatic tool discovery without hardcoded mappings
   */
  toGeminiFunctionDeclarations(): any[] {
    return this.tools.map(tool => ({
      name: tool.name,
      description: tool.description || `Tool: ${tool.name}`,
      parameters: tool.inputSchema, // MCP schema is JSON Schema compatible with Gemini
    }));
  }

  /**
   * Get detailed tool context for agent's understanding
   * Returns a human-readable description of all available tools
   */
  getToolContext(): string {
    if (this.tools.length === 0) {
      return "No tools available.";
    }

    const toolDescriptions = this.tools.map(tool => {
      const params = tool.inputSchema.properties 
        ? Object.keys(tool.inputSchema.properties).join(", ")
        : "none";
      const required = tool.inputSchema.required?.join(", ") || "none";
      
      return `- ${tool.name}: ${tool.description || "No description"}
  Parameters: ${params}
  Required: ${required}`;
    }).join("\n\n");

    return `Available MCP Tools:\n\n${toolDescriptions}`;
  }

  async callTool(name: string, args: Record<string, any>): Promise<MCPToolResult> {
    if (!this.client || !this.connected) {
      throw new Error("MCP client not connected");
    }

    try {
      const response = await this.client.callTool({
        name,
        arguments: args,
      });

      return response as MCPToolResult;
    } catch (error) {
      console.error(`Failed to call tool ${name}:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.close();
      this.connected = false;
      this.client = null;
      this.transport = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Singleton instance
let mcpClientInstance: BriaMCPClient | null = null;

export function getMCPClient(): BriaMCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new BriaMCPClient();
  }
  return mcpClientInstance;
}

export { BriaMCPClient };

