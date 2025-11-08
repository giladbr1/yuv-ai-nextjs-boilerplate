# Batch Generation - Direct Tool Execution Fix

## Problem Found (From Logs)

Looking at lines 926-976 of the terminal output, the system was **calling the agent** for direct tool execution instead of bypassing it:

```
🤖 Agent Context Inputs
  User Message: Direct execution: text_to_image
  📚 Available MCP Tools: [...]
💬 Agent Response (no tool calls): The user is instructing me to use the `text_to_image` tool. I need more information to proceed...
⚠️ WARNING: Agent should have called a tool but didn't!
```

**Root Cause:** The client was sending a request to `/api/chat` with `toolCalls` in the body, but the API route was:
1. ❌ Always calling the agent with the message
2. ❌ Not handling direct tool execution
3. ❌ Sending unnecessary `context` parameter

## Solution Implemented

### 1. API Route: Support Direct Tool Execution (`src/app/api/chat/route.ts`)

Added logic to **bypass the agent** when `toolCalls` are provided directly:

```typescript
export async function POST(request: NextRequest) {
  try {
    const { message, currentParams, toolCalls: directToolCalls } = await request.json();
    
    // ... MCP connection setup ...
    
    let response;
    
    // ✅ NEW: If direct tool calls are provided, skip agent
    if (directToolCalls && directToolCalls.length > 0) {
      console.log("Chat API: Direct tool execution (bypassing agent):", directToolCalls);
      response = {
        message: "Direct execution",
        toolCalls: directToolCalls,  // Use the provided tool calls
      };
    } else {
      // Normal flow: agent decides what to call
      response = await agent.sendMessage(message, currentParams);
    }
    
    // Execute the tools (whether from agent or direct)
    if (response.toolCalls && response.toolCalls.length > 0) {
      // ... MCP execution logic ...
    }
```

**Key Change:** When `toolCalls` are in the request, the agent is **completely skipped** and the tools are executed directly.

### 2. Client: Simplified Direct Execution (`src/hooks/useBriaGeneration.ts`)

Removed unnecessary `context` parameter from batch execution calls:

**Before (Broken):**
```typescript
const toolResponse = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    message: `Direct execution: ${step.tool}`,
    context: {  // ❌ API route doesn't use this
      ...context,
      user_input: `Execute ${step.tool}`,
    },
    toolCalls: [{
      name: step.tool,
      args: step.args,
    }],
  }),
});
```

**After (Fixed):**
```typescript
const toolResponse = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    message: `Direct execution: ${step.tool}`,  // Just for logging
    toolCalls: [{  // ✅ API route uses this to bypass agent
      name: step.tool,
      args: step.args,
    }],
  }),
});
```

## How It Works Now

### User: "generate 3 different dogs breeds"

**Step 1: Agent Creates Plan**
```
🤖 Agent called with user message
📋 Agent returns full execution plan with 3 steps
🎯 Agent executes step 1: text_to_image("Golden Retriever")
✅ Golden Retriever added to gallery
```

**Step 2: Direct Execution (NO AGENT)**
```
⚡ Client executes step 2 directly
📡 POST /api/chat with toolCalls: [{name: "text_to_image", args: {...}}]
🔄 API route sees toolCalls → bypasses agent
✅ MCP tool executed directly
✅ German Shepherd added to gallery
```

**Step 3: Direct Execution (NO AGENT)**
```
⚡ Client executes step 3 directly
📡 POST /api/chat with toolCalls: [{name: "text_to_image", args: {...}}]
🔄 API route sees toolCalls → bypasses agent
✅ MCP tool executed directly
✅ Labrador added to gallery
```

**Result:**
```
✅ Batch execution complete
3 dogs in gallery, 3 different breeds, all at 1:1 aspect ratio
```

## Expected Log Output

When you test "generate 3 different dogs breeds" now:

```
🤖 Agent Context Inputs
  User Message:  settings: generate 3 different dogs breeds
  🔵 PRIORITY 5: Standard Text-to-Image (Default)

🎯 Agent Decision
  📞 Tool Call: text_to_image
    Arguments: { prompt: 'A photorealistic Golden Retriever dog', aspect_ratio: '1:1' }

📋 Execution Plan: {
  current: 1, total: 3, plan_type: 'batch_independent',
  steps: [
    {step: 1, tool: 'text_to_image', args: {...}, description: 'Golden Retriever'},
    {step: 2, tool: 'text_to_image', args: {...}, description: 'German Shepherd'},
    {step: 3, tool: 'text_to_image', args: {...}, description: 'Labrador'}
  ]
}

[Chat API] Tool text_to_image SUCCESS
✅ Golden Retriever generated

🔄 Starting batch execution: 3 steps
⚡ Executing step 2/3: German Shepherd
Chat API: Direct tool execution (bypassing agent): [{name: "text_to_image", ...}]  ← ✅ NEW
[Chat API] Tool text_to_image SUCCESS
✅ German Shepherd generated

⚡ Executing step 3/3: Labrador
Chat API: Direct tool execution (bypassing agent): [{name: "text_to_image", ...}]  ← ✅ NEW
[Chat API] Tool text_to_image SUCCESS
✅ Labrador generated

✅ Batch execution complete
```

**Key Difference:** You should now see `Chat API: Direct tool execution (bypassing agent)` for steps 2 and 3, instead of the agent being called and asking for more information.

## Files Changed

1. **src/app/api/chat/route.ts**
   - Added support for `toolCalls` in request body
   - Added logic to bypass agent when `toolCalls` are provided
   - Direct tool execution path

2. **src/hooks/useBriaGeneration.ts**
   - Removed unnecessary `context` parameter from batch execution calls
   - Simplified request body to only include `message` and `toolCalls`

## Testing

**Please restart your dev server and test again with "generate 3 different dogs breeds"**

Expected outcome:
1. ✅ Agent called once (step 1)
2. ✅ Steps 2-3 executed directly (no agent calls)
3. ✅ All 3 images generated
4. ✅ All 3 different breeds (Golden Retriever, German Shepherd, Labrador)
5. ✅ All at 1:1 aspect ratio
6. ✅ Progress bar shows 1/3 → 2/3 → 3/3

The logs should show "Direct tool execution (bypassing agent)" for steps 2 and 3!

