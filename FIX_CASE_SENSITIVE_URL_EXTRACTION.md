# Fix: Case-Sensitive URL Extraction Bug

## Problem

When using `remove_background` operation, the MCP URL was not being extracted, resulting in:
1. **Massive base64 strings** (320K+ chars) being sent to the agent instead of small URLs
2. **Lost structured prompts** from previous images
3. **Failed subsequent operations** because the agent's context was polluted

## Root Cause

### The Bug (Line 64 in `src/app/api/chat/route.ts`)

```typescript
// ❌ OLD CODE (BROKEN)
const urlMatch = content.text.match(/for full image Preview use:\s*(https?:\/\/[^\s]+)/);
//                                                                                      ^ Missing 'i' flag!
```

### The Issue

**MCP Response Format:**
```json
{
  "type": "text",
  "text": "For full image Preview use: https://d1ei2xrl63k822.cloudfront.net/..."
         // ^ Capital 'F'!
}
```

**Regex Pattern:** Searched for lowercase `"for"`

**Result:** No match → URL not extracted → `imageUrl = ""` → Base64 fallback used

## Impact Analysis

### What Worked ✅
- **`text_to_image`**: Always returned URLs in the same format, regex matched

### What Failed ❌
- **`remove_background`**: URL not extracted
  - Agent received 320K char base64 string instead of small URL
  - Token usage exploded (~80,000 extra tokens per operation!)
  - Structured prompt lost (not preserved)
- **Any subsequent operation**: Failed due to invalid context
  - Agent couldn't process huge base64 strings efficiently
  - Agent detected wrong priority (Priority 5 instead of Priority 3)
  - No tool calls made

## The Fix

```typescript
// ✅ NEW CODE (FIXED)
const urlMatch = content.text.match(/for full image Preview use:\s*(https?:\/\/[^\s]+)/i);
//                                                                                      ^ Added 'i' flag
```

**Now handles all variations:**
- `"for full image Preview use: ..."` ✅
- `"For full image Preview use: ..."` ✅ (Capital F - the actual MCP format)
- `"FOR FULL IMAGE PREVIEW USE: ..."` ✅

## Testing Evidence

### Before Fix (User's Experience)

**Sequence:**
1. Generate "sad clown" → ✅ Works (URL extracted)
2. Refine "make him cry" → ✅ Works (URL extracted)
3. **Remove background** → ❌ **URL NOT extracted**
   ```
   imageUrl: "",  // EMPTY!
   preview_image_url: '[BASE64 DATA: data:image/jpeg;base64,/9j/4AA... (320723 chars)]'
   ```
4. **Replace background** "birthday party" → ❌ **Agent fails**
   ```
   🔵 PRIORITY 5: Standard Text-to-Image (Default)  // ❌ Wrong priority!
   💬 Agent Response (no tool calls)  // ❌ No action!
   ```

### After Fix (Expected)

**Sequence:**
1. Generate "sad clown" → ✅ Works
2. Refine "make him cry" → ✅ Works
3. **Remove background** → ✅ **URL extracted correctly**
   ```
   imageUrl: "https://d1ei2xrl63k822.cloudfront.net/api/res/0c7a2f4161bf494e867dc4a2778d5ef6.png?..."
   preview_image_url: "https://..." (50 chars, not 320K!)
   ```
4. **Replace background** "birthday party" → ✅ **Works correctly**
   ```
   🟠 PRIORITY 3: Replace Background  // ✅ Correct priority!
   📞 Tool Call: generate_background  // ✅ Correct tool!
   ```

## Token Savings

### Before (Per Operation After remove_background)
- Base64 image: ~320,000 chars
- Approximate tokens: ~80,000 tokens
- **Cost per operation: ~$0.40 USD** (at $5/M tokens)

### After (With URL)
- URL: ~200 chars
- Approximate tokens: ~50 tokens
- **Cost per operation: ~$0.0003 USD** (at $5/M tokens)

**Savings: 99.9% reduction in image-related token usage!** 💰

## Files Modified

1. **`src/app/api/chat/route.ts`** (Line 64)
   - Added `/i` flag to regex for case-insensitive URL extraction

## How to Verify Fix

**Test Sequence:**
1. Generate any image
2. Run `remove_background` operation
3. Check console logs for:
   ```
   Chat API: Extracted MCP image URL: https://...  ✅
   Using MCP image URL for future context: https://...  ✅
   ```
4. Try another operation (e.g., "replace background")
5. Check console logs show:
   ```
   📤 Preparing context for agent:
     - preview_image_url: https://... (short!)  ✅
   ```

**Expected:** All operations work, URLs extracted, no base64 in context!

---

**Status:** ✅ Fixed  
**Priority:** CRITICAL (was blocking all operations after remove_background)  
**Impact:** Token usage, cost efficiency, operation success rate

