# MCP Response Parsing Guide

## MCP Response Structure

The Bria MCP server returns responses with multiple `content` items, each containing different types of data:

### Example Response from `text_to_image`

```json
{
  "content": [
    {
      "type": "image",
      "data": "/9j/4AAQSkZJRg...",  // Base64 image data
      "mimeType": "image/jpeg"
    },
    {
      "type": "text",
      "text": "for full image Preview use: https://d1ei2xrl63k822.cloudfront.net/api/res/b30666500acf463ab2a6e4b7e5e5242b.png?Expires=1763137930&Signature=Gc3IfX..."
    },
    {
      "type": "text",
      "text": "{\"short_description\": \"A fluffy, ginger tabby cat...\", \"objects\": [{...}], \"aesthetics\": {...}}"
    }
  ]
}
```

## Parsing Strategy

### 1. Extract Image URL

The MCP server provides a CloudFront URL in a text field with the format:
```
"for full image Preview use: [URL]"
```

**Extraction code:**
```typescript
const urlMatch = content.text.match(/for full image Preview use:\s*(https?:\/\/[^\s]+)/);
if (urlMatch && urlMatch[1]) {
  imageUrl = urlMatch[1];
}
```

**Example extracted URL:**
```
https://d1ei2xrl63k822.cloudfront.net/api/res/b30666500acf463ab2a6e4b7e5e5242b.png?Expires=...&Signature=...
```

### 2. Extract Structured Prompt

The MCP server provides a detailed structured prompt as a JSON string in a separate text field.

**Structure:**
```json
{
  "short_description": "A fluffy, ginger tabby cat...",
  "objects": [
    {
      "description": "A domestic short-haired cat...",
      "location": "center",
      "pose": "Sitting upright...",
      "expression": "Curious and calm..."
    }
  ],
  "background_setting": "The background is softly blurred...",
  "lighting": {
    "conditions": "bright daylight",
    "direction": "side-lit from left",
    "shadows": "soft, subtle shadows..."
  },
  "aesthetics": {
    "composition": "close-up, portrait composition...",
    "color_scheme": "warm analogous colors...",
    "mood_atmosphere": "serene, comforting...",
    "preference_score": "very high",
    "aesthetic_score": "very high"
  },
  "photographic_characteristics": {
    "depth_of_field": "shallow",
    "focus": "sharp focus on the cat's eyes...",
    "camera_angle": "eye-level...",
    "lens_focal_length": "portrait lens (e.g., 85mm)"
  },
  "style_medium": "photograph",
  "context": "This is a concept for...",
  "artistic_style": "realistic"
}
```

**Extraction code:**
```typescript
try {
  const parsed = JSON.parse(content.text);
  if (parsed && typeof parsed === 'object' && 
      (parsed.short_description || parsed.objects || parsed.aesthetics)) {
    structuredPrompt = parsed;
  }
} catch (e) {
  // Not JSON, continue checking other content items
}
```

### 3. Extract Base64 Image (Fallback)

If no URL is found, fall back to base64 image data:

```typescript
const imageContent = result.content.find((c: any) => 
  c.type === "image" || c.mimeType?.startsWith("image/")
);

if (imageContent) {
  const imageData = imageContent.data || imageContent.text || "";
  if (imageData && !imageData.startsWith("data:")) {
    const mimeType = imageContent.mimeType || "image/jpeg";
    mediaUrl = `data:${mimeType};base64,${imageData}`;
  }
}
```

## Usage in Context

### For Display
- **Use:** Base64 data URL or CloudFront URL
- **Where:** Canvas, gallery, UI components
- **Why:** Works offline, immediate display

### For Agent Context (Priority 4)
- **Use:** CloudFront URL (token-efficient)
- **Where:** Gemini agent context for refinement operations
- **Why:** Saves ~99.9% tokens vs sending full base64

### For Refinement
- **Use:** Structured prompt JSON
- **Where:** Agent context for conversational refinement
- **Why:** Maintains consistency when user asks to modify the image

## Complete Flow

```typescript
// 1. MCP returns response with multiple content items
const result = await mcpClient.callTool("text_to_image", args);

// 2. Parse all content items
let imageUrl = null;
let structuredPrompt = null;
let base64Data = null;

for (const content of result.content) {
  if (content.type === "text") {
    // Check for URL
    const urlMatch = content.text.match(/for full image Preview use:\s*(https?:\/\/[^\s]+)/);
    if (urlMatch) imageUrl = urlMatch[1];
    
    // Check for structured prompt
    try {
      const parsed = JSON.parse(content.text);
      if (parsed.short_description) structuredPrompt = parsed;
    } catch (e) {}
  }
  
  if (content.type === "image") {
    base64Data = content.data;
  }
}

// 3. Store in GeneratedMedia
const media: GeneratedMedia = {
  url: imageUrl || `data:image/jpeg;base64,${base64Data}`, // For display
  imageUrl: imageUrl,                                       // For context
  metadata: {
    structuredPrompt: structuredPrompt                      // For refinement
  }
};

// 4. Use in agent context (Priority 4)
const context = {
  preview_image_url: media.imageUrl,         // Short URL (~50 tokens)
  structured_prompt: media.metadata.structuredPrompt  // For consistency
};
```

## Console Output

When parsing succeeds:
```
[Chat API] Tool text_to_image SUCCESS
Chat API: Extracted MCP image URL: https://d1ei2xrl63k822.cloudfront.net/...
Chat API: Extracted structured prompt
Chat API: Content type: image, mimeType: image/jpeg
Chat API: Using MCP URL (token-efficient)
Chat API: Final media URL: https://d1ei2xrl63k822.cloudfront.net/...
Chat API: Structured prompt available: true
```

## Benefits

### 1. Token Efficiency
- **CloudFront URL:** ~50 tokens
- **Base64 image:** ~350,000 tokens
- **Savings:** 99.9%

### 2. Context Preservation
- Structured prompt allows consistent refinement
- Agent can modify specific aspects
- User can say "make it brighter" and agent knows original settings

### 3. Flexibility
- URL for agent context (efficient)
- Base64 for display (reliable)
- Structured prompt for refinement (intelligent)

## Error Handling

The parser is resilient:
- If URL extraction fails → falls back to base64
- If JSON parsing fails → continues without structured prompt
- If no image data → returns empty result with error

## Testing

To verify parsing:

1. Generate an image
2. Check console for:
   - `✅ Extracted MCP image URL`
   - `✅ Extracted structured prompt`
   - `✅ Using MCP URL (token-efficient)`
3. Click operation → verify URL is used in context
4. Try refinement → verify structured prompt is available

---

**Status:** ✅ Implemented and working
**Files:** `src/app/api/chat/route.ts`, `src/hooks/useBriaGeneration.ts`

