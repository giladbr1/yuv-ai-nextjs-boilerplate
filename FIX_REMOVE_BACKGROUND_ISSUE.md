# Fix: Remove Background Operation Not Executing

## Issue Discovered

From terminal logs (lines 834-868), the `remove-background` operation was failing silently:

### What Was Working ✅
- Context detection: `🔴 PRIORITY 1: Explicit AI Operation Detected`
- Operation structure: `ai_operation: { name: 'remove-background', params: {} }`
- Source image available: `preview_image_url: 'data:image/jpeg;base64,...'` (large image)
- Tool available: `'remove_background'` in MCP tools list

### What Was Failing ❌
- **Agent decision:** `💬 Agent Response (no tool calls):`
- Agent returned empty text response instead of calling the `remove_background` tool

## Root Cause

**Gemini model was not directive enough.** The system prompt explained what to do but didn't strongly enforce that a tool call is **mandatory** for Priority 1 operations.

The agent had all the information it needed but chose to respond with text instead of making a function call.

## Solution Applied

### 1. Strengthened Priority 1 Directives

**Before:**
```
- You MUST ignore typical conversational intent and strictly execute the requested operation
- Identify the MCP tool that corresponds to ai_operation.name
```

**After:**
```
- THIS IS THE HIGHEST PRIORITY - You MUST call a tool immediately
- You MUST NOT respond with text only - a tool call is REQUIRED
- DO NOT explain, DO NOT ask questions - JUST CALL THE TOOL
- The tool call is mandatory - no text-only response is acceptable
```

### 2. Added Exact Name Mappings

Instead of fuzzy descriptions, now provides exact mappings:
```
* ai_operation.name "remove-background" → call tool "remove_background"
* ai_operation.name "blur-background" → call tool "blur_background"
* ai_operation.name "enhance-image" → call tool "enhance_image"
... etc
```

### 3. Added Concrete Example

Shows exactly what the agent should do:
```
EXAMPLE: If you receive:
  ai_operation: { name: "remove-background", params: {} }
  preview_image_url: "data:image/jpeg;base64,..."
You MUST immediately call: remove_background(image="data:image/jpeg;base64,...")
```

## Expected Behavior After Fix

When you click "Remove Background" button now, console should show:

```
🤖 Agent Context Inputs
  User Message: Remove the background from the current image
  Context Object: {
    ai_operation: { name: 'remove-background', params: {} },
    preview_image_url: 'data:image/jpeg;base64,...',
    ...
  }
  🔴 PRIORITY 1: Explicit AI Operation Detected
    Operation: { name: 'remove-background', params: {} }
  📚 Available MCP Tools: [
    'remove_background',    ← Tool exists!
    ...
  ]

🎯 Agent Decision
  Agent decided to call 1 tool(s):
  📞 Tool Call: remove_background    ← Tool called!
    Arguments: { image: "data:image/jpeg;base64,..." }

[Chat API] ===== Executing MCP tool: remove_background =====
[MCP] Tool remove_background SUCCESS
```

## Testing

1. Generate an image (works as before)
2. Click "Remove Background" from operations menu
3. Check browser console for the logs above
4. Image should be processed and background removed

## Files Modified

- **`src/lib/gemini-agent.ts`**: Enhanced Priority 1 system prompt with stronger directives
- **`AGENT_DEBUGGING_GUIDE.md`**: Documented the issue and fix

## Why This Fix Works

LLM models like Gemini respond better to:
1. **Strong imperatives** ("MUST", "REQUIRED", "mandatory")
2. **Explicit examples** (showing exact format)
3. **Negative constraints** ("DO NOT respond with text only")
4. **Clear mappings** (exact input → output pairs)

The original prompt was too permissive, allowing the agent to decide whether to call a tool. The new prompt makes it clear that tool calling is **not optional** for Priority 1 operations.

## Fallback

If the issue persists even after this fix, it indicates:
1. Gemini model needs more examples in the prompt
2. May need to adjust the model temperature (lower = more deterministic)
3. Could try adding few-shot examples to the chat history
4. Consider switching to a different model or API approach

---

**Status:** ✅ Fix Applied
**Test Required:** Yes - run remove-background operation and verify tool call in console

