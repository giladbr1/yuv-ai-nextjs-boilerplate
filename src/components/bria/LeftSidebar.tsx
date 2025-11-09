"use client";

import React, { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Paperclip,
  Wand2,
  Square,
  RectangleHorizontal,
  Sparkles,
  Shuffle,
  Settings2,
  Gauge,
  Hash,
  Image as ImageIcon,
  Video,
  Sliders,
  X,
  Loader2,
  Eraser,
  Focus,
  Zap,
  Maximize2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatInterface } from "./ChatInterface";
import type { AIOperation } from "@/types/instructions";
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
  hasImage?: boolean;
  // Quick Tools props
  activeOperation: AIOperation | null;
  operationLoadingName: string | null;
  onOperationSelect: (operation: AIOperation) => void;
  onOperationCancel: () => void;
  onOperationExecute: (operation: AIOperation, params?: any) => void;
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
  hasImage = false,
  activeOperation,
  operationLoadingName,
  onOperationSelect,
  onOperationCancel,
  onOperationExecute,
}: LeftSidebarProps) {
  const [seedMode, setSeedMode] = useState<"random" | "fixed">(
    params.seed === "random" ? "random" : "fixed"
  );
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

  const handleSeedModeToggle = () => {
    if (seedMode === "random") {
      setSeedMode("fixed");
      onParamsChange({ seed: 42 });
    } else {
      setSeedMode("random");
      onParamsChange({ seed: "random" });
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
  
  const handleAspectRatioChange = (ratio: string) => {
    onParamsChange({ aspectRatio: ratio });
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
                  "min-h-[120px] pr-20 resize-none text-sm",
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload reference image"
              />
            </div>

            {/* Parameter Icons Row */}
            <div className="flex items-center gap-2 px-1">
              {/* Mode Toggle - Image/Video */}
              <div className="flex rounded-md border">
                <Button
                  variant={params.mode === "image" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-3 rounded-r-none border-r"
                  onClick={() => onParamsChange({ mode: "image" })}
                  title="Image"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={params.mode === "video" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-3 rounded-l-none"
                  onClick={() => onParamsChange({ mode: "video" })}
                  title="Video"
                >
                  <Video className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Model - Direct Dropdown */}
              <Select
                value={params.model_version}
                onValueChange={(value) =>
                  onParamsChange({
                    model_version: value as "Fibo" | "3.2" | "EA tailored",
                  })
                }
              >
                <SelectTrigger className="h-8 w-auto px-3 text-xs gap-1.5 border">
                  <Settings2 className="h-3.5 w-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fibo">Fibo</SelectItem>
                  <SelectItem value="3.2">3.2</SelectItem>
                  <SelectItem value="EA tailored">EA tailored</SelectItem>
                  <div className="px-2 py-1.5 text-xs border-t mt-1">
                    <a
                      href="#"
                      className="text-primary hover:underline"
                      onClick={(e) => e.preventDefault()}
                    >
                      train a tailored engine
                    </a>
                  </div>
                </SelectContent>
              </Select>

              {/* Model Influence - Conditional, shown as icon */}
              {params.model_version === "EA tailored" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs gap-1.5"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      {params.modelInfluence.toFixed(2)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="start">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">
                          Model Influence
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {params.modelInfluence.toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        value={[params.modelInfluence]}
                        onValueChange={([value]) =>
                          onParamsChange({ modelInfluence: value })
                        }
                        min={0}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* Steps */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs gap-1.5"
                  >
                    <Gauge className="h-3.5 w-3.5" />
                    {params.steps}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Steps</Label>
                      <span className="text-xs text-muted-foreground">
                        {params.steps}
                      </span>
                    </div>
                    <Slider
                      value={[params.steps]}
                      onValueChange={([value]) =>
                        onParamsChange({ steps: value })
                      }
                      min={10}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {/* Aspect Ratio */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs gap-1.5"
                  >
                    <AspectIcon className="h-3.5 w-3.5" />
                    {params.aspectRatio}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
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

              {/* Seed */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs gap-1.5"
                  >
                    <Hash className="h-3.5 w-3.5" />
                    {seedMode === "random" ? "Random" : params.seed}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Seed</Label>
                    <div className="flex gap-2">
                      <Input
                        type={seedMode === "random" ? "text" : "number"}
                        value={seedMode === "random" ? "Random" : params.seed}
                        onChange={(e) =>
                          seedMode === "fixed" &&
                          onParamsChange({
                            seed: parseInt(e.target.value) || 0,
                          })
                        }
                        disabled={seedMode === "random"}
                        className="flex-1 text-sm h-8"
                        placeholder="Random"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={handleSeedModeToggle}
                        title={
                          seedMode === "random"
                            ? "Use fixed seed"
                            : "Use random seed"
                        }
                      >
                        <Shuffle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
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

      {/* Quick AI Operations - BOTTOM */}
      <div className="border-b bg-muted/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground whitespace-nowrap">Quick AI operations</p>
          <div className="flex items-center gap-3">
            {/* Remove BG */}
            <div className="relative w-8 h-8 group/tool">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOperationExecute("remove-background")}
                disabled={!hasImage}
              >
                <Eraser className="h-4 w-4" />
              </Button>
              <div className="absolute left-0 top-0 h-8 px-3 bg-primary text-primary-foreground rounded-md flex items-center gap-2 opacity-0 group-hover/tool:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-md z-50">
                <Eraser className="h-4 w-4" />
                <span className="text-xs font-medium">Remove BG</span>
              </div>
            </div>

            {/* Blur BG */}
            <div className="relative w-8 h-8 group/tool">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOperationExecute("blur-background")}
                disabled={!hasImage}
              >
                <Focus className="h-4 w-4" />
              </Button>
              <div className="absolute left-0 top-0 h-8 px-3 bg-primary text-primary-foreground rounded-md flex items-center gap-2 opacity-0 group-hover/tool:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-md z-50">
                <Focus className="h-4 w-4" />
                <span className="text-xs font-medium">Blur BG</span>
              </div>
            </div>

            {/* Enhance */}
            <div className="relative w-8 h-8 group/tool">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOperationExecute("enhance-image")}
                disabled={!hasImage}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
              <div className="absolute left-0 top-0 h-8 px-3 bg-primary text-primary-foreground rounded-md flex items-center gap-2 opacity-0 group-hover/tool:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-md z-50">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-medium">Enhance</span>
              </div>
            </div>

            {/* Increase Resolution - with dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <div className="relative w-8 h-8 group/tool">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={!hasImage}
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                  <div className="absolute left-0 top-0 h-8 px-3 bg-primary text-primary-foreground rounded-md flex items-center gap-2 opacity-0 group-hover/tool:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-md z-50">
                    <Zap className="h-4 w-4" />
                    <span className="text-xs font-medium">Upscale</span>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-2" align="start">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8"
                    onClick={() => onOperationExecute("increase-resolution", { scale: 2 })}
                  >
                    2x
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8"
                    onClick={() => onOperationExecute("increase-resolution", { scale: 4 })}
                  >
                    4x
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Expand - with dropdown of aspect ratios */}
            <Popover>
              <PopoverTrigger asChild>
                <div className="relative w-8 h-8 group/tool">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={!hasImage}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <div className="absolute left-0 top-0 h-8 px-3 bg-primary text-primary-foreground rounded-md flex items-center gap-2 opacity-0 group-hover/tool:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-md z-50">
                    <Maximize2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Expand</span>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-2" align="start">
                <div className="flex flex-col gap-1">
                  {aspectRatios.map((ratio) => (
                    <Button
                      key={ratio.value}
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8"
                      onClick={() => {
                        onParamsChange({ aspectRatio: ratio.value });
                        onOperationExecute("expand");
                      }}
                    >
                      {ratio.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

    </div>
  );
}
