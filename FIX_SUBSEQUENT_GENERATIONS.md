# Fix: Subsequent Generations Losing Context Data

## Problem

After the first successful generation, subsequent generations were failing because:
1. The agent wasn't receiving `imageUrl` for token-efficient context
2. The agent wasn't receiving `structured_prompt` for refinement
3. Only the first image in the gallery had complete metadata
4. **CRITICAL**: URL extraction from MCP was case-sensitive, causing URLs to be lost

## Root Causes

### 1. Asynchronous State Update Issue

**Original Problem:**

```typescript
// ❌ OLD CODE (BROKEN)
const newMedia = addToGallery({
  type: "image",
  url: mediaUrl,  // Only URL initially
});

// Then try to update with metadata...
const updates = {};
if (toolResult.imageUrl) {
  updates.imageUrl = toolResult.imageUrl;
}
// Update state again...
setGeneratedMedia(prev => prev?.id === newMedia.id ? {...prev, ...updates} : prev);
```

**Problem:** React state updates are asynchronous. By the time we try to update with metadata:
1. `generatedMedia` might still reference the old state
2. The ID comparison might fail
3. The metadata never gets attached to the new item
4. Subsequent operations reference an incomplete `generatedMedia` object

### 2. Case-Sensitive URL Extraction

**Critical Bug in `src/app/api/chat/route.ts`:**

```typescript
// ❌ OLD CODE (BROKEN) - Line 64
const urlMatch = content.text.match(/for full image Preview use:\s*(https?:\/\/[^\s]+)/);
```

**Problem:** MCP returns `"For full image Preview use:"` (capital **F**) but regex searched for lowercase `"for"`.

**Result:** 
- ✅ `text_to_image` worked (always returns URL in same format)
- ❌ `remove_background` failed (URL not extracted → imageUrl empty → base64 used instead)
- ❌ Any subsequent operations on that image failed (no URL = huge base64 in context)

## Solutions

### Solution 1: Single-Pass Data Preparation

**Include all data upfront when calling `addToGallery`:**

```typescript
// ✅ NEW CODE (FIXED)
// Prepare complete media object with all metadata upfront
const mediaData: Omit<GeneratedMedia, 'id' | 'timestamp'> = {
  type: toolResult.mediaType || "image",
  url: toolResult.mediaUrl,
};

// Add imageUrl if available (for token-efficient context)
if (toolResult.imageUrl) {
  mediaData.imageUrl = toolResult.imageUrl;
}

// Add metadata if available (for Priority 4 refinement)
if (toolResult.metadata || toolResult.structuredPrompt) {
  mediaData.metadata = {
    structuredPrompt: toolResult.structuredPrompt,
    ...toolResult.metadata,
  };
}

// Add to gallery with complete data (single state update)
addToGallery(mediaData);
```

### Solution 2: Case-Insensitive URL Extraction

**Fixed regex with `/i` flag:**

```typescript
// ✅ NEW CODE (FIXED) - Line 64
const urlMatch = content.text.match(/for full image Preview use:\s*(https?:\/\/[^\s]+)/i);
//                                                                                      ^ Added 'i' flag
```

**Now handles:**
- `"for full image Preview use: ..."` ✅
- `"For full image Preview use: ..."` ✅
- `"FOR FULL IMAGE PREVIEW USE: ..."` ✅

## What Changed

### Before
1. Call `addToGallery` with minimal data → creates incomplete item
2. Try to update that item with metadata → might fail due to async state
3. URL extraction fails for `remove_background` (case mismatch)
4. `generatedMedia` has incomplete data
5. Next operation uses incomplete context → fails

### After
1. Extract URL correctly (case-insensitive) ✅
2. Prepare complete media object with all fields
3. Call `addToGallery` once with complete data → creates complete item
4. `generatedMedia` has all data immediately
5. Next operation uses complete context → succeeds ✅

## Files Modified

**`src/hooks/useBriaGeneration.ts`:**
- ✅ Updated `sendMessage` tool result handling
- ✅ Updated `generate` tool result handling
- ✅ Added debug logging to track state

## Debug Output

You'll now see comprehensive logging in console:

### When Adding to Gallery
```
➕ Adding item to gallery:
  - ID: gallery-1699999999999
  - Has imageUrl: true
  - imageUrl: https://d1ei2xrl63k822.cloudfront.net/api/res/...
  - Has metadata: true
  - Has structured prompt: true
  - Full metadata keys: ['structuredPrompt']
```

### When Switching Gallery Items
```
🔄 Switching to gallery item: gallery-1699999999999
  - Item has imageUrl: true
  - Item imageUrl: https://d1ei2xrl63k822.cloudfront.net/api/res/...
  - Item has metadata: true
  - Item has structured prompt: true
```

### When Preparing Context for Agent
```
Using MCP image URL for future context: https://...
Stored structured prompt for refinement

📤 Preparing context for agent:
  - generatedMedia exists: true
  - generatedMedia.id: gallery-1699999999999
  - generatedMedia.imageUrl: https://d1ei2xrl63k822.cloudfront.net/api/res/...
  - generatedMedia.url: https://d1ei2xrl63k822.cloudfront.net/api/res/...
  - Has structured prompt: true
  - Context preview_image_url: https://d1ei2xrl63k822.cloudfront.net/api/res/...
```

## Testing

### Test Scenario 1: Multiple Generations
1. Generate first image → Check logs for "Stored MCP image URL"
2. Generate second image → Check logs show new image has URL and metadata
3. Both should work ✅

### Test Scenario 2: Operations After Generation
1. Generate an image
2. Click "Remove Background"
3. Check logs: "preview_image_url" should show MCP URL
4. Operation should succeed ✅

### Test Scenario 3: Refinement
1. Generate an image
2. Send chat: "make it brighter"
3. Check logs: "Has structured prompt: true"
4. Refinement should maintain original composition ✅

## Why This Fix Works

### Single Source of Truth
- All data added to state in one operation
- No race conditions between multiple state updates
- `generatedMedia` always has complete data

### Immediate Availability
- `imageUrl` available immediately for next operation
- `structured_prompt` available for refinement
- No waiting for async updates

### Consistent State
- Every item in gallery has same data structure
- Switching between items works correctly
- No partial/incomplete items

## Expected Behavior After Fix

### First Generation
```
✅ Creates image with URL + metadata
✅ generatedMedia.imageUrl = "https://..."
✅ generatedMedia.metadata.structuredPrompt = {...}
```

### Second Generation
```
✅ Creates new image with URL + metadata
✅ Previous image still has its data
✅ New image becomes active generatedMedia
✅ Has its own URL + metadata
```

### Third Generation
```
✅ All previous images retain their data
✅ New image has complete data
✅ Gallery maintains history correctly
```

---

**Status:** ✅ Fixed
**Issue:** Async state update race condition
**Solution:** Single-pass data preparation
**Testing:** Ready for validation

