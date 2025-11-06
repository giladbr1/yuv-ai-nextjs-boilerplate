"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  EditingState,
  EditingTool,
  SelectionRect,
  TextLayer,
  ImageAdjustments,
  MaskExport,
  SelectionExport,
  DEFAULT_EDITING_STATE,
} from "@/types/editing";
import { DEFAULT_EDITING_STATE as DEFAULT_STATE } from "@/types/editing";
import type {
  InstructionsPaneState,
  AIOperation,
} from "@/types/instructions";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface GenerationParams {
  mode: "image" | "video";
  model_version: "Fibo" | "3.2" | "EA tailored";
  modelInfluence: number;
  steps: number;
  aspectRatio: string;
  seed: string | number;
  prompt: string;
}

export interface GeneratedMedia {
  type: "image" | "video";
  url: string;
  id: string;
  timestamp: Date;
}

interface UseBriaGenerationReturn {
  // State
  messages: ChatMessage[];
  params: GenerationParams;
  attributionAmount: number;
  generatedMedia?: GeneratedMedia;
  galleryItems: GeneratedMedia[];
  activeItemId?: string;
  isGenerating: boolean;
  error?: string;
  editingState: EditingState;
  
  // Instructions Pane State
  instructionsPaneState: InstructionsPaneState;
  activeOperation: AIOperation | null;
  operationLoadingName: string | null;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  updateParams: (newParams: Partial<GenerationParams>) => void;
  generate: () => Promise<void>;
  uploadImageForReference: (file: File) => Promise<void>; // For prompt box reference only
  uploadImageForDisplay: (file: File) => Promise<void>; // For canvas display
  surpriseMe: () => void;
  clearError: () => void;
  setActiveItem: (id: string) => void;
  
  // Editing Actions
  setActiveTool: (tool: EditingTool) => void;
  updateSelection: (rect: SelectionRect | null) => void;
  updateMask: (imageData: ImageData | null) => void;
  addTextLayer: (layer: Omit<TextLayer, 'id'>) => void;
  updateTextLayer: (id: string, updates: Partial<TextLayer>) => void;
  removeTextLayer: (id: string) => void;
  updateImageAdjustments: (adjustments: Partial<ImageAdjustments>) => void;
  setBrushSize: (size: number) => void;
  exportMask: () => MaskExport | null;
  exportSelection: () => SelectionExport | null;
  clearEditingState: () => void;
  
  // Instructions Pane Actions
  selectOperation: (operation: AIOperation) => void;
  cancelOperation: () => void;
  executeOneClickOperation: (operation: AIOperation) => Promise<void>;
}

const DEFAULT_PARAMS: GenerationParams = {
  mode: "image",
  model_version: "Fibo",
  modelInfluence: 0.8,
  steps: 50,
  aspectRatio: "1:1",
  seed: "random",
  prompt: "",
};

