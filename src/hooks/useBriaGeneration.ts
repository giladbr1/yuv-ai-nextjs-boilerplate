"use client";

import { useState, useCallback, useEffect } from "react";

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
}

interface UseBriaGenerationReturn {
  // State
  messages: ChatMessage[];
  params: GenerationParams;
  attributionAmount: number;
  generatedMedia?: GeneratedMedia;
  isGenerating: boolean;
  error?: string;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  updateParams: (newParams: Partial<GenerationParams>) => void;
  generate: () => Promise<void>;
  uploadImage: (file: File) => Promise<void>;
  surpriseMe: () => void;
  clearError: () => void;
}

const DEFAULT_PARAMS: GenerationParams = {
  mode: "image",
  model_version: "3.2",
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>();

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
            currentParams: params,
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

        // Execute tool calls if any
        if (data.toolCalls && data.toolCalls.length > 0) {
          for (const toolCall of data.toolCalls) {
            await executeToolCall(toolCall.name, toolCall.args);
          }
        }
      } catch (err) {
        console.error("Error sending message:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    },
    [params]
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
            setGeneratedMedia({
              type: "image",
              url: content.data || content.text || "",
            });

            // Update attribution (mock calculation - would come from MCP metadata)
            setAttributionAmount((prev) => prev + 0.001);
          } else if (content.type === "video" || content.mimeType?.startsWith("video/")) {
            setGeneratedMedia({
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
    []
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
          setGeneratedMedia({
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
        setGeneratedMedia(result.media);
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
  }, [params]);

  // Upload and process image
  const uploadImage = useCallback(async (file: File) => {
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

      // Display uploaded image
      setGeneratedMedia({
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
      console.error("Error uploading image:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }, []);

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

  return {
    messages,
    params,
    attributionAmount,
    generatedMedia,
    isGenerating,
    error,
    sendMessage,
    updateParams,
    generate,
    uploadImage,
    surpriseMe,
    clearError,
  };
}

