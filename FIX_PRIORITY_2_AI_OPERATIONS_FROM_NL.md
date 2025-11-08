# Priority 2: AI Operations from Natural Language - Fix

## Problem

When a user has an image selected and asks for AI operations using natural language (e.g., "put the image in 3 aspect ratios" or "change the background to 3 options"), the agent was incorrectly calling `text_to_image` instead of the appropriate AI operation tools like `expand_image` or `generate_background`.

### Root Cause

The priority system had a gap:
- **Priority 1**: Only detects explicit AI operations (when user clicks a button)
- **Priority 2** (old): Only for masked editing
- **Priority 3-5**: Other scenarios
- ❌ **Missing**: Detection of AI operations from natural language when an image is present

When a user types "put in 3 aspect ratios" while viewing an image:
- ❌ No `ai_operation` set (Priority 1 doesn't trigger)
- ❌ No `mask_data` (Priority 2 doesn't trigger)
- ❌ Falls through to Priority 5 → calls `text_to_image` ❌

## Solution

### Added NEW PRIORITY 2: AI Operations from Natural Language

Inserted between Priority 1 (Explicit Operations) and Priority 3 (Masked Editing):

```typescript
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
```

### Updated Priority Numbers

- Priority 1: Explicit AI Operations (unchanged)
- **Priority 2: AI Operations from Natural Language** (NEW)
- Priority 3: Masked Editing (was Priority 2)
- Priority 4: Reference Image Generation (was Priority 3)
- Priority 5: Conversational Refinement (was Priority 4)
- Priority 6: Standard Text-to-Image (was Priority 5)

### Enhanced Debugging

Updated the debugging logs to detect and display Priority 2:

```typescript
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
```

## Expected Behavior After Fix

### Test Case 1: "put the image in 3 aspect ratios"

**User Action:**
1. Generate an image
2. Keep it selected
3. Type in chat: "put the image in 3 aspect ratios"

**Expected Agent Response:**
```
🟡 PRIORITY 2: AI Operations from Natural Language
  Detected keywords in: put the image in 3 aspect ratios
  Preview image type: MCP URL
🎯 Agent Decision
  📞 Tool Call: expand_image
    Arguments: {
      image: 'https://...',
      target_aspect_ratio: '16:9'
    }
📋 Execution Plan: {
  current: 1, total: 3, plan_type: 'batch_variations',
  steps: [
    {step: 1, tool: 'expand_image', args: {image: '...', target_aspect_ratio: '16:9'}},
    {step: 2, tool: 'expand_image', args: {image: '...', target_aspect_ratio: '9:16'}},
    {step: 3, tool: 'expand_image', args: {image: '...', target_aspect_ratio: '21:9'}}
  ]
}
```

**Result:**
✅ 3 images in gallery, all with different aspect ratios
✅ Same subject/content, just expanded to different dimensions

### Test Case 2: "change the background to 3 options"

**User Action:**
1. Generate an image
2. Keep it selected
3. Type in chat: "change the background to 3 options: beach, mountains, city"

**Expected Agent Response:**
```
🟡 PRIORITY 2: AI Operations from Natural Language
  Detected keywords in: change the background to 3 options: beach, mountains, city
  Preview image type: MCP URL
🎯 Agent Decision
  📞 Tool Call: generate_background
    Arguments: {
      image: 'https://...',
      prompt: 'beach background'
    }
📋 Execution Plan: {
  current: 1, total: 3, plan_type: 'batch_variations',
  steps: [
    {step: 1, tool: 'generate_background', args: {image: '...', prompt: 'beach background'}},
    {step: 2, tool: 'generate_background', args: {image: '...', prompt: 'mountains background'}},
    {step: 3, tool: 'generate_background', args: {image: '...', prompt: 'city background'}}
  ]
}
```

**Result:**
✅ 3 images in gallery
✅ Same foreground subject
✅ 3 different backgrounds (beach, mountains, city)

## Testing Instructions

1. **Restart your dev server**

2. **Test Aspect Ratios:**
   - Generate any image (e.g., "a dog")
   - Keep it selected
   - Type: "put the image in 3 aspect ratios"
   - Expected log: `🟡 PRIORITY 2: AI Operations from Natural Language`
   - Expected tool: `expand_image` (3 times)
   - Expected result: 3 images with different aspect ratios

3. **Test Background Changes:**
   - Generate any image
   - Keep it selected
   - Type: "change the background to 3 options: forest, desert, ocean"
   - Expected log: `🟡 PRIORITY 2: AI Operations from Natural Language`
   - Expected tool: `generate_background` (3 times)
   - Expected result: 3 images with different backgrounds

4. **Test Other Operations:**
   - "remove background" → should call `remove_background`
   - "blur the background" → should call `blur_background`
   - "upscale this" → should call `increase_resolution`
   - "enhance quality" → should call `enhance_image`

## Files Changed

**src/lib/gemini-agent.ts**
- Added Priority 2: AI Operations from Natural Language
- Renumbered existing priorities (2→3, 3→4, 4→5, 5→6)
- Updated debugging logs to detect and display Priority 2
- Added keyword detection for common AI operations

## Key Improvements

✅ Agent now detects AI operations from natural language
✅ Works with batch requests ("3 aspect ratios", "3 backgrounds")  
✅ Prioritizes AI operations over text-to-image when an image is present  
✅ Better UX - users don't have to click buttons, just describe what they want  
✅ Comprehensive keyword coverage for all AI operations  

