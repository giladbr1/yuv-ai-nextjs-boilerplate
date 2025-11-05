"use client";

import React, { useState, useCallback } from "react";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationCanvasProps {
  generatedMedia?: {
    type: "image" | "video";
    url: string;
  };
  isGenerating?: boolean;
  onFileUpload?: (file: File) => void;
  className?: string;
}

export function GenerationCanvas({
  generatedMedia,
  isGenerating = false,
  onFileUpload,
  className,
}: GenerationCanvasProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) => file.type.startsWith("image/"));

      if (imageFile && onFileUpload) {
        onFileUpload(imageFile);
      }
    },
    [onFileUpload]
  );

  const handleClick = useCallback(() => {
    if (!generatedMedia && !isGenerating) {
      fileInputRef.current?.click();
    }
  }, [generatedMedia, isGenerating]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onFileUpload) {
        onFileUpload(file);
      }
    },
    [onFileUpload]
  );

  return (
    <div
      className={cn(
        "relative flex items-center justify-center bg-muted/30 overflow-hidden",
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {/* Loading State */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground">
            Generating your creation...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!generatedMedia && !isGenerating && (
        <div
          className={cn(
            "flex flex-col items-center justify-center space-y-4 p-8 transition-colors cursor-pointer",
            isDragging && "bg-primary/10 border-2 border-primary border-dashed"
          )}
        >
          <Upload
            className={cn(
              "h-16 w-16 text-muted-foreground transition-colors",
              isDragging && "text-primary"
            )}
          />
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-foreground">
              {isDragging
                ? "Drop your image here"
                : "use the chat to guide the generation"}
            </p>
            <p className="text-sm text-muted-foreground">
              or upload an image to perform direct editing
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Generated Media Display */}
      {generatedMedia && !isGenerating && (
        <div className="relative w-full h-full flex items-center justify-center p-4">
          {generatedMedia.type === "image" ? (
            <img
              src={generatedMedia.url}
              alt="Generated content"
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            />
          ) : (
            <video
              src={generatedMedia.url}
              controls
              className="max-w-full max-h-full rounded-lg shadow-lg"
            />
          )}
        </div>
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/5 border-4 border-dashed border-primary pointer-events-none" />
      )}
    </div>
  );
}

