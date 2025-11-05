# Troubleshooting Guide

## MCP Tool Failures - Intermittent Errors

### Problem Description

You may encounter intermittent failures when calling MCP tools like `text_to_image`, where:
- The same request fails on first attempt but succeeds on retry
- Different prompts may fail randomly
- Error message: `Internal error: 400: Tool 'text_to_image' failed`

### Root Cause

The error originates from the **Bria MCP server**, not from the client code. The 400 error suggests the MCP server is encountering transient issues when calling the underlying Bria API. This can be caused by:

1. **Rate limiting** on the Bria API
2. **Server-side timeouts** or resource constraints
3. **Network instability** between MCP server and Bria API
4. **API validation issues** with certain prompt patterns

### Solution Implemented

The codebase now includes automatic retry logic with exponential backoff:

1. **Retry Mechanism**: Up to 3 attempts (1 initial + 2 retries)
2. **Exponential Backoff**: 1s, 2s delays between retries
3. **Enhanced Logging**: Detailed error information for debugging
4. **Smart Retry Logic**: Skips retries for non-retryable errors (401, 403, 404)

### Code Changes

#### `src/lib/mcp-client.ts`
- Added `callTool()` with retry logic and exponential backoff
- Enhanced error logging with full context
- Configurable retry parameters (maxRetries, retryDelay)

#### `src/app/api/chat/route.ts`
- Improved error logging with timestamps and full error details
- Better error context in responses

### Configuration

The retry behavior uses these defaults:
- **maxRetries**: 2 (total 3 attempts)
- **retryDelay**: 1000ms (exponential backoff: 1s, 2s)

To adjust retry behavior, modify the `callTool()` call in `src/app/api/chat/route.ts`:

```typescript
// Custom retry configuration
const result = await mcpClient.callTool(
  toolCall.name, 
  toolCall.args,
  3,    // maxRetries
  2000  // retryDelay in ms
);
```

### Monitoring and Debugging

When errors occur, check the server logs for:

```
[MCP] Calling tool text_to_image (attempt 1/3)
[MCP] Tool text_to_image failed on attempt 1/3
[MCP] Retry attempt 1/2 after 1000ms delay...
[MCP] Tool text_to_image SUCCESS on attempt 2
```

Error details include:
- Error message and code
- Full tool arguments
- Attempt number
- Timestamp
- Stack trace

### Best Practices

1. **Monitor Logs**: Watch for patterns in failures (specific prompts, times of day)
2. **Report to Bria**: If failures persist, contact Bria support with:
   - MCP server URL
   - Failing prompts
   - Error logs
   - Timestamps

3. **Prompt Guidelines**:
   - Avoid overly long prompts (>500 chars)
   - Use clear, descriptive language
   - Avoid special characters or unusual formatting

### Temporary Workarounds

If issues persist:

1. **Increase Retry Count**:
```typescript
const result = await mcpClient.callTool(toolCall.name, toolCall.args, 5, 2000);
```

2. **Check MCP Server Status**:
   - Verify `BRIA_MCP_URL` is correct
   - Verify `BRIA_MCP_API_TOKEN` is valid
   - Test MCP server directly: `curl -X POST $BRIA_MCP_URL -H "api_token: $BRIA_MCP_API_TOKEN"`

3. **Rate Limiting**:
   - Add delays between consecutive requests
   - Implement request queuing

### Getting Help

If problems persist after implementing retries:

1. Check the [Bria MCP Documentation](https://bria.ai/docs)
2. Contact Bria support with error logs
3. Check for service status updates
4. Review API rate limits and quotas

### Error Code Reference

| Error Code | Meaning | Retry? |
|------------|---------|--------|
| 400 | Bad Request (transient) | ✅ Yes |
| 401 | Unauthorized | ❌ No |
| 403 | Forbidden | ❌ No |
| 404 | Not Found | ❌ No |
| 429 | Rate Limited | ✅ Yes |
| 500 | Server Error | ✅ Yes |
| 503 | Service Unavailable | ✅ Yes |

Note: Current implementation retries 400 errors, but skips 401/403/404. This can be adjusted based on your needs.

