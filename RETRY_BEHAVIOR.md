# MCP Retry Behavior - Quick Reference

## Retry Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     MCP Tool Call Request                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Attempt 1   │
                    │   (Immediate) │
                    └───────┬───────┘
                            │
                    ┌───────▼────────┐
                    │   Success?     │
                    └───┬────────┬───┘
                        │        │
                   YES  │        │ NO
                        │        │
                        │        ▼
                        │   ┌────────────────┐
                        │   │  Wait 1000ms   │
                        │   └───────┬────────┘
                        │           │
                        │           ▼
                        │   ┌───────────────┐
                        │   │   Attempt 2   │
                        │   └───────┬───────┘
                        │           │
                        │   ┌───────▼────────┐
                        │   │   Success?     │
                        │   └───┬────────┬───┘
                        │       │        │
                        │  YES  │        │ NO
                        │       │        │
                        │       │        ▼
                        │       │   ┌────────────────┐
                        │       │   │  Wait 2000ms   │
                        │       │   └───────┬────────┘
                        │       │           │
                        │       │           ▼
                        │       │   ┌───────────────┐
                        │       │   │   Attempt 3   │
                        │       │   └───────┬───────┘
                        │       │           │
                        │       │   ┌───────▼────────┐
                        │       │   │   Success?     │
                        │       │   └───┬────────┬───┘
                        │       │       │        │
                        │       │  YES  │        │ NO
                        │       │       │        │
                        ▼       ▼       ▼        ▼
                    ┌───────────────┐    ┌──────────────┐
                    │ Return Result │    │ Throw Error  │
                    └───────────────┘    └──────────────┘
