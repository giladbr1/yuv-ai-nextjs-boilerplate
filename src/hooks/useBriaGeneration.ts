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
import type { ChatMessage } from "@/types/chat";

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
  url: string; // For display (can be base64 or URL)
  imageUrl?: string; // MCP-provided URL for tool calls (token-efficient)
  id: string;
  timestamp: Date;
  metadata?: {
    structuredPrompt?: any;
    [key: string]: any;
  };
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

  // Batch Execution State
  batchExecution: {
    active: boolean;
    current: number;
    total: number;
    description: string;
    steps: Array<{
      step: number;
      tool: string;
      args: Record<string, any>;
      description: string;
    }>;
  } | null;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  updateAgentMessage: (updates: Partial<Pick<ChatMessage, 'content' | 'agentStatus' | 'status'>>) => void;
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
      content: "What do you want to create?",
      timestamp: new Date(),
      status: "complete",
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

  // Batch Execution State
  const [batchExecution, setBatchExecution] = useState<{
    active: boolean;
    current: number;
    total: number;
    description: string;
    steps: Array<{
      step: number;
      tool: string;
      args: Record<string, any>;
      description: string;
    }>;
  } | null>(null);

  // Helper function to add media to gallery
  const addToGallery = useCallback((media: Omit<GeneratedMedia, 'id' | 'timestamp'>) => {
    const newItem: GeneratedMedia = {
      ...media,
      id: `gallery-${Date.now()}`,
      timestamp: new Date(),
    };
    
    console.log("➕ Adding item to gallery:");
    console.log("  - ID:", newItem.id);
    console.log("  - Has imageUrl:", !!newItem.imageUrl);
    console.log("  - imageUrl:", newItem.imageUrl?.substring(0, 50));
    console.log("  - Has metadata:", !!newItem.metadata);
    console.log("  - Has structured prompt:", !!newItem.metadata?.structuredPrompt);
    console.log("  - Full metadata keys:", newItem.metadata ? Object.keys(newItem.metadata) : []);
    
    setGalleryItems((prev) => [...prev, newItem]);
    setGeneratedMedia(newItem);
    setActiveItemId(newItem.id);
    
    return newItem;
  }, []);

  // Update the last agent message in place
  const updateAgentMessage = useCallback((updates: Partial<Pick<ChatMessage, 'content' | 'agentStatus' | 'status'>>) => {
    setMessages((prev) => {
      const lastMessageIndex = prev.length - 1;
      if (lastMessageIndex < 0) return prev;
      
      const lastMessage = prev[lastMessageIndex];
      // Only update if last message is from assistant or system
      if (lastMessage.role !== 'assistant' && lastMessage.role !== 'system') {
        return prev;
      }
      
      const updatedMessages = [...prev];
      updatedMessages[lastMessageIndex] = {
        ...lastMessage,
        ...updates,
      };
      
      return updatedMessages;
    });
  }, []);

  // Send message to agent
  const sendMessage = useCallback(
    async (message: string, operationContext?: { name: string; params?: any }) => {
      if (!message.trim()) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: new Date(),
        status: "complete",
      };

      setMessages((prev) => [...prev, userMessage]);

      try {
        // Prepare comprehensive context object matching PRD Part 1 inputs
        const context = {
          user_input: message,
          parameters: {
            steps: params.steps,
            model: params.model_version,
            aspect_ratio: params.aspectRatio,
            seed: params.seed === 'random' ? null : params.seed,
            mode: params.mode,
            modelInfluence: params.modelInfluence,
          },
          reference_image: uploadedImageContext?.url || null,
          ai_operation: operationContext || (activeOperation ? { name: activeOperation, params: {} } : null),
          // Use MCP URL if available (token-efficient), fallback to display URL
          preview_image_url: generatedMedia?.imageUrl || generatedMedia?.url || null,
          structured_prompt: generatedMedia?.metadata?.structuredPrompt || null,
          mask_data: editingState.maskData ? exportMask()?.dataUrl || null : null,
          // Legacy support
          uploadedImage: uploadedImageContext,
        };
        
        // Debug logging
        console.log("📤 Preparing context for agent:");
        console.log("  - generatedMedia exists:", !!generatedMedia);
        console.log("  - generatedMedia.id:", generatedMedia?.id);
        console.log("  - generatedMedia.imageUrl:", generatedMedia?.imageUrl?.substring(0, 50));
        console.log("  - generatedMedia.url:", generatedMedia?.url?.substring(0, 50));
        console.log("  - Has structured prompt:", !!generatedMedia?.metadata?.structuredPrompt);
        console.log("  - Context preview_image_url:", context.preview_image_url?.substring(0, 50));

        // Call agent API
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            currentParams: context,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response from agent");
        }

        const data = await response.json();

        // Update existing agent message if it exists and is in "updating" status
        // Otherwise create a new assistant message
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && 
              (lastMessage.role === "assistant" || lastMessage.role === "system") && 
              lastMessage.status === "updating") {
            // Update existing message
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              content: data.message,
              status: "complete",
            };
            return updated;
          } else {
            // Add new assistant message
            const assistantMessage: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: data.message,
              timestamp: new Date(),
              status: "complete",
            };
            return [...prev, assistantMessage];
          }
        });

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
              
              // Show error and stop
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
              // Prepare complete media object with all metadata upfront
              const mediaData: Omit<GeneratedMedia, 'id' | 'timestamp'> = {
                type: toolResult.mediaType || "image",
                url: toolResult.mediaUrl,
              };
              
              // Add imageUrl if available (for token-efficient context)
              if (toolResult.imageUrl) {
                mediaData.imageUrl = toolResult.imageUrl;
                console.log("Using MCP image URL for future context:", toolResult.imageUrl);
              }
              
              // Add metadata if available (for Priority 4 refinement)
              if (toolResult.metadata || toolResult.structuredPrompt) {
                mediaData.metadata = {
                  structuredPrompt: toolResult.structuredPrompt || toolResult.metadata?.structuredPrompt,
                  ...toolResult.metadata,
                };
                console.log("Stored structured prompt for refinement");
              }
              
              // Add to gallery with complete data
              addToGallery(mediaData);

              // Update attribution
              if (toolResult.mediaType === "video") {
                setAttributionAmount((prev) => prev + 0.005);
              } else {
                setAttributionAmount((prev) => prev + 0.001);
              }
            }
          }
        }

        // Handle batch execution continuation
        if (data.execution_plan) {
          if (data.execution_plan.continue && data.execution_plan.steps) {
            // Store batch state with full plan
            setBatchExecution({
              active: true,
              current: data.execution_plan.current,
              total: data.execution_plan.total,
              description: data.execution_plan.description,
              steps: data.execution_plan.steps,
            });
            
            console.log(`🔄 Starting batch execution: ${data.execution_plan.total} steps`);
            console.log(`📋 Full plan:`, data.execution_plan.steps);
            
            // Execute remaining steps directly (steps 2-N)
            for (let i = data.execution_plan.current; i < data.execution_plan.total; i++) {
              const step = data.execution_plan.steps[i]; // steps array is 0-indexed
              
              console.log(`⚡ Executing step ${step.step}/${data.execution_plan.total}: ${step.description}`);
              
              // Update progress UI
              setBatchExecution(prev => prev ? {...prev, current: step.step, description: step.description} : null);
              
              try {
                // Call MCP tool directly
                const toolResponse = await fetch("/api/chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    message: `Direct execution: ${step.tool}`,
                    toolCalls: [{
                      name: step.tool,
                      args: step.args,
                    }],
                  }),
                });
                
                if (!toolResponse.ok) {
                  throw new Error(`Step ${step.step} failed`);
                }
                
                const stepData = await toolResponse.json();
                
                // Handle step result
                if (stepData.toolResults && stepData.toolResults.length > 0) {
                  for (const toolResult of stepData.toolResults) {
                    if (toolResult.error) {
                      console.error(`⚠️ Step ${step.step} failed:`, toolResult.error);
                      // Skip failed step, continue with next
                      continue;
                    }
                    
                    if (toolResult.mediaUrl) {
                      const mediaData: Omit<GeneratedMedia, 'id' | 'timestamp'> = {
                        type: toolResult.mediaType || "image",
                        url: toolResult.mediaUrl,
                      };
                      
                      if (toolResult.imageUrl) {
                        mediaData.imageUrl = toolResult.imageUrl;
                      }
                      
                      if (toolResult.metadata || toolResult.structuredPrompt) {
                        mediaData.metadata = {
                          structuredPrompt: toolResult.structuredPrompt || toolResult.metadata?.structuredPrompt,
                          ...toolResult.metadata,
                        };
                      }
                      
                      addToGallery(mediaData);
                      setAttributionAmount((prev) => prev + 0.001);
                    }
                  }
                }
              } catch (err) {
                console.error(`❌ Step ${step.step} execution failed:`, err);
                // Continue with next step
              }
            }
            
            // Batch complete
            console.log("✅ Batch execution complete");
            setBatchExecution(null);
            
            // Update last agent message with completion summary
            updateAgentMessage({
              content: `I've created ${data.execution_plan.total} compelling variations for you!`,
              status: "complete",
              agentStatus: undefined,
            });
            
            return; // Exit early
          } else if (!data.execution_plan.continue) {
            // Single step, no batch
            setBatchExecution(null);
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
    [params, uploadedImageContext, addToGallery, activeOperation, generatedMedia, editingState]
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

    // Add user message with their prompt
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: params.prompt,
      timestamp: new Date(),
      status: "complete",
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add initial agent message (will be updated by LLM response)
    const initialAgentMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "Working on it...",
      timestamp: new Date(),
      status: "updating",
      agentStatus: "Thinking of a plan",
    };
    setMessages((prev) => [...prev, initialAgentMessage]);

    try {
      // Prepare comprehensive context object matching PRD Part 1 inputs
      const context = {
        user_input: ` ${params.prompt}`,
        parameters: {
        steps: params.steps,
          model: params.model_version,
          aspect_ratio: params.aspectRatio,
          seed: params.seed === 'random' || params.seed === 'Random' ? null : params.seed,
          mode: params.mode,
          modelInfluence: params.modelInfluence,
        },
        reference_image: uploadedImageContext?.url || null,
        // Include active operation for multi-step operations (e.g., replace-background)
        ai_operation: activeOperation ? { name: activeOperation, params: {} } : null,
        // Use MCP URL if available (token-efficient), fallback to display URL
        preview_image_url: generatedMedia?.imageUrl || generatedMedia?.url || null,
        structured_prompt: generatedMedia?.metadata?.structuredPrompt || null,
        mask_data: editingState.maskData ? exportMask()?.dataUrl || null : null,
        // Legacy support
        uploadedImage: uploadedImageContext,
      };

      // Call chat API with generic params - agent handles tool selection and mapping
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: ` settings: ${params.prompt}`,
          currentParams: context 
        }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      const result = await response.json();
      console.log("Generation result:", result);
      console.log("Tool results:", result.toolResults);

      // Update agent message with LLM's personalized response
      if (result.message) {
        updateAgentMessage({
          content: result.message,
          agentStatus: result.toolResults && result.toolResults.length > 0 
            ? "Working on your request..." 
            : undefined,
        });
      }

      // Check if we got tool results with media
      if (result.toolResults && result.toolResults.length > 0) {
        const toolResult = result.toolResults[0];
        console.log("First tool result:", toolResult);
        console.log("Media URL length:", toolResult.mediaUrl?.length);
        
        if (toolResult.mediaUrl) {
          console.log("Setting generated media with URL:", toolResult.mediaUrl.substring(0, 100));
          
          // Prepare complete media object with all metadata upfront
          const mediaData: Omit<GeneratedMedia, 'id' | 'timestamp'> = {
            type: params.mode,
            url: toolResult.mediaUrl,
          };
          
          // Add imageUrl if available (for token-efficient context)
          if (toolResult.imageUrl) {
            mediaData.imageUrl = toolResult.imageUrl;
            console.log("Stored MCP image URL for future context:", toolResult.imageUrl);
          }
          
          // Add metadata if available (for Priority 4 refinement)
          if (toolResult.metadata || toolResult.structuredPrompt) {
            mediaData.metadata = {
              structuredPrompt: toolResult.structuredPrompt || toolResult.metadata?.structuredPrompt,
              ...toolResult.metadata,
            };
            console.log("Stored structured prompt for refinement");
          }
          
          // Add to gallery with complete data
          addToGallery(mediaData);

          setAttributionAmount((prev) => prev + 0.001);
          
          // Clear active operation after successful multi-step operation
          if (activeOperation) {
            setActiveOperation(null);
            setActiveTool("none");
          }
          
          // Update agent message to complete
          updateAgentMessage({
            status: "complete",
            agentStatus: undefined,
          });
        } else if (toolResult.error) {
          throw new Error(toolResult.error);
        }
      } else if (result.media) {
        // Fallback for old format
        addToGallery(result.media);
        setAttributionAmount((prev) => prev + (result.attribution || 0.001));
        
        // Update agent message to complete
        updateAgentMessage({
          status: "complete",
          agentStatus: undefined,
        });
      } else {
        // No media generated - use agent's message
        updateAgentMessage({
          content: result.message || "I've completed the task, but no image was generated.",
          status: "complete",
          agentStatus: undefined,
        });
      }

      // Handle batch execution continuation
      if (result.execution_plan) {
        if (result.execution_plan.continue && result.execution_plan.steps) {
          // Store batch state with full plan
          setBatchExecution({
            active: true,
            current: result.execution_plan.current,
            total: result.execution_plan.total,
            description: result.execution_plan.description,
            steps: result.execution_plan.steps,
          });
          
          console.log(`🔄 Starting batch execution: ${result.execution_plan.total} steps`);
          console.log(`📋 Full plan:`, result.execution_plan.steps);
          
          // Execute remaining steps directly (steps 2-N)
          for (let i = result.execution_plan.current; i < result.execution_plan.total; i++) {
            const step = result.execution_plan.steps[i];
            
            console.log(`⚡ Executing step ${step.step}/${result.execution_plan.total}: ${step.description}`);
            
            // Update progress UI
            setBatchExecution(prev => prev ? {...prev, current: step.step, description: step.description} : null);
            
            try {
              // Call MCP tool directly
              const toolResponse = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: `Direct execution: ${step.tool}`,
                  toolCalls: [{
                    name: step.tool,
                    args: step.args,
                  }],
                }),
              });
              
              if (!toolResponse.ok) {
                throw new Error(`Step ${step.step} failed`);
              }
              
              const stepData = await toolResponse.json();
              
              // Handle step result
              if (stepData.toolResults && stepData.toolResults.length > 0) {
                for (const toolResult of stepData.toolResults) {
                  if (toolResult.error) {
                    console.error(`⚠️ Step ${step.step} failed:`, toolResult.error);
                    continue;
                  }
                  
                  if (toolResult.mediaUrl) {
                    const mediaData: Omit<GeneratedMedia, 'id' | 'timestamp'> = {
                      type: toolResult.mediaType || "image",
                      url: toolResult.mediaUrl,
                    };
                    
                    if (toolResult.imageUrl) {
                      mediaData.imageUrl = toolResult.imageUrl;
                    }
                    
                    if (toolResult.metadata || toolResult.structuredPrompt) {
                      mediaData.metadata = {
                        structuredPrompt: toolResult.structuredPrompt || toolResult.metadata?.structuredPrompt,
                        ...toolResult.metadata,
                      };
                    }
                    
                    addToGallery(mediaData);
                    setAttributionAmount((prev) => prev + 0.001);
                  }
                }
              }
            } catch (err) {
              console.error(`❌ Step ${step.step} execution failed:`, err);
            }
          }
          
            // Batch complete
            console.log("✅ Batch execution complete");
            setBatchExecution(null);
            
            // Update the agent message with completion summary
            updateAgentMessage({
              content: `I've created ${result.execution_plan.total} compelling variations for you!`,
              status: "complete",
              agentStatus: undefined,
            });
          
          return; // Exit early
        } else if (!result.execution_plan.continue) {
          // Single step, no batch
          setBatchExecution(null);
        }
      }
    } catch (err) {
      console.error("Error generating:", err);
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [params, uploadedImageContext, addToGallery, generatedMedia, editingState, activeOperation]);

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
        status: "complete",
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
        status: "complete",
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
      status: "complete",
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
      console.log("🔄 Switching to gallery item:", id);
      console.log("  - Item has imageUrl:", !!item.imageUrl);
      console.log("  - Item imageUrl:", item.imageUrl?.substring(0, 50));
      console.log("  - Item has metadata:", !!item.metadata);
      console.log("  - Item has structured prompt:", !!item.metadata?.structuredPrompt);
      console.log("  - Full item:", { ...item, url: item.url?.substring(0, 50) });
      
      setGeneratedMedia(item);
      setActiveItemId(id);
      // Clear editing state when switching images
      clearEditingState();
    } else {
      console.warn("⚠️ Gallery item not found:", id);
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
      "remove-background": "remove background",
      "blur-background": "blur background",
      "enhance-image": "enhance image",
      "replace-background": "replace background",
      "generative-fill": "generative fill",
      "object-eraser": "object eraser",
      "increase-resolution": "increase resolution",
      "expand": "expand",
    };
    
    setOperationLoadingName(operationNames[operation]);
    setError(undefined);
    
    try {
      // Add user message for the operation
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: operationNames[operation],
        timestamp: new Date(),
        status: "complete",
      };
      setMessages((prev) => [...prev, userMessage]);
      
      // Add initial agent message (will be updated as work progresses)
      const agentMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Working on it...",
        timestamp: new Date(),
        status: "updating",
        agentStatus: "Thinking of a plan",
      };
      setMessages((prev) => [...prev, agentMessage]);
      
      // Build operation message and context based on operation type and params
      let message = "";
      let operationContext: { name: string; params?: any } = {
        name: operation,
        params: params || {},
      };
      
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
          operationContext.params = { factor: scale };
          break;
        case "replace-background":
          message = `Replace the background of the current image with: ${params?.prompt || ""}`;
          operationContext.params = { prompt: params?.prompt };
          break;
        case "generative-fill":
          message = "Apply generative fill to the masked area";
          break;
        case "object-eraser":
          message = "Erase the masked object from the image";
          break;
        case "expand":
          message = "Expand the image";
          operationContext.params = params || {};
          break;
        default:
          message = `Execute ${operation} operation`;
      }
      
      if (message) {
        // Update agent status
        updateAgentMessage({ agentStatus: `Working on your ${operationNames[operation]} request...` });
        
        // Pass operation context as second argument (Priority 1: Explicit AI Operations)
        await sendMessage(message, operationContext);
        
        // Note: sendMessage will update the agent message based on LLM response
        // No need to manually update here - the LLM provides personalized completion message
      }
      
      // Clear active operation after execution
      setActiveOperation(null);
      setActiveTool("none");
    } catch (err) {
      console.error("Error executing operation:", err);
      setError(err instanceof Error ? err.message : "Operation failed");
      
      // Update agent message with error
      updateAgentMessage({ 
        content: `Failed to ${operationNames[operation]}: ${err instanceof Error ? err.message : "Unknown error"}`,
        status: "complete",
        agentStatus: undefined,
      });
    } finally {
      setOperationLoadingName(null);
    }
  }, [generatedMedia, sendMessage, updateAgentMessage]);
  
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
        // Pre-fill prompt with instruction
        setParams((prev) => ({ ...prev, prompt: "replace the background to " }));
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
    batchExecution,
    sendMessage,
    updateAgentMessage,
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

