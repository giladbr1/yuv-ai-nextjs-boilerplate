import { GoogleGenerativeAI, Content, FunctionDeclaration, GenerateContentResult } from "@google/generative-ai";
import { MCPTool } from "./mcp-client";
import { getEnv } from "./env-init"; // Explicit env loading for Windows compatibility

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
  private availableTools: MCPTool[] = [];

  constructor() {
    // Load API key from environment (env-init automatically loads .env.local)
    const apiKey = getEnv("GOOGLE_GENERATIVE_AI_API_KEY");
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Initialize agent with MCP tools - dynamic tool discovery
   * No hardcoded tool mappings - agent learns from tool schemas
   */
  initializeWithMCPTools(mcpTools: MCPTool[]): void {
    // Store tools for debugging
    this.availableTools = mcpTools;
    
    // Convert MCP tools to Gemini function declarations
    // MCP schema is JSON Schema compatible with Gemini
    const functionDeclarations: FunctionDeclaration[] = mcpTools.map(tool => ({
      name: tool.name,
      description: tool.description || `Execute ${tool.name} tool`,
      parameters: tool.inputSchema as any, // MCP schema format matches Gemini's expectations
    }));

    // Priority-based system instruction - PRD compliant
    const systemInstruction = `You are the Bria AI Orchestrator. Your goal is to translate user intentions into precise MCP tool calls based on context evaluation. You must strictly adhere to the available MCP tools provided.

CONTEXT INPUTS YOU RECEIVE:
You will receive a context object with the following fields:
- user_input: The raw text content from the user
- parameters: UI parameter controls (steps, model, aspect_ratio, seed)
- reference_image: Optional uploaded reference image URL
- ai_operation: Optional explicit operation triggered by user (e.g., { name: "upscale", params: { factor: 4 } })
- preview_image_url: MCP image URL (e.g., "https://...") or data URL - pass this directly to tools as 'image' parameter
- structured_prompt: Optional metadata from the preview_image_url generation
- mask_data: Optional mask data drawn on the canvas

NOTE: Image URLs are provided directly. Pass them as-is to MCP tools (e.g., image="https://...").

CORE DECISION LOGIC (PRIORITY ORDER):
You MUST evaluate the context inputs in the following STRICT ORDER OF PRECEDENCE:

**PRIORITY 1: Explicit AI Operations**
IF ai_operation is present:
- THIS IS THE HIGHEST PRIORITY - You MUST call a tool immediately
- You MUST NOT respond with text only - a tool call is REQUIRED
- Identify the MCP tool by matching the operation name:
  * ai_operation.name "remove-background" → call tool "remove_background"
  * ai_operation.name "blur-background" → call tool "blur_background"  
  * ai_operation.name "enhance-image" → call tool "enhance_image"
  * ai_operation.name "increase-resolution" → call tool "increase_resolution"
  * ai_operation.name "generative-fill" → call tool "generative_fill" or "inpaint"
  * ai_operation.name "object-eraser" or "eraser" → call tool "erase_foreground" or "eraser"
  * ai_operation.name "expand" → call tool "expand_image"
  * ai_operation.name "replace-background" → call tool "generate_background" or "replace_background"
- REQUIRED: Use preview_image_url as the 'image' parameter for the tool call
- Include any additional parameters from ai_operation.params
- DO NOT explain, DO NOT ask questions - JUST CALL THE TOOL
- The tool call is mandatory - no text-only response is acceptable

EXAMPLE: If you receive:
  ai_operation: { name: "remove-background", params: {} }
  preview_image_url: "https://mcp.bria.com/images/abc123.jpg"
You MUST immediately call: remove_background(image="https://mcp.bria.com/images/abc123.jpg")

**PRIORITY 2: Masked Editing**
IF mask_data is present AND user_input is not empty:
- User intent is Generative Fill or Eraser
- You MUST use the appropriate MCP tool (e.g., generative_fill, eraser) that utilizes mask_data, preview_image_url, and user_input as the prompt
- Execute immediately

**PRIORITY 3: Reference Image Generation**
IF reference_image is present AND ai_operation is null:
- User intent is to generate a new image based on their uploaded reference
- Call the text_to_image tool
- Pass user_input as the prompt
- Pass reference_image as the image parameter
- Apply all standard UI parameters (steps, model, etc.)

**PRIORITY 4: Conversational Refinement (Refine Mode)**
IF preview_image_url exists AND structured_prompt exists AND user_input is not empty (and NO mask is present):
- User intent is to refine the current generation using natural language (e.g., "make it closer", "change the object's color")
- Call the text_to_image tool
- Pass the NEW user_input as the prompt
- **Crucial:** You MUST pass the provided structured_prompt context into the tool's structured_prompt parameter to ensure consistency with the previous generation

**PRIORITY 5: Standard Text-to-Image (Default)**
IF none of the above conditions are met:
- User intent is a standard generation
- Call the text_to_image tool
- Use user_input for the prompt and apply all standard UI parameters

DYNAMIC PARAMETER MAPPING:
- Read each tool's parameter schema carefully
- Map UI parameters to tool-specific parameters
- Example mappings (always verify against tool schema):
     * UI "steps" → tool "steps_num"
     * UI "aspectRatio" → tool "aspect_ratio"
- Use tool's default values for any params not provided

EXECUTION RULES:
1. ALWAYS execute tool calls immediately without asking for confirmation
2. Each tool has its own parameter schema - validate before calling
3. Only use parameters that exist in the tool's schema
4. When in doubt, follow the priority order strictly

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
      // Console debugging: Log agent inputs
      console.group("🤖 Agent Context Inputs");
      console.log("User Message:", userMessage);
      
      if (currentParams) {
        // Show context without massive base64 images
        const contextPreview = { ...currentParams };
        if (contextPreview.preview_image_url) {
          const url = contextPreview.preview_image_url;
          if (url.startsWith('data:')) {
            contextPreview.preview_image_url = `[BASE64 DATA: ${url.substring(0, 30)}... (${url.length} chars)]`;
          } else {
            contextPreview.preview_image_url = url; // Show full URL (it's short)
          }
        }
        console.log("Context Object:", contextPreview);
        
        // Highlight which priority should be triggered
        if (currentParams.ai_operation) {
          console.log("🔴 PRIORITY 1: Explicit AI Operation Detected");
          console.log("  Operation:", currentParams.ai_operation);
          const imageType = currentParams.preview_image_url?.startsWith('http') ? 'MCP URL' : 
                           currentParams.preview_image_url?.startsWith('data:') ? 'BASE64' : 'none';
          console.log(`  Image type: ${imageType}`);
        } else if (currentParams.mask_data && userMessage) {
          console.log("🟠 PRIORITY 2: Masked Editing Detected");
          console.log("  Mask data present:", !!currentParams.mask_data);
        } else if (currentParams.reference_image && !currentParams.ai_operation) {
          console.log("🟡 PRIORITY 3: Reference Image Generation Detected");
          console.log("  Reference image:", currentParams.reference_image?.substring(0, 50) + "...");
        } else if (currentParams.preview_image_url && currentParams.structured_prompt && userMessage) {
          console.log("🟢 PRIORITY 4: Conversational Refinement Detected");
          const imageType = currentParams.preview_image_url?.startsWith('http') ? 'MCP URL' : 'BASE64';
          console.log(`  Preview image type: ${imageType}`);
          console.log("  Structured prompt available:", !!currentParams.structured_prompt);
        } else {
          console.log("🔵 PRIORITY 5: Standard Text-to-Image (Default)");
        }
      }
      
      // Log available tools for debugging
      if (this.model) {
        console.log("📚 Available MCP Tools:", this.getAvailableToolNames());
      }
      console.groupEnd();

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
        // Console debugging: Log agent's decision
        console.group("🎯 Agent Decision");
        console.log(`Agent decided to call ${functionCalls.length} tool(s):`);
        
        for (const call of functionCalls) {
          const { name, args } = call;
          console.log(`📞 Tool Call: ${name}`);
          console.log("  Arguments:", args);
          
          // All function calls are now MCP tool calls
          // Agent handles parameter mapping dynamically
          toolCalls.push({ name, args: args as Record<string, any> });
        }
        console.groupEnd();
      } else {
        console.log("💬 Agent Response (no tool calls):", response.text());
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

  getAvailableToolNames(): string[] {
    return this.availableTools.map(tool => tool.name);
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

