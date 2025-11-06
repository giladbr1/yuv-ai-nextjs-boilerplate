"use client";

import React, { useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BrushSizeControlProps {
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  className?: string;
}

export function BrushSizeControl({
  brushSize,
  onBrushSizeChange,
  className,
}: BrushSizeControlProps) {
  // Keyboard shortcuts for brush size
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        onBrushSizeChange(Math.min(100, brushSize + 5));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        onBrushSizeChange(Math.max(10, brushSize - 5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [brushSize, onBrushSizeChange]);

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-[100px]">
        <Label className="text-sm font-medium">Brush Size</Label>
        <span className="text-sm text-muted-foreground">{brushSize}px</span>
      </div>
      
      <Slider
        value={[brushSize]}
        onValueChange={([value]) => onBrushSizeChange(value)}
        min={10}
        max={100}
        step={1}
        className="flex-1 max-w-xs"
      />
      
      {/* Brush preview */}
      <div className="flex items-center justify-center w-16 h-16 border rounded">
        <div
          className="rounded-full bg-red-500/40 border-2 border-red-500"
          style={{
            width: Math.min(brushSize, 48),
            height: Math.min(brushSize, 48),
          }}
        />
      </div>
      
      <div className="text-xs text-muted-foreground">
        Tip: Use +/- keys to adjust
      </div>
    </div>
  );
}

