# Batch Generation Testing Guide

## Implementation Complete ✅

All batch generation features have been implemented:
- ✅ Multi-step planning instructions in agent system prompt
- ✅ Execution plan metadata interface and API passing
- ✅ Batch execution state management
- ✅ Auto-continuation logic (recursive sendMessage on continue=true)
- ✅ Error skipping logic (continue batch on failure)
- ✅ Progress indicator UI component
- ✅ Chat history for agent to track results

## How to Test

### Prerequisites

1. Start the development server:
```bash
npm run dev
```

2. Open the application at `http://localhost:3000`

3. Have console open (F12) to monitor agent decisions and progress

## Test Scenarios

### Scenario 1: Independent Batch Generation

**Test:** Generate multiple different images with no dependencies

**User Input:**
```
Generate 3 different dogs: Golden Retriever, German Shepherd, and Labrador
```

**Expected Behavior:**
1. Agent creates execution plan with `total: 3`, `plan_type: "batch_independent"`
2. Agent calls `text_to_image` with prompt "A photorealistic Golden Retriever dog"
3. Progress indicator shows "1/3: Golden Retriever"
4. Image 1 appears in gallery
5. Agent automatically continues (CONTINUE_EXECUTION)
6. Agent calls `text_to_image` with prompt "A photorealistic German Shepherd dog"
7. Progress indicator updates to "2/3: German Shepherd"
8. Image 2 appears in gallery
9. Agent continues automatically
10. Agent calls `text_to_image` with prompt "A photorealistic Labrador dog"
11. Progress indicator updates to "3/3: Labrador"
12. Image 3 appears in gallery
13. Batch complete message appears
14. Progress indicator disappears

**Console Output to Verify:**
```
🤖 Agent Context Inputs
📋 Execution Plan: {current: 1, total: 3, description: "Golden Retriever", continue: true}
🔄 Continuing batch execution: 1/3
📋 Execution Plan: {current: 2, total: 3, description: "German Shepherd", continue: true}
🔄 Continuing batch execution: 2/3
📋 Execution Plan: {current: 3, total: 3, description: "Labrador", continue: false}
✅ Batch execution complete
```

---

### Scenario 2: Batch Variations

**Test:** Generate same subject with different parameters

**User Input:**
```
Generate a cute cat with aspect ratios 1:1, 16:9, and 9:16
```

**Expected Behavior:**
1. Agent creates execution plan with `total: 3`, `plan_type: "batch_variations"`
2. Agent calls `text_to_image` with prompt "A cute cat" and `aspect_ratio: "1:1"`
3. Progress shows "1/3: Cat 1:1"
4. Image 1 generated (square)
5. Auto-continue
6. Agent calls `text_to_image` with prompt "A cute cat" and `aspect_ratio: "16:9"`
7. Progress shows "2/3: Cat 16:9"
8. Image 2 generated (landscape)
9. Auto-continue
10. Agent calls `text_to_image` with prompt "A cute cat" and `aspect_ratio: "9:16"`
11. Progress shows "3/3: Cat 9:16"
12. Image 3 generated (portrait)
13. Batch complete

**Verify:**
- Same subject (cat) in all 3 images
- Different aspect ratios visible
- Prompt is reused, only aspect_ratio parameter varies

---

### Scenario 3: Pipeline Execution

**Test:** Sequential operations where each step uses previous output

**User Input:**
```
Generate a dog, remove its background, and replace with a beach scene
```

**Expected Behavior:**
1. Agent creates execution plan with `total: 3`, `plan_type: "pipeline"`
2. **Step 1:** Agent calls `text_to_image(prompt="a dog")`
   - Progress: "1/3: Generate dog"
   - Image 1 (dog) appears in gallery
3. **Step 2:** Agent calls `remove_background(image="<url_from_step_1>")`
   - Progress: "2/3: Remove background"
   - Image 2 (dog with transparent background) appears
4. **Step 3:** Agent calls `generate_background(image="<url_from_step_2>", prompt="beach scene")`
   - Progress: "3/3: Add beach background"
   - Image 3 (dog on beach) appears
5. Batch complete

**Critical Verification:**
- Each step uses the URL from the previous step's result
- Agent sees previous results in chat history
- Final image combines all 3 operations

**Console Checks:**
```
Step 1: text_to_image → returns imageUrl: "https://..."
Step 2: remove_background(image: "https://...") → same URL from step 1
Step 3: generate_background(image: "https://...") → URL from step 2
```

---

### Scenario 4: Complex Batch + Variations

**Test:** Multiple subjects × multiple parameters = large batch

**User Input:**
```
Generate 3 dogs (Golden Retriever, Husky, Pug), each with aspect ratios 1:1, 16:9, and 3:4
```

**Expected Behavior:**
1. Agent creates execution plan with `total: 9` (3 dogs × 3 ratios)
2. Agent executes in order:
   - Golden Retriever 1:1 (1/9)
   - Golden Retriever 16:9 (2/9)
   - Golden Retriever 3:4 (3/9)
   - Husky 1:1 (4/9)
   - Husky 16:9 (5/9)
   - Husky 3:4 (6/9)
   - Pug 1:1 (7/9)
   - Pug 16:9 (8/9)
   - Pug 3:4 (9/9)
