"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Play, Loader2, Download, ArrowRight } from "lucide-react";
import type { GeneratedMedia } from "@/hooks/useBriaGeneration";

interface GalleryBarProps {
  items: GeneratedMedia[];
  activeItemId?: string;
  onItemClick: (id: string) => void;
  onUseItem?: (id: string) => void;
  className?: string;
  width?: number;
}

export function GalleryBar({
  items,
  activeItemId,
  onItemClick,
  onUseItem,
  className,
  width = 100,
}: GalleryBarProps) {
  const defaultWidth = items.length === 0 ? 100 : 100;
  const galleryWidth = width || defaultWidth;
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const handleDownload = async (e: React.MouseEvent, item: GeneratedMedia) => {
    e.stopPropagation();
    if (!item.url) return;

    try {
      // For data URLs, download directly
      if (item.url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = item.url;
        link.download = `generated-${item.id}.${item.type === 'image' ? 'png' : 'mp4'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For remote URLs, fetch and download as blob
        const response = await fetch(item.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `generated-${item.id}.${item.type === 'image' ? 'png' : 'mp4'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Failed to download image:", err);
    }
  };

  const handleUse = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (onUseItem) {
      onUseItem(itemId);
    }
  };

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "h-full bg-background/50 border-l flex items-center justify-center flex-shrink-0",
          className
        )}
        style={{ width: `${galleryWidth}px` }}
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
        "h-full bg-background/50 border-l overflow-hidden flex flex-col flex-shrink-0",
        className
      )}
      style={{ width: `${galleryWidth}px` }}
    >
      <div className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {items.map((item) => {
          const isActive = item.id === activeItemId;
          
          return (
            <div
              key={item.id}
              className="relative flex-shrink-0 w-full"
              onMouseEnter={() => !item.isLoading && setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
            >
              <button
                onClick={() => !item.isLoading && onItemClick(item.id)}
                disabled={item.isLoading}
                className={cn(
                  "relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary",
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
              
              {/* Icons below image, bottom right */}
              {hoveredItemId === item.id && !item.isLoading && (
                <div className="absolute bottom-0 right-0 flex gap-1 p-1">
                  <button
                    onClick={(e) => handleDownload(e, item)}
                    className="p-1.5 bg-background/95 hover:bg-background border border-border rounded shadow-sm transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  {item.generationParams && (
                    <button
                      onClick={(e) => handleUse(e, item.id)}
                      className="p-1.5 bg-background/95 hover:bg-background border border-border rounded shadow-sm transition-colors"
                      title="Reuse generation"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-foreground" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

