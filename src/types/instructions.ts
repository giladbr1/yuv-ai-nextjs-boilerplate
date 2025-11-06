// Instructions Pane State Types

export type InstructionsPaneState = "empty" | "loading" | "idle" | "active-operation";

export type AIOperation = 
  // One-click operations (immediate execution)
  | "remove-background"
  | "blur-background"
  | "enhance-image"
  // Multi-step operations (user action required)
  | "replace-background"
  | "generative-fill"
  | "object-eraser"
  | "increase-resolution"
  | "expand";

export interface OperationMetadata {
  name: string;
  displayName: string;
  description: string;
  isMultiStep: boolean;
  mcpToolName?: string;
  icon?: string;
}

export const OPERATION_METADATA: Record<AIOperation, OperationMetadata> = {
  "remove-background": {
    name: "remove-background",
    displayName: "Remove background",
    description: "Remove the background from the image",
    isMultiStep: false,
    mcpToolName: "remove_background",
  },
  "blur-background": {
    name: "blur-background",
    displayName: "Blur background",
    description: "Blur the background of the image",
    isMultiStep: false,
    mcpToolName: "blur_background",
  },
  "enhance-image": {
    name: "enhance-image",
    displayName: "Enhance image",
    description: "Enhance the quality and details of the image",
    isMultiStep: false,
    mcpToolName: "enhance_image",
  },
  "replace-background": {
    name: "replace-background",
    displayName: "Replace background",
    description: "Replace the background with a new one",
    isMultiStep: true,
  },
  "generative-fill": {
    name: "generative-fill",
    displayName: "Generative fill",
    description: "Fill masked areas with AI-generated content",
    isMultiStep: true,
    mcpToolName: "generative_fill",
  },
  "object-eraser": {
    name: "object-eraser",
    displayName: "Object eraser",
    description: "Erase objects from the image",
    isMultiStep: true,
    mcpToolName: "object_eraser",
  },
  "increase-resolution": {
    name: "increase-resolution",
    displayName: "Increase resolution",
    description: "Upscale the image resolution",
    isMultiStep: true,
    mcpToolName: "increase_resolution",
  },
  "expand": {
    name: "expand",
    displayName: "Expand",
    description: "Expand the image canvas",
    isMultiStep: true,
    mcpToolName: "expand",
  },
};

export interface InstructionsPaneProps {
  state: InstructionsPaneState;
  activeOperation: AIOperation | null;
  operationLoadingName: string | null;
  generatedMediaExists: boolean;
  onOperationSelect: (operation: AIOperation) => void;
  onOperationCancel: () => void;
  onOperationExecute: (operation: AIOperation, params?: any) => Promise<void>;
}

