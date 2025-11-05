import { GoogleGenerativeAI, Content, FunctionDeclaration, GenerateContentResult } from "@google/generative-ai";
import { MCPTool } from "./mcp-client";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface GenerationParams {
  mode: "image" | "video";
  model_version: "Fibo" | "3.2" | "EA tailored";
  modelInfluence?: number;
  steps: number;
  aspectRatio: string;
  seed: string | number;
  prompt: string;
}

export interface AgentResponse {
  message: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, any>;
  }>;
  parameterUpdates?: Partial<GenerationParams>;
}

class GeminiAgentService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private chatHistory: Content[] = [];

  constructor() {
    // Try to load from environment config
    let apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY;
    
    // Fallback to hardcoded config if env vars don't work
    if (!apiKey) {
      try {
        // Use dynamic import to avoid bundling issues
        const envModule = require("./env");
        apiKey = envModule.ENV.GOOGLE_GENERATIVE_AI_API_KEY;
      } catch (e) {
        console.error("Failed to load environment config", e);
      }
    }
    
    if (!apiKey) {
      throw new Error("Google Generative AI API key not configured");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Initialize agent with MCP tools - dynamic tool discovery
   * No hardcoded tool mappings - agent learns from tool schemas
   */
  initializeWithMCPTools(mcpTools: MCPTool[]): void {
    // Convert MCP tools to Gemini function declarations
    // MCP schema is JSON Schema compatible with Gemini
    const functionDeclarations: FunctionDeclaration[] = mcpTools.map(tool => ({
      name: tool.name,
      description: tool.description || `Execute ${tool.name} tool`,
      parameters: tool.inputSchema as any, // MCP schema format matches Gemini's expectations
    }));

    // Dynamic system instruction - works with ANY MCP tools
    const systemInstruction = `You are a Bria visual generation assistant with access to multiple MCP tools.

CRITICAL INSTRUCTIONS:
1. When a user requests generation, IMMEDIATELY call the appropriate MCP tool
2. DO NOT ask for confirmation - execute immediately
3. You will receive currentParams from the UI with these fields:
   - prompt: User's creative description
   - mode: "image" or "video"
   - model: UI model selection ("Fibo", "3.2", "EA tailored")
   - steps: Number of generation steps
   - aspectRatio: Aspect ratio string
   - seed: Seed value or null for random
   - referenceImage: Optional uploaded image

YOUR JOB - DYNAMIC PARAMETER MAPPING:
1. Select the correct tool based on mode and user intent
   - mode="image" → use text_to_image tool
   - mode="video" → use text_to_video tool (if available)
   - User wants editing → use appropriate editing tool

2. Map UI parameters to the tool's expected schema
   - Read the tool's parameter schema carefully
   - Map generic UI params to tool-specific params
   - Example mappings (but always check the tool schema):
     * UI "model" → tool "model_version" 
     * UI "steps" → tool "steps_num"
     * UI "aspectRatio" → tool "aspect_ratio"
     * UI "Fibo" or "EA tailored" → tool "3.2"

3. Use the tool's default values for any params not provided by UI

IMPORTANT:
- Each tool has its own parameter schema - always check it
- Different tools need different parameters
- Only use parameters that exist in the tool's schema
- Execute tool calls immediately without asking

The available tools and their exact schemas are provided via function calling.`;

    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction,
      tools: [{ functionDeclarations }],
    });

    // Initialize chat history
    this.chatHistory = [];
  }

  // Legacy method for backwards compatibility
  initializeWithTools(mcpTools: MCPTool[]): void {
    this.initializeWithMCPTools(mcpTools);
  }

  async sendMessage(userMessage: string, currentParams?: any): Promise<AgentResponse> {
    try {
      // Build context message with current UI state
      let contextMessage = userMessage;
      
      if (currentParams) {
        const paramsContext = `Current UI Parameters:
${JSON.stringify(currentParams, null, 2)}

User Message: ${userMessage}`;
        contextMessage = paramsContext;
      }

      // Add user message to history
      this.chatHistory.push({
        role: "user",
        parts: [{ text: contextMessage }],
      });

      const chat = this.model.startChat({
        history: this.chatHistory.slice(0, -1),
      });

      const result = await chat.sendMessage(contextMessage);
      const response = result.response;

      // Check for function calls (tool calls from agent)
      const functionCalls = response.functionCalls();
      const toolCalls: Array<{ name: string; args: Record<string, any> }> = [];

      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          const { name, args } = call;
          // All function calls are now MCP tool calls
          // Agent handles parameter mapping dynamically
          toolCalls.push({ name, args: args as Record<string, any> });
        }
      }

      const assistantMessage = response.text() || "I'm processing your request...";

      // Add assistant response to history
      this.chatHistory.push({
        role: "model",
        parts: [{ text: assistantMessage }],
      });

      return {
        message: assistantMessage,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (error) {
      console.error("Error in Gemini agent:", error);
      throw error;
    }
  }

  private generateRandomPrompt(): string {
    const prompts = [
      "A majestic phoenix rising from vibrant flames against a sunset sky",
      "A futuristic city with flying cars and neon lights at night",
      "An enchanted forest with glowing mushrooms and magical creatures",
      "A serene beach at sunrise with crystal clear turquoise water",
      "A steampunk airship floating among the clouds",
      "A cosmic nebula with swirling colors and distant galaxies",
      "A cozy mountain cabin covered in snow during winter twilight",
      "An underwater scene with bioluminescent sea creatures",
      "A zen garden with cherry blossoms and a peaceful koi pond",
      "A cyberpunk street market with holographic signs and diverse characters",
    ];

    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  getChatHistory(): Content[] {
    return this.chatHistory;
  }

  clearHistory(): void {
    this.chatHistory = [];
  }
}

let agentInstance: GeminiAgentService | null = null;

export function getGeminiAgent(): GeminiAgentService {
  if (!agentInstance) {
    agentInstance = new GeminiAgentService();
  }
  return agentInstance;
}

export { GeminiAgentService };