```

## Timing Breakdown

| Attempt | When | Cumulative Time |
|---------|------|----------------|
| **1** | Immediate | 0s |
| **2** | After 1s wait | 1s |
| **3** | After 2s wait | 3s |

**Maximum Delay:** 3 seconds (if all attempts fail)

## Error Code Behavior

### Will Retry
- ✅ **400** - Bad Request (transient)
- ✅ **408** - Request Timeout
- ✅ **429** - Too Many Requests (Rate Limit)
- ✅ **500** - Internal Server Error
- ✅ **502** - Bad Gateway
- ✅ **503** - Service Unavailable
- ✅ **504** - Gateway Timeout

### Won't Retry (Abort Immediately)
- ❌ **401** - Unauthorized (bad credentials)
- ❌ **403** - Forbidden (insufficient permissions)
- ❌ **404** - Not Found (resource doesn't exist)

## Example Scenarios

### Scenario 1: Success on First Try ✨
```
[00:00.000] Attempt 1 → SUCCESS ✓
Total Time: ~500ms (no retries)
```

### Scenario 2: Success on Second Try 🔄
```
[00:00.000] Attempt 1 → FAIL ✗
[00:01.000] Attempt 2 → SUCCESS ✓
Total Time: ~1.5s
```

### Scenario 3: Success on Third Try 🔄🔄
```
[00:00.000] Attempt 1 → FAIL ✗
[00:01.000] Attempt 2 → FAIL ✗
[00:03.000] Attempt 3 → SUCCESS ✓
Total Time: ~3.5s
```

### Scenario 4: All Attempts Fail ❌
```
[00:00.000] Attempt 1 → FAIL ✗
[00:01.000] Attempt 2 → FAIL ✗
[00:03.000] Attempt 3 → FAIL ✗
Error: "MCP tool 'text_to_image' failed after 3 attempts"
Total Time: ~3.5s
```

### Scenario 5: Non-Retryable Error 🚫
```
[00:00.000] Attempt 1 → FAIL (401 Unauthorized) ✗
Error: "Non-retryable error code 401, aborting retries"
Total Time: ~500ms (no retries)
```

## Console Log Examples

### Successful First Attempt
```log
[MCP] Calling tool text_to_image (attempt 1/3) with args: {...}
[MCP] Tool text_to_image SUCCESS on attempt 1
[Chat API] Tool text_to_image SUCCESS
```

### Successful Retry
```log
[MCP] Calling tool text_to_image (attempt 1/3) with args: {...}
[MCP] Tool text_to_image failed on attempt 1/3: {...}
[MCP] Retry attempt 1/2 after 1000ms delay...
[MCP] Calling tool text_to_image (attempt 2/3) with args: {...}
[MCP] Tool text_to_image SUCCESS on attempt 2
[Chat API] Tool text_to_image SUCCESS
```

### All Retries Exhausted
```log
[MCP] Calling tool text_to_image (attempt 1/3) with args: {...}
[MCP] Tool text_to_image failed on attempt 1/3: {...}
[MCP] Retry attempt 1/2 after 1000ms delay...
[MCP] Calling tool text_to_image (attempt 2/3) with args: {...}
[MCP] Tool text_to_image failed on attempt 2/3: {...}
[MCP] Retry attempt 2/2 after 2000ms delay...
[MCP] Calling tool text_to_image (attempt 3/3) with args: {...}
[MCP] Tool text_to_image failed on attempt 3/3: {...}
[MCP] All retry attempts exhausted for tool text_to_image
[Chat API] ===== Tool text_to_image FAILED =====
```

## Configuration Cheat Sheet

### Default Configuration
```typescript
// In src/app/api/chat/route.ts
const result = await mcpClient.callTool(toolCall.name, toolCall.args);
// Defaults: maxRetries=2, retryDelay=1000ms
```

### Conservative (Faster Failure)
```typescript
const result = await mcpClient.callTool(
  toolCall.name, 
  toolCall.args,
  1,    // Only 1 retry (2 total attempts)
  500   // 500ms delay
);
// Max time: ~1.5s
```

### Aggressive (More Resilient)
```typescript
const result = await mcpClient.callTool(
  toolCall.name, 
  toolCall.args,
  5,    // 5 retries (6 total attempts)
  1000  // 1s initial delay
);
// Delays: 1s, 2s, 4s, 8s, 16s
// Max time: ~31s
```

### Minimal Delay (Fast Retry)
```typescript
const result = await mcpClient.callTool(
  toolCall.name, 
  toolCall.args,
  2,    // Standard retries
  100   // 100ms delay
);
// Delays: 100ms, 200ms
// Max time: ~1s
```

## Success Rate Impact

| Scenario | Before Fix | After Fix (3 attempts) | Improvement |
|----------|-----------|----------------------|-------------|
| 50% success rate | 50% | 87.5% | +37.5% |
| 60% success rate | 60% | 93.6% | +33.6% |
| 70% success rate | 70% | 97.3% | +27.3% |
| 80% success rate | 80% | 99.2% | +19.2% |

**Formula:** Success with retries = `1 - (1 - rate)^attempts`

## Performance Considerations

### Best Case (Success on First Try)
- **Overhead:** ~0ms
- **User Impact:** None

### Average Case (Success on Second Try)
- **Overhead:** ~1s
- **User Impact:** Minimal (async operation)

### Worst Case (All Attempts Fail)
- **Overhead:** ~3s
- **User Impact:** Moderate (but better than immediate failure)

## When to Adjust Retry Settings

### Increase Retries When:
- ✅ High failure rate due to server issues
- ✅ Critical operations that must succeed
- ✅ User is willing to wait longer
- ✅ Failures are known to be transient

### Decrease Retries When:
- ✅ Real-time requirements (low latency)
- ✅ Failures are likely permanent (bad config)
- ✅ Testing/debugging (want fast feedback)
- ✅ Cost per request is high

## Monitoring Tips

### Track Success Rates
```bash
# In server logs, count:
grep "SUCCESS on attempt" logs.txt | wc -l  # Total successes
grep "attempt 1.*SUCCESS" logs.txt | wc -l  # First attempt success
grep "attempt 2.*SUCCESS" logs.txt | wc -l  # Second attempt success
grep "attempt 3.*SUCCESS" logs.txt | wc -l  # Third attempt success
```

### Find Problem Prompts
```bash
# Find prompts that consistently fail
grep "All retry attempts exhausted" logs.txt -B 5
```

### Measure Average Retry Rate
```bash
# Calculate retry percentage
awk '/Retry attempt/ {retries++} /SUCCESS/ {total++} END {print retries/total*100 "%"}' logs.txt
```

## Quick Troubleshooting

| Symptom | Likely Cause | Action |
|---------|-------------|---------|
| All requests fail immediately | Bad credentials or config | Check API token |
| ~50% success rate | Rate limiting | Increase delays or reduce request rate |
| Random failures | Server instability | Default retry settings should help |
| Specific prompts fail | Prompt validation | Simplify prompts, avoid special chars |
| All retries timeout | Network issues | Check MCP server connectivity |

---

**See also:**
- `FIX_SUMMARY.md` - Complete fix documentation
- `TROUBLESHOOTING.md` - Detailed troubleshooting guide
- `src/lib/mcp-client.ts` - Implementation code

