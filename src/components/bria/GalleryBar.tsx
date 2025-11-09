"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Play, Loader2 } from "lucide-react";

export interface GalleryItem {
  id: string;
  type: "image" | "video";
  url: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface GalleryBarProps {
  items: GalleryItem[];
  activeItemId?: string;
  onItemClick: (id: string) => void;
  className?: string;
}

export function GalleryBar({
  items,
  activeItemId,
  onItemClick,
  className,
}: GalleryBarProps) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "h-full w-32 bg-background/50 border-l flex items-center justify-center",
          className
        )}
      >
        <p className="text-xs text-muted-foreground text-center px-2 rotate-0 writing-mode-vertical">
          Gallery
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "h-full w-32 bg-background/50 border-l overflow-hidden flex flex-col",
        className
      )}
    >
      <div className="flex-1 flex flex-col gap-3 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {items.map((item) => {
          const isActive = item.id === activeItemId;
          
          return (
            <button
              key={item.id}
              onClick={() => !item.isLoading && onItemClick(item.id)}
              disabled={item.isLoading}
              className={cn(
                "relative flex-shrink-0 w-full aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary",
                item.isLoading 
                  ? "cursor-wait border-muted"
                  : isActive
                  ? "border-primary ring-2 ring-primary shadow-lg hover:scale-105"
                  : "border-muted hover:border-primary/50 hover:scale-105"
              )}
              title={item.isLoading ? "Generating..." : `Created at ${item.timestamp.toLocaleTimeString()}`}
            >
              {/* Loading state */}
              {item.isLoading ? (
                <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : (
                <>
                  {/* Thumbnail */}
                  {item.type === "image" ? (
                    <img
                      src={item.url}
                      alt="Generated content"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                      />
                      {/* Video play icon overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-6 h-6 text-white" fill="white" />
                      </div>
                    </div>
                  )}
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

