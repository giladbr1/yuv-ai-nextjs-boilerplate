"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RotateCcw } from "lucide-react";
import type { ImageAdjustments as ImageAdjustmentsType } from "@/types/editing";
import { DEFAULT_IMAGE_ADJUSTMENTS } from "@/types/editing";
import { cn } from "@/lib/utils";

interface ImageAdjustmentsProps {
  adjustments: ImageAdjustmentsType;
  onAdjustmentsChange: (adjustments: Partial<ImageAdjustmentsType>) => void;
  onReset: () => void;
  className?: string;
}

export function ImageAdjustments({
  adjustments,
  onAdjustmentsChange,
  onReset,
  className,
}: ImageAdjustmentsProps) {
  const isModified = Object.keys(DEFAULT_IMAGE_ADJUSTMENTS).some(
    (key) =>
      adjustments[key as keyof ImageAdjustmentsType] !==
      DEFAULT_IMAGE_ADJUSTMENTS[key as keyof ImageAdjustmentsType]
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg w-80",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Image Adjustments</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!isModified}
          className="h-8 gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      {/* Brightness */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="brightness" className="text-sm">
            Brightness
          </Label>
          <span className="text-sm text-muted-foreground">
            {adjustments.brightness > 0 ? '+' : ''}
            {adjustments.brightness}
          </span>
        </div>
        <Slider
          id="brightness"
          value={[adjustments.brightness]}
          onValueChange={([value]) => onAdjustmentsChange({ brightness: value })}
          min={-100}
          max={100}
          step={1}
        />
      </div>

      {/* Contrast */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="contrast" className="text-sm">
            Contrast
          </Label>
          <span className="text-sm text-muted-foreground">
            {adjustments.contrast > 0 ? '+' : ''}
            {adjustments.contrast}
          </span>
        </div>
        <Slider
          id="contrast"
          value={[adjustments.contrast]}
          onValueChange={([value]) => onAdjustmentsChange({ contrast: value })}
          min={-100}
          max={100}
          step={1}
        />
      </div>

      {/* Saturation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="saturation" className="text-sm">
            Saturation
          </Label>
          <span className="text-sm text-muted-foreground">
            {adjustments.saturation > 0 ? '+' : ''}
            {adjustments.saturation}
          </span>
        </div>
        <Slider
          id="saturation"
          value={[adjustments.saturation]}
          onValueChange={([value]) => onAdjustmentsChange({ saturation: value })}
          min={-100}
          max={100}
          step={1}
        />
      </div>

      {/* Hue */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="hue" className="text-sm">
            Hue
          </Label>
          <span className="text-sm text-muted-foreground">
            {adjustments.hue}°
          </span>
        </div>
        <Slider
          id="hue"
          value={[adjustments.hue]}
          onValueChange={([value]) => onAdjustmentsChange({ hue: value })}
          min={0}
          max={360}
          step={1}
        />
      </div>

      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          Adjustments are applied in real-time and persist across tool switches.
        </p>
      </div>
    </div>
  );
}

