"use client";

import React, { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Paperclip,
  Wand2,
  Square,
  RectangleHorizontal,
  Sparkles,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatInterface } from "./ChatInterface";
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

interface LeftSidebarProps {
  messages: ChatMessage[];
  params: GenerationParams;
  onParamsChange: (params: Partial<GenerationParams>) => void;
  onGenerate: () => void;
  onImageUpload: (file: File) => void;
  onSurpriseMe: () => void;
  isGenerating?: boolean;
  className?: string;
}

const aspectRatios = [
  { label: "1:1", value: "1:1", icon: Square },
  { label: "16:9", value: "16:9", icon: RectangleHorizontal },
  { label: "4:3", value: "4:3", icon: RectangleHorizontal },
];

export function LeftSidebar({
  messages,
  params,
  onParamsChange,
  onGenerate,
  onImageUpload,
  onSurpriseMe,
  isGenerating = false,
  className,
}: LeftSidebarProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Cleanup uploaded image URL on unmount
  useEffect(() => {
    return () => {
      if (uploadedImage) {
        URL.revokeObjectURL(uploadedImage);
      }
    };
  }, [uploadedImage]);

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setUploadedImage(previewUrl);
        
        // Upload the file
        await onImageUpload(file);
      } catch (error) {
        console.error("Error uploading image:", error);
        setUploadedImage(null);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveImage = () => {
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage);
    }
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = () => {
    if (params.prompt.trim()) {
      onGenerate();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };
  
  const handlePromptFocus = () => {
    promptTextareaRef.current?.focus();
  };

  const currentAspectRatioIcon = aspectRatios.find(
    (r) => r.value === params.aspectRatio
  )?.icon || Square;
  const AspectIcon = currentAspectRatioIcon;

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Chat Interface - TOP */}
      <ChatInterface messages={messages} />

      {/* Prompt & Control Box - MIDDLE */}
      <div className="flex flex-col border-b">
        <div className="p-4 space-y-3">
          {/* Prompt Input with Icons */}
          <div className="space-y-2">
            <div className="relative">
              <Textarea
                ref={promptTextareaRef}
                placeholder="What do you want to create?"
                value={params.prompt}
                onChange={(e) => onParamsChange({ prompt: e.target.value })}
                onKeyDown={handleKeyDown}
                className={cn(
                  "min-h-[120px] pr-[76px] pb-12 resize-none text-sm scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
                  uploadedImage && "pb-20"
                )}
              />
              
              {/* Uploaded Image Preview */}
              {uploadedImage && (
                <div className="absolute bottom-2 left-2 right-20">
                  <div className="relative inline-block">
                    <img
                      src={uploadedImage}
                      alt="Uploaded reference"
                      className="h-14 w-14 object-cover rounded border bg-muted"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Upload Loading Indicator */}
              {isUploading && (
                <div className="absolute bottom-2 left-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </div>
                </div>
              )}
              
              {/* Top Right - Upload & Surprise Me */}
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleImageUploadClick}
                  title="Upload reference image"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={onSurpriseMe}
                  title="Surprise me"
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Bottom Right - Aspect Ratio */}
              <div className="absolute bottom-2 right-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1.5"
                    >
                      <AspectIcon className="h-3.5 w-3.5" />
                      {params.aspectRatio}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="end">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Aspect Ratio</Label>
                      <div className="flex gap-2">
                        {aspectRatios.map((ratio) => {
                          const Icon = ratio.icon;
                          return (
                            <Button
                              key={ratio.value}
                              variant={
                                params.aspectRatio === ratio.value
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              className="flex-1 text-xs h-8"
                              onClick={() =>
                                onParamsChange({ aspectRatio: ratio.value })
                              }
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {ratio.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload reference image"
              />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="px-4 pb-4">
          <Button
            className="w-full"
            size="default"
            onClick={handleGenerate}
            disabled={isGenerating || !params.prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