export function useBriaGeneration(): UseBriaGenerationReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "system-1",
      role: "system",
      content: "what do you want to visualize?",
      timestamp: new Date(),
    },
  ]);

  const [params, setParams] = useState<GenerationParams>(DEFAULT_PARAMS);
  const [attributionAmount, setAttributionAmount] = useState(0);
  const [generatedMedia, setGeneratedMedia] = useState<GeneratedMedia>();
  const [galleryItems, setGalleryItems] = useState<GeneratedMedia[]>([]);
  const [activeItemId, setActiveItemId] = useState<string>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>();
  const [uploadedImageContext, setUploadedImageContext] = useState<{
    url: string;
    mcpResponse?: any;
    filename?: string;
  } | null>(null);
  const [editingState, setEditingState] = useState<EditingState>(DEFAULT_STATE);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  
  // Instructions Pane State
  const [activeOperation, setActiveOperation] = useState<AIOperation | null>(null);
  const [operationLoadingName, setOperationLoadingName] = useState<string | null>(null);

  // Helper function to add media to gallery
  const addToGallery = useCallback((media: Omit<GeneratedMedia, 'id' | 'timestamp'>) => {
    const newItem: GeneratedMedia = {
      ...media,
      id: `gallery-${Date.now()}`,
      timestamp: new Date(),
    };
    
    setGalleryItems((prev) => [...prev, newItem]);
    setGeneratedMedia(newItem);
    setActiveItemId(newItem.id);
    
    return newItem;
  }, []);

  // Send message to agent
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      try {
        // Call agent API
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            currentParams: {
              ...params,
              uploadedImage: uploadedImageContext,
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response from agent");
        }

        const data = await response.json();

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update parameters if agent suggests changes
        if (data.parameterUpdates) {
          setParams((prev) => ({ ...prev, ...data.parameterUpdates }));
        }

        // Handle tool results (tools are now executed by the chat API)
        if (data.toolResults && data.toolResults.length > 0) {
          for (const toolResult of data.toolResults) {
            // Check if the tool execution had an error
            if (toolResult.error) {
              console.error(`Tool ${toolResult.name} failed:`, toolResult.error);
              
              // Show a more user-friendly error message
              let errorMessage = `Failed to execute ${toolResult.name}`;
              
              // Check if it's a retry failure
              if (toolResult.error.includes("failed after")) {
                errorMessage += ". The service is experiencing issues. Please try again in a moment.";
              } else {
                errorMessage += `: ${toolResult.error}`;
              }
              
              setError(errorMessage);
              continue;
            }

            // Handle successful tool result - extract media
            if (toolResult.mediaUrl) {
              addToGallery({
                type: toolResult.mediaType || "image",
                url: toolResult.mediaUrl,
              });

              // Update attribution
              if (toolResult.mediaType === "video") {
                setAttributionAmount((prev) => prev + 0.005);
              } else {
                setAttributionAmount((prev) => prev + 0.001);
              }
            }
          }
        }

        // Legacy support: Execute tool calls if returned separately (old pattern)
        if (data.toolCalls && data.toolCalls.length > 0 && !data.toolResults) {
          for (const toolCall of data.toolCalls) {
            await executeToolCall(toolCall.name, toolCall.args);
          }
        }
      } catch (err) {
        console.error("Error sending message:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    },
    [params, uploadedImageContext, addToGallery]
  );

  // Execute MCP tool call
  const executeToolCall = useCallback(
    async (toolName: string, args: Record<string, any>) => {
      try {
        const response = await fetch("/api/mcp-tools", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            toolName,
            args,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to execute tool: ${toolName}`);
        }

        const result = await response.json();

        // Handle result based on tool type
        if (result.content && result.content.length > 0) {
          const content = result.content[0];

          // If it's an image or video result
          if (content.type === "image" || content.mimeType?.startsWith("image/")) {
            addToGallery({
              type: "image",
              url: content.data || content.text || "",
            });

            // Update attribution (mock calculation - would come from MCP metadata)
            setAttributionAmount((prev) => prev + 0.001);
          } else if (content.type === "video" || content.mimeType?.startsWith("video/")) {
            addToGallery({
              type: "video",
              url: content.data || content.text || "",
            });

            setAttributionAmount((prev) => prev + 0.005);
          }
        }
      } catch (err) {
        console.error("Error executing tool:", err);
        throw err;
      }
    },
    [addToGallery]
  );

  // Update parameters
  const updateParams = useCallback((newParams: Partial<GenerationParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  // Generate with current params - calls chat API for dynamic tool discovery
  const generate = useCallback(async () => {
    if (!params.prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setError(undefined);

    try {
      // Prepare generic UI parameters for agent
      // Agent will dynamically map these to correct tool parameters
      const currentParams = {
        prompt: params.prompt,
        mode: params.mode,
        model: params.model_version, // UI: model_version, agent maps to tool's "model_version" param
        steps: params.steps,
        aspectRatio: params.aspectRatio,
        seed: params.seed === 'Random' ? null : params.seed,
        modelInfluence: params.modelInfluence, // For EA tailored models
        uploadedImage: uploadedImageContext, // Include uploaded image context for MCP
      };

      // Call chat API with generic params - agent handles tool selection and mapping
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: `Generate using these settings: ${params.prompt}`,
          currentParams 
        }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      const result = await response.json();
      console.log("Generation result:", result);
      console.log("Tool results:", result.toolResults);

      // Check if we got tool results with media
      if (result.toolResults && result.toolResults.length > 0) {
        const toolResult = result.toolResults[0];
        console.log("First tool result:", toolResult);
        console.log("Media URL length:", toolResult.mediaUrl?.length);
        
        if (toolResult.mediaUrl) {
          console.log("Setting generated media with URL:", toolResult.mediaUrl.substring(0, 100));
          addToGallery({
            type: params.mode,
            url: toolResult.mediaUrl,
          });
          setAttributionAmount((prev) => prev + 0.001);
          
          // Add success message
          const successMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: "Generation complete! Here's your creation.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, successMessage]);
        } else if (toolResult.error) {
          throw new Error(toolResult.error);
        }
      } else if (result.media) {
        // Fallback for old format
        addToGallery(result.media);
        setAttributionAmount((prev) => prev + (result.attribution || 0.001));
        
        const successMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Generation complete! Here's your creation.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMessage]);
      } else {
        // No media generated
        const message: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.message || "Generation completed but no image was returned.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, message]);
      }
    } catch (err) {
      console.error("Error generating:", err);
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [params, uploadedImageContext, addToGallery]);

  // Upload image for reference only (prompt box) - does NOT display in canvas
  const uploadImageForReference = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      
      console.log("Upload result (reference):", result);

      // Store uploaded image context including MCP response
      setUploadedImageContext({
        url: result.url,
        mcpResponse: result.mcpResponse,
        filename: result.filename,
      });

      // DO NOT display in canvas - only for reference
      // The thumbnail will be shown in the prompt box by LeftSidebar component

      // Add message
      const uploadMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.mcpResponse 
          ? "Reference image uploaded successfully! It will be used during generation."
          : "Reference image uploaded! You can now generate with this as context.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, uploadMessage]);
    } catch (err) {
      console.error("Error uploading image for reference:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }, []);

  // Upload image for display (canvas) - shows in canvas
  const uploadImageForDisplay = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      
      console.log("Upload result (display):", result);

      // Store uploaded image context including MCP response
      setUploadedImageContext({
        url: result.url,
        mcpResponse: result.mcpResponse,
        filename: result.filename,
      });

      // Display uploaded image in canvas (add to gallery)
      addToGallery({
        type: "image",
        url: result.url,
      });

      // Add message
      const uploadMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Image uploaded! You can now edit it or use it as a reference.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, uploadMessage]);
    } catch (err) {
      console.error("Error uploading image for display:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }, [addToGallery]);

  // Surprise me - generate random prompt
  const surpriseMe = useCallback(() => {
    const prompts = [
      "A majestic phoenix rising from vibrant flames against a sunset sky",
      "A futuristic city with flying cars and neon lights at night",
      "An enchanted forest with glowing mushrooms and magical creatures",
      "A serene beach at sunrise with crystal clear turquoise water",
      "A steampunk airship floating among the clouds",
      "A cosmic nebula with swirling colors and distant galaxies",
      "A cozy mountain cabin covered in snow during winter twilight",
      "An underwater scene with bioluminescent sea creatures",
      "A zen garden with cherry blossoms and a peaceful koi pond",
      "A cyberpunk street market with holographic signs and diverse characters",
    ];

    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    setParams((prev) => ({ ...prev, prompt: randomPrompt }));

    // Add message
    const surpriseMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: `How about this: "${randomPrompt}"`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, surpriseMessage]);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(undefined);
  }, []);

  // Editing Methods
  const setActiveTool = useCallback((tool: EditingTool) => {
    setEditingState((prev) => {
      // When switching tools, clear previous work (requirement 5b)
      const newState = { ...prev, activeTool: tool };
      
      if (tool !== 'select') {
        newState.selection = null;
      }
      if (tool !== 'mask') {
        newState.maskData = null;
      }
      if (tool !== 'text') {
        newState.textLayers = [];
      }
      
      return newState;
    });
  }, []);

  const updateSelection = useCallback((rect: SelectionRect | null) => {
    setEditingState((prev) => ({ ...prev, selection: rect }));
  }, []);

  const updateMask = useCallback((imageData: ImageData | null) => {
    setEditingState((prev) => ({ ...prev, maskData: imageData }));
  }, []);

  const addTextLayer = useCallback((layer: Omit<TextLayer, 'id'>) => {
    const newLayer: TextLayer = {
      ...layer,
      id: `text-${Date.now()}`,
    };
    setEditingState((prev) => ({
      ...prev,
      textLayers: [...prev.textLayers, newLayer],
    }));
  }, []);

  const updateTextLayer = useCallback((id: string, updates: Partial<TextLayer>) => {
    setEditingState((prev) => ({
      ...prev,
      textLayers: prev.textLayers.map((layer) =>
        layer.id === id ? { ...layer, ...updates } : layer
      ),
    }));
  }, []);

  const removeTextLayer = useCallback((id: string) => {
    setEditingState((prev) => ({
      ...prev,
      textLayers: prev.textLayers.filter((layer) => layer.id !== id),
    }));
  }, []);

  const updateImageAdjustments = useCallback((adjustments: Partial<ImageAdjustments>) => {
    setEditingState((prev) => ({
      ...prev,
      imageAdjustments: { ...prev.imageAdjustments, ...adjustments },
    }));
  }, []);

  const setBrushSize = useCallback((size: number) => {
    setEditingState((prev) => ({ ...prev, brushSize: size }));
  }, []);

  const exportMask = useCallback((): MaskExport | null => {
    if (!editingState.maskData || !imageElement) return null;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = editingState.maskData.width;
      canvas.height = editingState.maskData.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return null;

      // Create black and white mask
      const blackWhiteData = new ImageData(
        editingState.maskData.width,
        editingState.maskData.height
      );
      
      for (let i = 0; i < editingState.maskData.data.length; i += 4) {
        // If alpha channel has any value, it's masked (white), else black
        const isMasked = editingState.maskData.data[i + 3] > 0;
        const value = isMasked ? 255 : 0;
        blackWhiteData.data[i] = value;
        blackWhiteData.data[i + 1] = value;
        blackWhiteData.data[i + 2] = value;
        blackWhiteData.data[i + 3] = 255;
      }

      ctx.putImageData(blackWhiteData, 0, 0);
      
      return {
        dataUrl: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
      };
    } catch (err) {
      console.error('Error exporting mask:', err);
      return null;
    }
  }, [editingState.maskData, imageElement]);

  const exportSelection = useCallback((): SelectionExport | null => {
    if (!editingState.selection || !imageElement) return null;

    return {
      x: editingState.selection.x,
      y: editingState.selection.y,
      width: editingState.selection.width,
      height: editingState.selection.height,
      sourceWidth: imageElement.naturalWidth,
      sourceHeight: imageElement.naturalHeight,
    };
  }, [editingState.selection, imageElement]);

  const clearEditingState = useCallback(() => {
    setEditingState(DEFAULT_STATE);
  }, []);

  // Set active item from gallery
  const setActiveItem = useCallback((id: string) => {
    const item = galleryItems.find((item) => item.id === id);
    if (item) {
      setGeneratedMedia(item);
      setActiveItemId(id);
      // Clear editing state when switching images
      clearEditingState();
    }
  }, [galleryItems, clearEditingState]);
  
  // Instructions Pane Methods
  
  // Compute instructions pane state based on current state
  const instructionsPaneState: InstructionsPaneState = (() => {
    if (isGenerating || operationLoadingName) {
      return "loading";
    }
    if (activeOperation) {
      return "active-operation";
    }
    if (generatedMedia) {
      return "idle";
    }
    return "empty";
  })();
  
  const executeOneClickOperation = useCallback(async (operation: AIOperation, params?: any) => {
    if (!generatedMedia) {
      setError("No image to process");
      return;
    }
    
    // Set loading state
    const operationNames: Record<AIOperation, string> = {
      "remove-background": "Remove Background",
      "blur-background": "Blur Background",
      "enhance-image": "Enhance Image",
      "replace-background": "Replace Background",
      "generative-fill": "Generative Fill",
      "object-eraser": "Object Eraser",
      "increase-resolution": "Increase Resolution",
      "expand": "Expand",
    };
    
    setOperationLoadingName(operationNames[operation]);
    setError(undefined);
    
    try {
      // Build operation message based on operation type and params
      let message = "";
      
      switch (operation) {
        case "remove-background":
          message = "Remove the background from the current image";
          break;
        case "blur-background":
          message = "Blur the background of the current image";
          break;
        case "enhance-image":
          message = "Enhance the quality of the current image";
          break;
        case "increase-resolution":
          const scale = params?.scale || 2;
          message = `Increase the resolution of the current image by ${scale}x`;
          break;
        case "replace-background":
          message = `Replace the background of the current image with: ${params.prompt}`;
          break;
        case "generative-fill":
          message = "Apply generative fill to the masked area";
          break;
        case "object-eraser":
          message = "Erase the masked object from the image";
          break;
        case "expand":
          message = "Expand the image canvas";
          break;
        default:
          message = `Execute ${operation} operation`;
      }
      
      if (message) {
        await sendMessage(message);
      }
      
      // Clear active operation after execution
      setActiveOperation(null);
      setActiveTool("none");
    } catch (err) {
      console.error("Error executing operation:", err);
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setOperationLoadingName(null);
    }
  }, [generatedMedia, sendMessage]);
  
  const selectOperation = useCallback((operation: AIOperation) => {
    // One-click operations execute immediately
    const oneClickOps: AIOperation[] = ["remove-background", "blur-background", "enhance-image"];
    
    if (oneClickOps.includes(operation)) {
      executeOneClickOperation(operation);
      return;
    }
    
    // Multi-step operations transition to active-operation state
    setActiveOperation(operation);
    
    // Handle multi-step operation setup based on operation type
    switch (operation) {
      case "generative-fill":
        // Auto-select mask tool
        setActiveTool("mask");
        break;
      case "object-eraser":
        // Auto-select mask tool and pre-fill prompt
        setActiveTool("mask");
        setParams((prev) => ({ ...prev, prompt: "erase" }));
        break;
      case "expand":
        // Auto-select select tool and pre-fill prompt
        setActiveTool("select");
        setParams((prev) => ({ ...prev, prompt: "expand" }));
        break;
      case "replace-background":
        // Just set the operation, prompt will be filled by user
        break;
      case "increase-resolution":
        // Show resolution options in the pane
        break;
      default:
        break;
    }
  }, [executeOneClickOperation]);
  
  const cancelOperation = useCallback(() => {
    setActiveOperation(null);
    setOperationLoadingName(null);
    // Deselect any active tools
    setActiveTool("none");
    // Clear any pre-filled prompts
    setParams((prev) => ({ ...prev, prompt: "" }));
  }, []);

  return {
    messages,
    params,
    attributionAmount,
    generatedMedia,
    galleryItems,
    activeItemId,
    isGenerating,
    error,
    editingState,
    instructionsPaneState,
    activeOperation,
    operationLoadingName,
    sendMessage,
    updateParams,
    generate,
    uploadImageForReference,
    uploadImageForDisplay,
    surpriseMe,
    clearError,
    setActiveItem,
    setActiveTool,
    updateSelection,
    updateMask,
    addTextLayer,
    updateTextLayer,
    removeTextLayer,
    updateImageAdjustments,
    setBrushSize,
    exportMask,
    exportSelection,
    clearEditingState,
    selectOperation,
    cancelOperation,
    executeOneClickOperation,
  };
}

