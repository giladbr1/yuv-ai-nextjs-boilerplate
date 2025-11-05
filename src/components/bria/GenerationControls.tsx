"use client";

import React, { useState } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Paperclip,
  Wand2,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Shuffle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface GenerationParams {
  mode: "image" | "video";
  model_version: "Fibo" | "3.2" | "EA tailored";
  modelInfluence: number;
  steps: number;
  aspectRatio: string;
  seed: string | number;
  prompt: string;
}

interface GenerationControlsProps {
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
  { label: "9:16", value: "9:16", icon: RectangleVertical },
  { label: "4:3", value: "4:3", icon: RectangleHorizontal },
  { label: "3:4", value: "3:4", icon: RectangleVertical },
];

export function GenerationControls({
  params,
  onParamsChange,
  onGenerate,
  onImageUpload,
  onSurpriseMe,
  isGenerating = false,
  className,
}: GenerationControlsProps) {
  const [seedMode, setSeedMode] = useState<"random" | "fixed">(
    params.seed === "random" ? "random" : "fixed"
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
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

  return (
    <div className={cn("space-y-4 p-4 border-t bg-background", className)}>
      {/* Prompt Input */}
      <div className="relative">
        <Textarea
          placeholder="Describe what you want to create..."
          value={params.prompt}
          onChange={(e) => onParamsChange({ prompt: e.target.value })}
          className="min-h-[100px] pr-20 resize-none"
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleImageUploadClick}
            title="Upload reference image"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
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
        />
      </div>

      {/* Mode Toggle */}
      <div className="space-y-2">
        <Label>Mode</Label>
        <Tabs
          value={params.mode}
          onValueChange={(value) =>
            onParamsChange({ mode: value as "image" | "video" })
          }
          className="w-full"
        >
          <TabsList className="w-full">
            <TabsTrigger value="image" className="flex-1">
              Image
            </TabsTrigger>
            <TabsTrigger value="video" className="flex-1">
              Video
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <Label>Model</Label>
        <Select
          value={params.model_version}
          onValueChange={(value) =>
            onParamsChange({
              model_version: value as "Fibo" | "3.2" | "EA tailored",
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Fibo">Fibo</SelectItem>
            <SelectItem value="3.2">3.2</SelectItem>
            <SelectItem value="EA tailored">EA tailored</SelectItem>
            <div className="px-2 py-1.5 text-sm">
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
      </div>

      {/* Model Influence - Only visible for EA tailored */}
      {params.model_version === "EA tailored" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Model Influence</Label>
            <span className="text-sm text-muted-foreground">
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
      )}

      {/* Steps */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Steps</Label>
          <span className="text-sm text-muted-foreground">{params.steps}</span>
        </div>
        <Slider
          value={[params.steps]}
          onValueChange={([value]) => onParamsChange({ steps: value })}
          min={10}
          max={50}
          step={1}
          className="w-full"
        />
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label>Aspect Ratio</Label>
        <div className="flex gap-2">
          {aspectRatios.map((ratio) => {
            const Icon = ratio.icon;
            return (
              <Button
                key={ratio.value}
                variant={
                  params.aspectRatio === ratio.value ? "default" : "outline"
                }
                size="sm"
                className="flex-1"
                onClick={() => onParamsChange({ aspectRatio: ratio.value })}
              >
                <Icon className="h-4 w-4 mr-1" />
                {ratio.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Seed */}
      <div className="space-y-2">
        <Label>Seed</Label>
        <div className="flex gap-2">
          <Input
            type={seedMode === "random" ? "text" : "number"}
            value={seedMode === "random" ? "Random" : params.seed}
            onChange={(e) =>
              seedMode === "fixed" &&
              onParamsChange({ seed: parseInt(e.target.value) || 0 })
            }
            disabled={seedMode === "random"}
            className="flex-1"
          />
          <Button
            size="icon"
            variant="outline"
            onClick={handleSeedModeToggle}
            title={
              seedMode === "random" ? "Use fixed seed" : "Use random seed"
            }
          >
            <Shuffle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={onGenerate}
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
  );
}

