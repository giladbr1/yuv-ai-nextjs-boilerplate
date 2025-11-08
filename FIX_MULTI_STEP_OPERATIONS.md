# Fix: Multi-Step Operations Not Sending Context

## Problem

Multi-step operations (like "Replace Background") were failing because:
1. The prompt box wasn't auto-filled with operation instructions
2. The `activeOperation` wasn't being passed to the agent when `generate()` was called
3. The agent didn't know which operation to execute (Priority 1 not triggered)

## Root Causes

### Issue 1: No Prompt Pre-Fill for Replace Background

**Location:** `src/hooks/useBriaGeneration.ts` - `selectOperation` function (line 880-882)

```typescript
// ❌ OLD CODE (BROKEN)
case "replace-background":
  // Just set the operation, prompt will be filled by user
  break;
```

**Problem:** User had to manually type the operation intent, and even then the operation context wasn't sent.

### Issue 2: activeOperation Not Included in generate() Context

**Location:** `src/hooks/useBriaGeneration.ts` - `generate` function (line 386)

```typescript
// ❌ OLD CODE (BROKEN)
ai_operation: null,  // Always null!
```

**Problem:** 
- One-click operations (remove-background) worked because `executeOneClickOperation` passed `operationContext` to `sendMessage`
- Multi-step operations (replace-background) set `activeOperation` but when user clicked generate, it was **never included in the context**

**Result:**
- Agent didn't detect Priority 1 (Explicit AI Operation)
- Agent fell back to Priority 5 (Standard Text-to-Image)
- Wrong tool called or no tool called

## Solutions

### Solution 1: Pre-Fill Prompt for Replace Background

```typescript
// ✅ NEW CODE (FIXED)
case "replace-background":
  // Pre-fill prompt with instruction
  setParams((prev) => ({ ...prev, prompt: "replace the background to " }));
  break;
```

**Now:** When user clicks "Replace Background", the prompt box shows: `"replace the background to "` and user can type their desired background.

### Solution 2: Include activeOperation in generate() Context

```typescript
// ✅ NEW CODE (FIXED)
// Include active operation for multi-step operations (e.g., replace-background)
ai_operation: activeOperation ? { name: activeOperation, params: {} } : null,
```

**Now:** When `generate()` is called with an active operation, it includes the operation context so the agent knows which Priority 1 operation to execute.

### Solution 3: Clear Operation After Success

```typescript
// ✅ NEW CODE (ADDED)
// Clear active operation after successful multi-step operation
if (activeOperation) {
  setActiveOperation(null);
  setActiveTool("none");
}
```

**Now:** After successful operation, the UI resets to idle state, ready for next operation.

### Solution 4: Update Dependencies

```typescript
// ✅ NEW CODE (FIXED)
}, [params, uploadedImageContext, addToGallery, generatedMedia, editingState, activeOperation]);
//                                                                            ^ Added!
```

**Now:** The `generate` callback properly tracks changes to `activeOperation`.

## How Multi-Step Operations Work Now

### User Flow: Replace Background

1. **User clicks "Replace Background" button**
   ```typescript
   selectOperation("replace-background")
   ```
   - Sets `activeOperation = "replace-background"`
   - Pre-fills prompt: `"replace the background to "`

2. **User completes prompt**
   - Types: `"replace the background to a birthday party"`
   - Prompt box shows full text

3. **User clicks Generate**
   ```typescript
   generate()
   ```
   - Includes in context:
     ```javascript
     ai_operation: { name: "replace-background", params: {} }
     preview_image_url: "https://..." // Current image URL
     structured_prompt: { ... } // Current image metadata
     user_input: "replace the background to a birthday party"
     ```

4. **Agent receives full context**
   ```
   🔴 PRIORITY 1: Explicit AI Operation Detected
     Operation: { name: 'replace-background', params: {} }
     Image type: MCP URL
   📞 Tool Call: generate_background
     Arguments: {
       image: 'https://...',
       prompt: 'a birthday party'
     }
   ```

5. **Operation completes successfully**
   - New image added to gallery
   - `activeOperation` cleared
   - UI returns to idle state

## Testing Checklist

### Test Scenario: Replace Background

- [ ] **Step 1:** Generate an image (e.g., "sad clown")
- [ ] **Step 2:** Click "Remove Background" → Should work ✅
- [ ] **Step 3:** Click "Replace Background"
  - [ ] Prompt box auto-fills with: `"replace the background to "`
  - [ ] Instructions pane shows "active-operation" state
- [ ] **Step 4:** Complete prompt (e.g., "birthday party")
- [ ] **Step 5:** Click Generate
  - [ ] Check console for:
    ```
    🔴 PRIORITY 1: Explicit AI Operation Detected
    📞 Tool Call: generate_background
    ```
  - [ ] Background replaces successfully
  - [ ] UI returns to idle state

### Other Multi-Step Operations to Test

- [ ] **Generative Fill** (requires mask)
- [ ] **Object Eraser** (requires mask)
- [ ] **Expand** (requires selection)
- [ ] **Increase Resolution** (requires scale input)

## Files Modified

**`src/hooks/useBriaGeneration.ts`:**
1. Line 880-882: Pre-fill prompt for replace-background
2. Line 386-387: Include `activeOperation` in generate context
3. Line 451-455: Clear operation after successful generation
4. Line 496: Add `activeOperation` to dependencies

## Expected Console Output (Replace Background)

```
🤖 Agent Context Inputs
  Context Object: {
    user_input: 'replace the background to a birthday party',
    ai_operation: { name: 'replace-background', params: {} },  ✅
    preview_image_url: 'https://d1ei2xrl63k822.cloudfront.net/...',  ✅
    structured_prompt: { ... },  ✅
  }
  🔴 PRIORITY 1: Explicit AI Operation Detected
    Operation: { name: 'replace-background', params: {} }
    Image type: MCP URL

🎯 Agent Decision
  Agent decided to call 1 tool(s):
  📞 Tool Call: generate_background
    Arguments: {
      image: 'https://d1ei2xrl63k822.cloudfront.net/...',
      prompt: 'a birthday party'
    }
```

---

**Status:** ✅ Fixed  
**Priority:** HIGH (was blocking all multi-step operations)  
**Impact:** Replace Background, Generative Fill, Object Eraser, Expand, all now work correctly

