"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

export interface GalleryItem {
  id: string;
  type: "image" | "video";
  url: string;
  timestamp: Date;
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
          "w-full h-24 bg-background/50 border-t flex items-center justify-center",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">
          Your generation gallery will appear here
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full bg-background/50 border-t overflow-hidden",
        className
      )}
    >
      <div className="flex items-center gap-3 p-3 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {items.map((item) => {
          const isActive = item.id === activeItemId;
          
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={cn(
                "relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary",
                isActive
                  ? "border-primary ring-2 ring-primary shadow-lg"
                  : "border-muted hover:border-primary/50"
              )}
              title={`Created at ${item.timestamp.toLocaleTimeString()}`}
            >
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
            </button>
          );
        })}
      </div>
    </div>
  );
}

