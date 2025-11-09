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
  execution_plan?: {
    current: number;
    total: number;
    description: string;
    continue: boolean;
    plan_type?: "batch_independent" | "batch_variations" | "pipeline";
    steps?: Array<{
      step: number;
      tool: string;
      args: Record<string, any>;
      description: string;
    }>;
  };
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

CONVERSATIONAL MESSAGES:
Your text responses are shown to users in a chat interface. Make them:
- Personal and friendly, acknowledging what the user specifically asked for
- Explain what you're doing or have done (e.g., "I'm creating your cat image" not just "Working...")
- When complete, provide a summary of what was created (e.g., "I've created 3 compelling variations of your Christmas office party scenes!")
- For single generations: "I've created [description based on user's prompt]"
- For batch generations: "I've created [X] variations of [what user asked for]"
- For operations: "I've [operation name] your image as requested"

Examples:
- User: "a cat on a mat" → "Creating your cat on a mat image!"
- User: "3 different dogs" → "Creating 3 different dog images for you!"
- User clicks "remove background" → "Removing the background from your image!"

CRITICAL: When user requests MULTIPLE images (e.g., "3 dogs", "5 cats", "same dog in 3 ratios"), you MUST:
1. Recognize keywords: "3", "different", "multiple", "each", "various", numbers, etc.
2. Determine the batch type:
   - "3 DIFFERENT dogs" / "various cats" / "multiple subjects" → batch_independent (DIFFERENT prompts)
   - "same dog, 3 ratios" / "one cat in 3 sizes" → batch_variations (SAME prompt, different params)
3. For batch_independent: Create UNIQUE prompts for each (Golden Retriever, German Shepherd, Labrador)
4. For batch_variations: Use SAME prompt, vary only aspect_ratio or other params
5. Execute ONLY ONE step at a time (first subject only)
6. Include EXECUTION_PLAN marker in your text response

EXAMPLE batch_independent (dogs):
User: "generate 3 different dogs"
Your response text: "Generating Golden Retriever (1 of 3). EXECUTION_PLAN: {\"current\": 1, \"total\": 3, \"description\": \"Golden Retriever\", \"continue\": true, \"plan_type\": \"batch_independent\", \"steps\": [{\"step\": 1, \"tool\": \"text_to_image\", \"args\": {\"prompt\": \"A photorealistic Golden Retriever dog\", \"aspect_ratio\": \"1:1\"}, \"description\": \"Golden Retriever\"}, {\"step\": 2, \"tool\": \"text_to_image\", \"args\": {\"prompt\": \"A photorealistic German Shepherd dog\", \"aspect_ratio\": \"1:1\"}, \"description\": \"German Shepherd\"}, {\"step\": 3, \"tool\": \"text_to_image\", \"args\": {\"prompt\": \"A photorealistic Labrador dog\", \"aspect_ratio\": \"1:1\"}, \"description\": \"Labrador\"}]}"
Your tool call: text_to_image(prompt="A photorealistic Golden Retriever dog", aspect_ratio="1:1")
System will automatically execute steps 2 and 3 from the plan.

EXAMPLE batch_independent (scenes - CRITICAL):
User: "generate 3 Christmas office party scenes"
**IMPORTANT**: For scenes/scenarios, create COMPLETELY DIFFERENT settings/contexts, not just variations of the same scene!
Your response text: "Generating rooftop party (1 of 3). EXECUTION_PLAN: {\"current\": 1, \"total\": 3, \"description\": \"Rooftop party\", \"continue\": true, \"plan_type\": \"batch_independent\", \"steps\": [{\"step\": 1, \"tool\": \"text_to_image\", \"args\": {\"prompt\": \"A Christmas office party on a rooftop with city lights in background, people celebrating around a fire pit, festive string lights\", \"aspect_ratio\": \"1:1\"}, \"description\": \"Rooftop party\"}, {\"step\": 2, \"tool\": \"text_to_image\", \"args\": {\"prompt\": \"A Christmas office party in a conference room with Secret Santa gift exchange, coworkers laughing around a table, wrapped presents\", \"aspect_ratio\": \"1:1\"}, \"description\": \"Conference room\"}, {\"step\": 3, \"tool\": \"text_to_image\", \"args\": {\"prompt\": \"A Christmas costume party in an office with people in Santa suits and elf costumes, festive games, decorated cubicles\", \"aspect_ratio\": \"1:1\"}, \"description\": \"Costume party\"}]}"
Your tool call: text_to_image(prompt="A Christmas office party on a rooftop with city lights in background, people celebrating around a fire pit, festive string lights", aspect_ratio="1:1")
System will automatically execute steps 2 and 3 from the plan.

