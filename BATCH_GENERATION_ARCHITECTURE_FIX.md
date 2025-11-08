# Batch Generation Architecture Fix

## Current Problem

**Agent loses plan state between CONTINUE_EXECUTION calls:**
1. User: "generate 3 different dog breeds"
2. Agent: Generates Golden Retriever ✅ with plan_type: "batch_independent"
3. System sends: CONTINUE_EXECUTION
4. Agent: **Forgets original plan**, creates NEW plan as "pipeline" ❌
5. Tries to call `remove_background(image: "null")` instead of generating German Shepherd

## Root Cause

The agent is **stateless** between turns. When it receives CONTINUE_EXECUTION, it:
- Tries to parse its previous EXECUTION_PLAN from chat history
- Gets confused and creates a new, wrong plan
- Doesn't know which dog breed to generate next

## Solution: Maintain Full Plan in Client State

Instead of having the agent figure out each step, **generate the full plan once** and store it client-side.

### Architecture Change

**Current (Broken):**
```
User → Agent creates partial plan → Executes step 1 → CONTINUE → Agent tries to guess step 2 ❌
```

**Fixed:**
```
User → Agent creates FULL PLAN → Client stores plan → Executes step 1 → Client sends step 2 details → Executes step 2 ✅
```

### Implementation

#### 1. Agent Returns Full Plan on First Call

```typescript
// System prompt update
"When you detect a batch request, return the FULL execution plan with ALL steps:

execution_plan: {
  total: 3,
  plan_type: "batch_independent",
  steps: [
    {step: 1, tool: "text_to_image", args: {prompt: "Golden Retriever"}, description: "Golden Retriever"},
    {step: 2, tool: "text_to_image", args: {prompt: "German Shepherd"}, description: "German Shepherd"},
    {step: 3, tool: "text_to_image", args: {prompt: "Labrador"}, description: "Labrador"}
  ]
}

Then execute ONLY step 1."
```

#### 2. Client Stores Full Plan

```typescript
// useBriaGeneration.ts
const [batchExecution, setBatchExecution] = useState<{
  active: boolean;
  current: number;
  total: number;
  description: string;
  steps: Array<{step: number, tool: string, args: Record<string, any>, description: string}>;  // ← FULL PLAN
} | null>(null);
```

#### 3. Client Provides Next Step Details

```typescript
// When continuing, send explicit step details
if (data.execution_plan.continue) {
  const nextStep = batchExecution.steps[data.execution_plan.current]; // Get step 2 from stored plan
  
  const continuationMessage = `EXECUTE_STEP
Step ${nextStep.step}/${data.execution_plan.total}
Tool: ${nextStep.tool}
Args: ${JSON.stringify(nextStep.args)}
Description: ${nextStep.description}`;
  
  await sendMessage(continuationMessage);
}
```

#### 4. Agent Just Executes Given Step

```typescript
// System prompt for EXECUTE_STEP
"When you receive EXECUTE_STEP message:
- Extract the tool name and args from the message
- Call that exact tool with those exact args
- Don't think, don't plan, just execute
- Return execution_plan with current step incremented"
```

### Benefits

✅ Agent doesn't need to remember or reconstruct plan  
✅ No confusion between batch types  
✅ Simple: Agent just executes what it's told  
✅ Client has full visibility into remaining steps  
✅ Can show progress with step descriptions  

### Alternative: Simpler Approach

**Even simpler**: Don't use agent for continuation at all!

```typescript
// Client directly calls MCP tools for steps 2-N
const plan = data.execution_plan.steps;
for (let i = 1; i < plan.length; i++) {
  const step = plan[i];
  await callMCPTool(step.tool, step.args);
  // Update progress UI
}
```

This removes agent from the loop entirely for batch execution!

## Recommendation

Use the **simpler approach**:
1. Agent detects batch request
2. Agent returns full plan with all steps
3. Agent executes step 1
4. **Client directly executes steps 2-N without involving agent**

This is:
- More reliable (no agent confusion)
- Faster (no LLM calls for steps 2-N)
- Simpler to debug
- Cheaper (fewer tokens)

