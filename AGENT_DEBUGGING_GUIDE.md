# Agent Debugging Guide - Tool Call Failures

## Issue Diagnosed

The agent detected **Priority 1: Explicit AI Operation** correctly but **failed to call any MCP tool**. This means:
- ✅ Context detection working
- ❌ Tool selection/calling failing

## Enhanced Debugging Features Added

### 1. Available Tools Logging
The console now shows what MCP tools are available to the agent:

```
🤖 Agent Context Inputs
  User Message: ...
  Context Object: {...}
  🔴 PRIORITY 1: Explicit AI Operation Detected
    Operation: { name: 'remove-background', params: {} }
  📚 Available MCP Tools: ["text_to_image", "background_removal", "upscale", ...]
```

### 2. Enhanced System Prompt
Added explicit mapping instructions for common operations:

```
"remove-background" → look for: remove_background, background_removal, bg_remove
"blur-background" → look for: blur_background, background_blur
"enhance-image" → look for: enhance, upscale, image_enhancement
... etc
```

### 3. Semantic Matching Instruction
Agent now instructed to find "closest semantic match" if no exact match exists.

## Diagnostic Checklist

When you see "💬 Agent Response (no tool calls)", check these in order:

### ✅ Step 1: Check Available Tools
Look at the "📚 Available MCP Tools" log line. Is there a tool that matches the operation?

**Example:**
- Operation: `remove-background`
- Available tools: `["text_to_image", "background_removal", "upscale"]`
- **Expected match:** `background_removal`

### ✅ Step 2: Check Name Format Mismatch
Common mismatches:
- UI sends: `remove-background` (kebab-case)
- MCP has: `remove_background` (snake_case)
- Agent should match these semantically

### ✅ Step 3: Check Preview Image URL
For Priority 1, the agent needs `preview_image_url` to process. Check if it's present:

```javascript
preview_image_url: "data:image/png;base64,..." // ✅ Good
preview_image_url: null // ❌ Bad - no image to process
```

### ✅ Step 4: Check Agent's Response Text
Look at the agent's text response for clues:

```
💬 Agent Response (no tool calls): I need an image to remove the background from.
```

This tells you the agent understood but couldn't execute due to missing context.

## Common Failure Scenarios

### Scenario 1: Tool Doesn't Exist
**Symptoms:**
- Operation: `remove-background`
- Available tools: `["text_to_image", "upscale"]`
- No background removal tool available

**Solution:** MCP server doesn't support this operation. Either:
1. Add the tool to the MCP server
2. Update UI to hide unsupported operations

### Scenario 2: Name Mismatch
**Symptoms:**
- Operation: `remove-background`
- Available tools: `["remove_bg", ...]`
- Agent doesn't match `remove-background` to `remove_bg`

**Solution:** The enhanced system prompt should handle this, but if not:
1. Add more mapping examples to the system prompt
2. Normalize names in the operation context

### Scenario 3: Missing Context
**Symptoms:**
- Operation detected correctly
- Tool exists
- But `preview_image_url` is `null`

**Solution:** Ensure an image is generated/uploaded before triggering the operation.

### Scenario 4: Parameter Mismatch
**Symptoms:**
- Agent tries to call tool but gets parameter validation error
- Look in later logs for tool execution errors

**Solution:** Check tool's parameter schema vs what agent is passing.

## FIXED: The "remove-background" Issue

### Root Cause (Diagnosed from logs line 834-868)
The agent received all correct context:
- ✅ `ai_operation: { name: 'remove-background', params: {} }`
- ✅ `preview_image_url: 'data:image/jpeg;base64,...'`
- ✅ Tool exists: `'remove_background'` in available tools
- ❌ **But returned empty response with no tool calls**

**Problem:** Gemini was not being directive enough to force a tool call.

### Solution Applied
Enhanced the Priority 1 system prompt with:
1. **Stronger directives:** "MUST call a tool", "MUST NOT respond with text only"
2. **Exact name mappings:** `"remove-background" → call tool "remove_background"`
3. **Concrete example:** Shows exact tool call format expected
4. **Mandatory requirement:** "The tool call is mandatory - no text-only response is acceptable"

### How to Verify the Fix
Run the remove-background operation again and check console:

```
🤖 Agent Context Inputs
  🔴 PRIORITY 1: Explicit AI Operation Detected
    Operation: { name: 'remove-background', params: {} }
  📚 Available MCP Tools: ['remove_background', ...]
  
🎯 Agent Decision
  Agent decided to call 1 tool(s):
  📞 Tool Call: remove_background
    Arguments: { image: "data:image/jpeg;base64,..." }
```

If you still see `💬 Agent Response (no tool calls)`, the issue is with Gemini's model behavior and may require additional prompt engineering.

## Testing After Fix

Run the operation again and check console:

```
🤖 Agent Context Inputs
  ...
  📚 Available MCP Tools: ["text_to_image", "background_removal", ...]
  
🎯 Agent Decision
  Agent decided to call 1 tool(s):
  📞 Tool Call: background_removal
    Arguments: { image: "data:image/png;...", ... }
```

This confirms:
- ✅ Tool was found
- ✅ Tool was called
- ✅ Parameters were passed

## Additional Debugging

If the issue persists, add this to your test:

```typescript
// In useBriaGeneration.ts, before calling sendMessage
console.log("=== DEBUG: Operation Context ===");
console.log("Operation:", operationContext);
console.log("Generated Media:", generatedMedia);
console.log("Preview URL:", generatedMedia?.url);
```

This helps verify the context is being prepared correctly at the source.

---

**Summary:** The enhanced debugging will now show you exactly which tools are available and help you diagnose name mismatches or missing tools.