**KEY PRINCIPLE for batch_independent scenarios/scenes**: 
- Each prompt must create a DISTINCT context/setting/situation (different location, activity, or theme)
- BAD: "busy party", "lively party", "festive party" (just adjective variations)
- GOOD: "rooftop party", "conference room gift exchange", "costume party" (completely different scenes)

EXAMPLE batch_variations:
User: "generate a cat with 3 aspect ratios"
Your response text: "Generating cat 1:1 (1 of 3). EXECUTION_PLAN: {\"current\": 1, \"total\": 3, \"description\": \"Cat 1:1\", \"continue\": true, \"plan_type\": \"batch_variations\", \"steps\": [{\"step\": 1, \"tool\": \"text_to_image\", \"args\": {\"prompt\": \"A cute cat\", \"aspect_ratio\": \"1:1\"}, \"description\": \"Cat 1:1\"}, {\"step\": 2, \"tool\": \"text_to_image\", \"args\": {\"prompt\": \"A cute cat\", \"aspect_ratio\": \"16:9\"}, \"description\": \"Cat 16:9\"}, {\"step\": 3, \"tool\": \"text_to_image\", \"args\": {\"prompt\": \"A cute cat\", \"aspect_ratio\": \"9:16\"}, \"description\": \"Cat 9:16\"}]}"
Your tool call: text_to_image(prompt="A cute cat", aspect_ratio="1:1")
System will automatically execute steps 2 and 3 from the plan.

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

**PRIORITY 2: AI Operations from Natural Language**
IF preview_image_url is present AND user_input contains operation keywords:
- User wants to modify the EXISTING image (not generate a new one)
- Detect operation from keywords:
  * "expand", "aspect ratio", "aspect ratios", "different size", "resize", "crop" → call expand_image
  * "change background", "replace background", "new background", "different background" → call generate_background
  * "remove background", "bg remove", "transparent" → call remove_background
  * "blur background", "background blur" → call blur_background
  * "upscale", "increase resolution", "higher quality", "enlarge" → call increase_resolution
  * "enhance", "improve quality", "better quality" → call enhance_image
- Use preview_image_url as the 'image' parameter
- **CRITICAL: If user wants MULTIPLE variations** (e.g., "3 aspect ratios", "3 backgrounds"):
  * Create execution plan with multiple steps
  * Each step uses the SAME image but different parameters
  * Example: "3 aspect ratios" → 3 expand_image calls with different target_aspect_ratio
  * Example: "3 backgrounds" → 3 generate_background calls with different prompts
- Execute the first step immediately

EXAMPLE 1:
User: "put the image in 3 aspect ratios"
preview_image_url: "https://..."
→ Detect: "aspect ratios" keyword + preview_image exists → expand_image
→ Batch: 3 variations needed
→ Call: expand_image(image="https://...", target_aspect_ratio="16:9") for step 1
→ Plan: [{step:1, tool:"expand_image", args:{image:"...", target_aspect_ratio:"16:9"}}, ...]

EXAMPLE 2:
User: "change the background to 3 options: beach, mountains, city"
preview_image_url: "https://..."
→ Detect: "change background" keyword + preview_image exists → generate_background
→ Batch: 3 variations needed
→ Call: generate_background(image="https://...", prompt="beach background") for step 1
→ Plan: [{step:1, tool:"generate_background", args:{image:"...", prompt:"beach"}}, ...]

**PRIORITY 3: Masked Editing**
IF mask_data is present AND user_input is not empty:
- User intent is Generative Fill or Eraser
- You MUST use the appropriate MCP tool (e.g., generative_fill, eraser) that utilizes mask_data, preview_image_url, and user_input as the prompt
- Execute immediately

**PRIORITY 4: Reference Image Generation**
IF reference_image is present AND ai_operation is null:
- User intent is to generate a new image based on their uploaded reference
- Call the text_to_image tool
- Pass user_input as the prompt
- Pass reference_image as the image parameter
- Apply all standard UI parameters (steps, model, etc.)

**PRIORITY 5: Conversational Refinement (Refine Mode)**
IF preview_image_url exists AND structured_prompt exists AND user_input is not empty (and NO mask is present):
- User intent is to refine the current generation using natural language (e.g., "make it closer", "change the object's color")
- Call the text_to_image tool
- Pass the NEW user_input as the prompt
- **Crucial:** You MUST pass the provided structured_prompt context into the tool's structured_prompt parameter to ensure consistency with the previous generation

