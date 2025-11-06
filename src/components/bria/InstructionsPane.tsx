"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Eraser, 
  Wand2, 
  Maximize2, 
  Sparkles,
  PaintBucket,
  Focus,
  Zap,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIOperation, InstructionsPaneState } from "@/types/instructions";

interface InstructionsPaneProps {
  state: InstructionsPaneState;
  activeOperation: AIOperation | null;
  operationLoadingName: string | null;
  onOperationSelect: (operation: AIOperation) => void;
  onOperationCancel: () => void;
  onOperationExecute?: (operation: AIOperation, params?: any) => void;
  onPromptFocus?: () => void;
  onAspectRatioChange?: (ratio: string) => void;
  className?: string;
}

export function InstructionsPane({
  state,
  activeOperation,
  operationLoadingName,
  onOperationSelect,
  onOperationCancel,
  onOperationExecute,
  onPromptFocus,
  onAspectRatioChange,
  className,
}: InstructionsPaneProps) {
  // State 1: Empty
  if (state === "empty") {
    return (
      <div className={cn("flex items-center justify-center h-full p-8", className)}>
        <p className="text-lg font-medium text-muted-foreground text-center">
          What do you want to create?
        </p>
      </div>
    );
  }

  // State 2: Loading
  if (state === "loading") {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8 space-y-4", className)}>
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground text-center">
          Please wait while the {operationLoadingName || "operation"} is being done
        </p>
      </div>
    );
  }

  // State 3: Idle (Generated) - Show AI Operations Grid
  if (state === "idle") {
    return (
      <div className={cn("flex flex-col h-full p-6 space-y-4 overflow-y-auto", className)}>
        <p className="text-sm text-muted-foreground text-center pb-2">
          Use the chat or one of the proposed AI operations.
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Remove background */}
          <Button
            variant="outline"
            className="h-auto flex flex-col items-center gap-2 py-4 hover:bg-primary/10 hover:border-primary"
            onClick={() => onOperationSelect("remove-background")}
          >
            <Eraser className="h-5 w-5" />
            <span className="text-xs font-medium">Remove background</span>
          </Button>

          {/* Replace background */}
          <Button
            variant="outline"
            className="h-auto flex flex-col items-center gap-2 py-4 hover:bg-primary/10 hover:border-primary"
            onClick={() => onOperationSelect("replace-background")}
          >
            <PaintBucket className="h-5 w-5" />
            <span className="text-xs font-medium">Replace background</span>
          </Button>

          {/* Blur background */}
          <Button
            variant="outline"
            className="h-auto flex flex-col items-center gap-2 py-4 hover:bg-primary/10 hover:border-primary"
            onClick={() => onOperationSelect("blur-background")}
          >
            <Focus className="h-5 w-5" />
            <span className="text-xs font-medium">Blur background</span>
          </Button>

          {/* Generative fill */}
          <Button
            variant="outline"
            className="h-auto flex flex-col items-center gap-2 py-4 hover:bg-primary/10 hover:border-primary"
            onClick={() => onOperationSelect("generative-fill")}
          >
            <Wand2 className="h-5 w-5" />
            <span className="text-xs font-medium">Generative fill</span>
          </Button>

          {/* Object eraser */}
          <Button
            variant="outline"
            className="h-auto flex flex-col items-center gap-2 py-4 hover:bg-primary/10 hover:border-primary"
            onClick={() => onOperationSelect("object-eraser")}
          >
            <Eraser className="h-5 w-5" />
            <span className="text-xs font-medium">Object eraser</span>
          </Button>

          {/* Expand */}
          <Button
            variant="outline"
            className="h-auto flex flex-col items-center gap-2 py-4 hover:bg-primary/10 hover:border-primary"
            onClick={() => onOperationSelect("expand")}
          >
            <Maximize2 className="h-5 w-5" />
            <span className="text-xs font-medium">Expand</span>
          </Button>

          {/* Enhance image */}
          <Button
            variant="outline"
            className="h-auto flex flex-col items-center gap-2 py-4 hover:bg-primary/10 hover:border-primary"
            onClick={() => onOperationSelect("enhance-image")}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-medium">Enhance image</span>
          </Button>

          {/* Increase resolution */}
          <Button
            variant="outline"
            className="h-auto flex flex-col items-center gap-2 py-4 hover:bg-primary/10 hover:border-primary"
            onClick={() => onOperationSelect("increase-resolution")}
          >
            <Zap className="h-5 w-5" />
            <span className="text-xs font-medium">Increase resolution</span>
          </Button>
        </div>
      </div>
    );
  }

  // State 4: Active Operation - Show specific instructions
  if (state === "active-operation" && activeOperation) {
    return (
      <div className={cn("flex flex-col h-full p-6 space-y-4 overflow-y-auto", className)}>
        {/* Operation Title and Cancel Button */}
        <div className="flex items-center justify-between pb-2 border-b">
          <h3 className="text-base font-semibold text-primary">
            {getOperationDisplayName(activeOperation)}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOperationCancel}
            className="h-8 px-2"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>

        {/* Operation-Specific Instructions */}
        <div className="space-y-4">
          {activeOperation === "replace-background" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Describe the new background in the prompt box below.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={onPromptFocus}
              >
                Open Prompt Box
              </Button>
            </div>
          )}

          {activeOperation === "generative-fill" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Mask the area you want to fill, then type a prompt below.
              </p>
              <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground">
                <p className="font-medium mb-1">Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Use the mask tool on the canvas</li>
                  <li>Paint over the area to fill</li>
                  <li>Enter a description in the prompt</li>
                  <li>Click Generate</li>
                </ol>
              </div>
            </div>
          )}

          {activeOperation === "object-eraser" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Mask the area you want to erase, then click 'Generate' when ready.
              </p>
              <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground">
                <p className="font-medium mb-1">Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Use the mask tool on the canvas</li>
                  <li>Paint over the object to remove</li>
                  <li>Click Generate to erase</li>
                </ol>
              </div>
            </div>
          )}

          {activeOperation === "increase-resolution" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">
                By how much to increase resolution?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => onOperationExecute?.("increase-resolution", { scale: 2 })}
                >
                  2x
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => onOperationExecute?.("increase-resolution", { scale: 4 })}
                >
                  4x
                </Button>
              </div>
            </div>
          )}

          {activeOperation === "expand" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Select an area to expand, or choose a new aspect ratio.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Quick aspect ratios:</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onAspectRatioChange?.("16:9")}
                  >
                    16:9
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onAspectRatioChange?.("4:3")}
                  >
                    4:3
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onAspectRatioChange?.("1:1")}
                  >
                    1:1
                  </Button>
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground">
                <p className="font-medium mb-1">Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Use the select tool on the canvas</li>
                  <li>Choose the expansion area or aspect ratio</li>
                  <li>Click Generate to expand</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// Helper function to get display name for operations
function getOperationDisplayName(operation: AIOperation): string {
  const displayNames: Record<AIOperation, string> = {
    "remove-background": "Remove Background",
    "replace-background": "Replace Background",
    "blur-background": "Blur Background",
    "generative-fill": "Generative Fill",
    "object-eraser": "Object Eraser",
    "expand": "Expand",
    "enhance-image": "Enhance Image",
    "increase-resolution": "Increase Resolution",
  };
  return displayNames[operation] || operation;
}

