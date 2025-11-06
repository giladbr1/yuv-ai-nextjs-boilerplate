"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Hand,
  Square,
  Paintbrush,
  Type,
  Sliders,
} from "lucide-react";
import type { EditingTool } from "@/types/editing";
import { cn } from "@/lib/utils";

interface EditingToolbarProps {
  activeTool: EditingTool;
  onToolChange: (tool: EditingTool) => void;
  disabled?: boolean;
  className?: string;
}

const tools: Array<{
  id: EditingTool;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}> = [
  {
    id: "move",
    icon: Hand,
    label: "Move",
    description: "Move selection or mask",
  },
  {
    id: "select",
    icon: Square,
    label: "Select",
    description: "Create selection rectangle",
  },
  {
    id: "mask",
    icon: Paintbrush,
    label: "Mask",
    description: "Paint mask for inpainting",
  },
  {
    id: "text",
    icon: Type,
    label: "Text",
    description: "Add text to image",
  },
  {
    id: "adjust",
    icon: Sliders,
    label: "Adjust",
    description: "Adjust image properties",
  },
];

export function EditingToolbar({
  activeTool,
  onToolChange,
  disabled = false,
  className,
}: EditingToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex flex-col gap-1 p-2 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
      >
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="icon"
                  onClick={() => onToolChange(tool.id)}
                  disabled={disabled}
                  className={cn(
                    "h-10 w-10",
                    isActive && "shadow-md"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="text-sm">
                  <div className="font-semibold">{tool.label}</div>
                  <div className="text-muted-foreground text-xs">
                    {tool.description}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