**PRIORITY 6: Standard Text-to-Image (Default)**
IF none of the above conditions are met:
- User intent is a standard generation
- **IMPORTANT: Check if user wants MULTIPLE images (e.g., "3 dogs", "5 cats", "dog in 3 ratios")**
  * If YES: Follow MULTI-STEP EXECUTION PLANNING (see below)
  * If NO: Single image generation
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

MULTI-STEP EXECUTION PLANNING:

When user requests multiple images or a pipeline:
1. IDENTIFY the request type:
   - Batch independent: "3 different dogs" (no dependencies between images)
   - Batch variations: "same dog, 3 aspect ratios" (shared prompt, varied parameters)
   - Pipeline: "generate dog, remove bg, replace bg" (each step uses previous output as input)

2. CREATE an execution plan:
   - Break down into individual tool calls
   - For batch independent: generate unique prompts if needed (e.g., "Golden Retriever", "German Shepherd", "Labrador")
   - For batch variations: reuse same prompt, vary parameters (aspect_ratio, seed, etc.)
   - For pipeline: track output of each step as input for next step
   - Calculate total steps (e.g., 3 dogs × 3 ratios = 9 steps)

3. RETURN metadata with your tool call:
   - You MUST call the appropriate tool (e.g., text_to_image) for step 1
   - In your text response, include a special marker: "EXECUTION_PLAN: {json}"
   - execution_plan JSON structure: {"current": 1, "total": number, "description": string, "continue": true, "plan_type": string, "steps": [{step, tool, args, description}, ...]}
   - **CRITICAL**: Include ALL steps in the "steps" array with their complete tool args
   - Example: For "3 different dogs", return steps for ALL 3 dogs in JSON format
   - Each step should have: step (number), tool (string), args (object with tool parameters), description (string)
   - The system will execute step 1, then automatically execute steps 2-N without calling you again

4. You will ONLY be called for the first step
   - The system will execute remaining steps automatically
   - Do NOT expect CONTINUE_EXECUTION messages

MULTI-STEP EXAMPLES:

Request: "Generate 3 different dogs with aspect ratios 1:1, 16:9, 3:4"
Plan: 3 dogs × 3 aspect ratios = 9 total steps

Response 1: 
  Text: "Generating Golden Retriever. EXECUTION_PLAN: {\"current\": 1, \"total\": 9, \"description\": \"Golden Retriever 1:1\", \"continue\": true, \"plan_type\": \"batch_independent\"}"
  Call: text_to_image(prompt="A photorealistic Golden Retriever dog", aspect_ratio="1:1")

Response 2 (after CONTINUE_EXECUTION):
  Text: "Generating Golden Retriever. EXECUTION_PLAN: {\"current\": 2, \"total\": 9, \"description\": \"Golden Retriever 16:9\", \"continue\": true, \"plan_type\": \"batch_independent\"}"
  Call: text_to_image(prompt="A photorealistic Golden Retriever dog", aspect_ratio="16:9")

Response 3 (after CONTINUE_EXECUTION):
  Text: "Generating Golden Retriever. EXECUTION_PLAN: {\"current\": 3, \"total\": 9, \"description\": \"Golden Retriever 3:4\", \"continue\": true, \"plan_type\": \"batch_independent\"}"
  Call: text_to_image(prompt="A photorealistic Golden Retriever dog", aspect_ratio="3:4")

Response 4 (after CONTINUE_EXECUTION):
  Text: "Generating German Shepherd. EXECUTION_PLAN: {\"current\": 4, \"total\": 9, \"description\": \"German Shepherd 1:1\", \"continue\": true, \"plan_type\": \"batch_independent\"}"
  Call: text_to_image(prompt="A photorealistic German Shepherd dog", aspect_ratio="1:1")

... continue pattern ...

Response 9 (after CONTINUE_EXECUTION):
  Text: "Generating Labrador. EXECUTION_PLAN: {\"current\": 9, \"total\": 9, \"description\": \"Labrador 3:4\", \"continue\": false, \"plan_type\": \"batch_independent\"}"
  Call: text_to_image(prompt="A photorealistic Labrador dog", aspect_ratio="3:4")

Request: "Generate a cat, remove its background, replace with forest"
Plan: 3 sequential steps (pipeline)

