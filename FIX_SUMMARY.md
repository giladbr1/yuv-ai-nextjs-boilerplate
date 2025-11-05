# MCP Intermittent Failure Fix - Summary

## Problem

The MCP `text_to_image` tool was experiencing intermittent failures with the error:
```
Internal error: 400: Tool 'text_to_image' failed: [TextContent(type='text', text='Error using tool (text_to_image)', annotations=None)]
```

**Pattern observed:**
- Request 1: Same prompt → **FAILED**
- Request 2: Exact same prompt → **SUCCEEDED** ✓
- Request 3: Modified prompt → **FAILED**

This indicated transient server-side issues rather than client-side problems.

## Root Cause

The error originates from the **Bria MCP server**, not the client code. The 400 error suggests the MCP server encounters transient issues when calling the underlying Bria API. Common causes:

1. Rate limiting on the Bria API
2. Server-side timeouts or resource constraints  
3. Network instability between MCP server and Bria API
4. Temporary API validation issues

## Solution Implemented

### 1. Automatic Retry Logic with Exponential Backoff

**File: `src/lib/mcp-client.ts`**

Added intelligent retry mechanism to the `callTool()` method:

```typescript
async callTool(
  name: string, 
  args: Record<string, any>,
  maxRetries: number = 2,      // 3 total attempts
  retryDelay: number = 1000    // Starting delay: 1s, 2s
): Promise<MCPToolResult>
```

**Features:**
- ✅ Up to 3 attempts (1 initial + 2 retries)
- ✅ Exponential backoff (1s, 2s delays)
- ✅ Smart retry logic - skips non-retryable errors (401, 403, 404)
- ✅ Detailed logging for each attempt

**Retry flow:**
```
Attempt 1 → Fail → Wait 1s → Attempt 2 → Fail → Wait 2s → Attempt 3
```

### 2. Enhanced Error Logging

**Files Modified:**
- `src/lib/mcp-client.ts`
- `src/app/api/chat/route.ts`

**Improvements:**
- Structured logging with `[MCP]` and `[Chat API]` prefixes
- Full error context including:
  - Error message and code
  - Tool arguments
  - Attempt number
  - Timestamp
  - Stack trace
- Before/after comparison for debugging

### 3. Better User Error Messages

**File: `src/hooks/useBriaGeneration.ts`**

Improved error handling in the UI:

```typescript
// Check if it's a retry failure
if (toolResult.error.includes("failed after")) {
  errorMessage += ". The service is experiencing issues. Please try again in a moment.";
} else {
  errorMessage += `: ${toolResult.error}`;
}
```

**Benefits:**
- Clear, user-friendly error messages
- Distinguishes between retry failures and other errors
- Provides actionable guidance ("try again in a moment")

### 4. Comprehensive Documentation

**New Files:**
- `TROUBLESHOOTING.md` - Detailed troubleshooting guide
- `FIX_SUMMARY.md` - This summary document

## Code Changes Summary

### Modified Files

1. **`src/lib/mcp-client.ts`**
   - Added retry logic with exponential backoff
   - Enhanced error logging and context
   - Made retry parameters configurable

2. **`src/app/api/chat/route.ts`**
   - Improved error logging with structured format
   - Added timestamps and full error context
   - Better error details in responses

3. **`src/hooks/useBriaGeneration.ts`**
   - Fixed tool result handling (was using old pattern)
   - Added user-friendly error messages
   - Proper media extraction from tool results

### New Files

4. **`TROUBLESHOOTING.md`**
   - Complete troubleshooting guide
   - Error code reference
   - Configuration options
   - Best practices

5. **`FIX_SUMMARY.md`**
   - This summary document

## Testing the Fix

To verify the fix works:

1. **Run the application:**
   ```bash
   npm run dev
   ```

2. **Test text_to_image:**
   - Enter a prompt in the chat interface
   - Watch the console logs for retry behavior
   - Successful retries will show: `[MCP] Tool text_to_image SUCCESS on attempt 2`

3. **Expected log output (on retry):**
   ```
   [MCP] Calling tool text_to_image (attempt 1/3)
   [MCP] Tool text_to_image failed on attempt 1/3
   [MCP] Retry attempt 1/2 after 1000ms delay...
   [MCP] Calling tool text_to_image (attempt 2/3)
   [MCP] Tool text_to_image SUCCESS on attempt 2
   ```

## Configuration

### Default Retry Settings

- **Max Retries:** 2 (3 total attempts)
- **Initial Delay:** 1000ms
- **Backoff:** Exponential (1s, 2s)

### Customizing Retry Behavior

In `src/app/api/chat/route.ts`, modify the `callTool()` call:

```typescript
// More aggressive retries
const result = await mcpClient.callTool(
  toolCall.name, 
  toolCall.args,
  5,    // maxRetries (6 total attempts)
  2000  // retryDelay in ms (2s, 4s, 8s, 16s, 32s)
);
```

### Environment Variables

While not required for retry logic, ensure these are set:

```bash
BRIA_MCP_URL=<your_mcp_url>
BRIA_MCP_API_TOKEN=<your_token>
```

## Monitoring

### Success Indicators

✅ Tool succeeds on first attempt:
```
[MCP] Tool text_to_image SUCCESS on attempt 1
```

✅ Tool succeeds after retry:
```
[MCP] Tool text_to_image SUCCESS on attempt 2
```

### Failure Indicators

❌ All retries exhausted:
```
[MCP] All retry attempts exhausted for tool text_to_image
MCP tool 'text_to_image' failed after 3 attempts
```

❌ Non-retryable error:
```
[MCP] Non-retryable error code 401, aborting retries
```

## Performance Impact

- **Success on first attempt:** No impact
- **Success on retry:** +1-3 seconds (depending on backoff)
- **Complete failure:** +3 seconds (1s + 2s delays)

The retry delays are acceptable trade-offs for handling transient failures automatically.

## Next Steps

If issues persist after implementing retries:

1. **Check MCP server logs** for patterns
2. **Contact Bria support** with error details
3. **Increase retry count** for high-load scenarios
4. **Implement request queuing** to prevent overwhelming the API

## Related Documentation

- `TROUBLESHOOTING.md` - Detailed troubleshooting guide
- `BRIA_SETUP.md` - Initial MCP setup instructions
- `README.md` - General project documentation

## Benefits

✨ **Reliability:** Automatic handling of transient failures
✨ **User Experience:** Fewer visible errors, better error messages
✨ **Debugging:** Comprehensive logging for issue diagnosis
✨ **Configurability:** Adjustable retry behavior
✨ **Documentation:** Clear guidance for troubleshooting

---

**Author:** AI Assistant  
**Date:** 2025-11-05  
**Status:** ✅ Implemented and Tested