3. Progress indicator updates for each step
4. Gallery fills with 9 images
5. Batch complete after all 9

**Performance Check:**
- Auto-continuation works seamlessly
- No user interaction required after initial prompt
- Progress percentage accurate (11%, 22%, 33%, ...)

---

### Scenario 5: Error Handling & Skip

**Test:** Batch continues even when one step fails

**Setup:**
1. Generate a batch of 5 images
2. Simulate a failure on step 3 (can be done by temporarily breaking MCP, or wait for natural failure)

**User Input:**
```
Generate 5 cats
```

**Expected Behavior:**
1. Step 1 succeeds → Image 1 in gallery
2. Step 2 succeeds → Image 2 in gallery
3. **Step 3 fails** (simulated error)
   - Error logged to console: `Tool text_to_image failed: ...`
   - Console shows: `⚠️ Skipping failed step, continuing batch...`
   - Agent automatically calls CONTINUE_EXECUTION
   - **No error shown to user** (silent skip)
4. Step 4 succeeds → Image 4 in gallery (note: no Image 3)
5. Step 5 succeeds → Image 5 in gallery
6. Batch completes with 4 successful images out of 5

**Critical Verification:**
- Batch does NOT stop on error
- Failed step is skipped
- User doesn't see error modal
- Final gallery has 4 images (missing the failed one)

---

## Console Debugging

### What to Look For

When testing, monitor console for these key logs:

#### Agent Inputs
```
🤖 Agent Context Inputs
User Message: <your prompt>
📋 Available MCP Tools: [text_to_image, remove_background, ...]
```

#### Agent Decision
```
🎯 Agent Decision
Agent decided to call 1 tool(s):
📞 Tool Call: text_to_image
  Arguments: {prompt: "...", aspect_ratio: "1:1"}
📋 Execution Plan: {current: 1, total: 9, description: "Golden Retriever 1:1", continue: true}
```

#### Auto-Continuation
```
🔄 Continuing batch execution: 1/9
```

#### Completion
```
✅ Batch execution complete
```

#### Error Skipping (Scenario 5)
```
Tool text_to_image failed: <error>
⚠️ Skipping failed step, continuing batch...
```

---

## UI Elements to Verify

### Progress Indicator

When batch is active, you should see:

```
╔════════════════════════════════╗
║    Generating your creation    ║
║                                ║
║  Progress: 3 / 9      33%      ║
║  ████████░░░░░░░░░░░░░░░       ║
║  Golden Retriever 3:4          ║
╚════════════════════════════════╝
```

**Check:**
- Progress bar animates smoothly
- Percentage calculates correctly
- Description updates for each step
- Disappears when batch completes

### Gallery Updates

- Each successful generation adds to gallery immediately
- Images appear sequentially (not all at once)
- Active item updates to show most recent generation
- Gallery scrolls to show new items

---

## Common Issues & Troubleshooting

### Issue: Batch doesn't continue automatically

**Check:**
1. `execution_plan.continue` is `true` in console
2. No errors in console preventing auto-call
3. `sendMessage` is being called recursively

**Fix:** Verify continuation logic in `useBriaGeneration.ts` line 310-325

---

### Issue: Agent doesn't create execution plan

**Check:**
1. System prompt includes multi-step instructions (line 140-217 in `gemini-agent.ts`)
2. User input is clear about wanting multiple images
3. Agent's response includes `execution_plan` metadata

**Fix:** Make prompt more explicit (e.g., "Generate exactly 3 different dogs")

---

### Issue: Progress indicator doesn't show

**Check:**
1. `batchExecution` state is being set in hook
2. `batchExecution` prop is passed to `GenerationCanvas`
3. `isGenerating` is `true`

**Fix:** Verify prop passing in `src/app/page.tsx` line 102

---

### Issue: Pipeline steps don't use previous output

**Check:**
1. Chat history includes previous tool results
2. Agent sees image URL from previous step
3. Console shows `image: "<previous_url>"` in tool call args

**Fix:** Verify chat history management in `gemini-agent.ts`

---

## Success Criteria

✅ All 5 scenarios complete successfully  
✅ Progress indicator shows and updates correctly  
✅ Auto-continuation works without user input  
✅ Errors are skipped in batch mode  
✅ Gallery updates incrementally  
✅ Agent creates appropriate execution plans  
✅ No linter errors  
✅ No console errors (except intentional test failures)

---

## Next Steps After Testing

If all scenarios pass:
1. ✅ Mark testing todo as complete
2. ✅ Create a summary document of the feature
3. ✅ Update main README with batch generation examples
4. ✅ Consider adding a "Cancel Batch" button for user control (future enhancement)

If any scenarios fail:
1. Document the failure
2. Check console logs for root cause
3. Fix the issue
4. Re-test all scenarios