Response 1:
  Text: "Generating cat. EXECUTION_PLAN: {\"current\": 1, \"total\": 3, \"description\": \"Generate cat\", \"continue\": true, \"plan_type\": \"pipeline\"}"
  Call: text_to_image(prompt="a cat")

Response 2 (after CONTINUE_EXECUTION):
  Text: "Removing background. EXECUTION_PLAN: {\"current\": 2, \"total\": 3, \"description\": \"Remove background\", \"continue\": true, \"plan_type\": \"pipeline\"}"
  Call: remove_background(image="<url_from_step_1>")

Response 3 (after CONTINUE_EXECUTION):
  Text: "Adding forest background. EXECUTION_PLAN: {\"current\": 3, \"total\": 3, \"description\": \"Replace with forest\", \"continue\": false, \"plan_type\": \"pipeline\"}"
  Call: generate_background(image="<url_from_step_2>", prompt="forest background")

IMPORTANT: For pipelines, use the image URL from the previous step's result as input for the next step.

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
        } else if (currentParams.preview_image_url && userMessage) {
          // Check for AI operation keywords in natural language
          const userInput = userMessage.toLowerCase();
          const hasOpKeywords = [
            'expand', 'aspect ratio', 'aspect ratios', 'resize', 'crop',
            'change background', 'replace background', 'new background',
            'remove background', 'bg remove', 'transparent',
            'blur background', 'upscale', 'increase resolution',
            'enhance', 'improve quality'
          ].some(keyword => userInput.includes(keyword));
          
          if (hasOpKeywords) {
            console.log("🟡 PRIORITY 2: AI Operations from Natural Language");
            console.log("  Detected keywords in:", userMessage);
            const imageType = currentParams.preview_image_url?.startsWith('http') ? 'MCP URL' : 'BASE64';
            console.log(`  Preview image type: ${imageType}`);
          } else if (currentParams.mask_data) {
            console.log("🟠 PRIORITY 3: Masked Editing Detected");
            console.log("  Mask data present:", !!currentParams.mask_data);
          } else if (currentParams.structured_prompt) {
            console.log("🟢 PRIORITY 5: Conversational Refinement Detected");
            const imageType = currentParams.preview_image_url?.startsWith('http') ? 'MCP URL' : 'BASE64';
            console.log(`  Preview image type: ${imageType}`);
            console.log("  Structured prompt available:", !!currentParams.structured_prompt);
          }
        } else if (currentParams.mask_data && userMessage) {
          console.log("🟠 PRIORITY 3: Masked Editing Detected");
          console.log("  Mask data present:", !!currentParams.mask_data);
        } else if (currentParams.reference_image && !currentParams.ai_operation) {
          console.log("🟣 PRIORITY 4: Reference Image Generation Detected");
          console.log("  Reference image:", currentParams.reference_image?.substring(0, 50) + "...");
        } else {
          console.log("🔵 PRIORITY 6: Standard Text-to-Image (Default)");
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
      let execution_plan: AgentResponse["execution_plan"] = undefined;

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
        const responseText = response.text();
        console.log("💬 Agent Response (no tool calls):", responseText);
        console.log("⚠️ WARNING: Agent should have called a tool but didn't!");
        console.log("   User input indicated:", currentParams?.user_input);
      }

      const assistantMessage = response.text() || "I'm processing your request...";
      console.log("📄 Agent's full text response:", assistantMessage);

      // Extract execution_plan from text response if present
      // Use a more robust regex that handles nested objects
      const executionPlanMatch = assistantMessage.match(/EXECUTION_PLAN:\s*(\{[\s\S]+)/);
      if (executionPlanMatch) {
        try {
          // Find the complete JSON by counting braces
          let jsonStr = '';
          let braceCount = 0;
          let startFound = false;
          
          for (let i = 0; i < executionPlanMatch[0].length; i++) {
            const char = executionPlanMatch[0][i];
            if (char === '{') {
              startFound = true;
              braceCount++;
            }
            if (startFound) {
              jsonStr += char;
            }
            if (char === '}') {
              braceCount--;
              if (braceCount === 0 && startFound) {
                break; // Found complete JSON object
              }
            }
          }
          
          execution_plan = JSON.parse(jsonStr);
          console.log("📋 Execution Plan:", execution_plan);
        } catch (e) {
          console.error("Failed to parse execution_plan:", e);
          console.error("Raw match:", executionPlanMatch[0]);
        }
      }

      // Add assistant response to history
      this.chatHistory.push({
        role: "model",
        parts: [{ text: assistantMessage }],
      });

      return {
        message: assistantMessage,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        execution_plan,
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

