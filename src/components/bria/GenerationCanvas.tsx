"use client";

import React, { useState, useCallback } from "react";
import { Upload, Loader2, ThumbsUp, ThumbsDown, Maximize2, Download, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type {
  EditingTool,
  SelectionRect,
  TextLayer,
  ImageAdjustments as ImageAdjustmentsType,
} from "@/types/editing";
import { ImageEditorCanvas } from "./ImageEditorCanvas";
import { EditingToolbar } from "./EditingToolbar";
import { BrushSizeControl } from "./BrushSizeControl";
import { TextEditor } from "./TextEditor";
import { ImageAdjustments } from "./ImageAdjustments";
import { DEFAULT_IMAGE_ADJUSTMENTS } from "@/types/editing";

interface GenerationCanvasProps {
  generatedMedia?: {
    type: "image" | "video";
    url: string;
  };
  isGenerating?: boolean;
  onFileUpload?: (file: File) => void;
  className?: string;
  // Editing props
  activeTool?: EditingTool;
  selection?: SelectionRect | null;
  maskData?: ImageData | null;
  textLayers?: TextLayer[];
  imageAdjustments?: ImageAdjustmentsType;
  brushSize?: number;
  onToolChange?: (tool: EditingTool) => void;
  onSelectionChange?: (rect: SelectionRect | null) => void;
  onMaskChange?: (imageData: ImageData | null) => void;
  onTextLayerAdd?: (layer: Omit<TextLayer, 'id'>) => void;
  onTextLayerUpdate?: (id: string, updates: Partial<TextLayer>) => void;
  onImageAdjustmentsChange?: (adjustments: Partial<ImageAdjustmentsType>) => void;
  onBrushSizeChange?: (size: number) => void;
  onImageAdjustmentsReset?: () => void;
}

export function GenerationCanvas({
  generatedMedia,
  isGenerating = false,
  onFileUpload,
  className,
  activeTool = 'none',
  selection = null,
  maskData = null,
  textLayers = [],
  imageAdjustments = DEFAULT_IMAGE_ADJUSTMENTS,
  brushSize = 30,
  onToolChange,
  onSelectionChange,
  onMaskChange,
  onTextLayerAdd,
  onTextLayerUpdate,
  onImageAdjustmentsChange,
  onBrushSizeChange,
  onImageAdjustmentsReset,
}: GenerationCanvasProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const hasEditingProps = onToolChange && onSelectionChange && onMaskChange;

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

  const handleFeedback = useCallback((type: 'up' | 'down') => {
    setFeedback(prev => prev === type ? null : type);
    // TODO: Send feedback to backend
    console.log(`Feedback: ${type}`);
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!generatedMedia) return;
    
    // Create a fullscreen modal
    const img = document.createElement('img');
    img.src = generatedMedia.url;
    img.style.cssText = 'max-width: 100%; max-height: 100%; object-fit: contain;';
    
    const container = document.createElement('div');
    container.style.cssText = 'position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.95); display: flex; align-items: center; justify-content: center; padding: 2rem;';
    container.onclick = () => document.body.removeChild(container);
    
    container.appendChild(img);
    document.body.appendChild(container);
  }, [generatedMedia]);

  const handleExport = useCallback(() => {
    if (!generatedMedia) return;
    
    const link = document.createElement('a');
    link.href = generatedMedia.url;
    link.download = `generated-${Date.now()}.${generatedMedia.type === 'image' ? 'png' : 'mp4'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedMedia]);

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
            aria-label="Upload image file"
          />
        </div>
      )}

      {/* Generated Media Display */}
      {generatedMedia && !isGenerating && (
        <div className="relative w-full h-full flex items-center justify-center p-4">
          {/* Editing Toolbar - Left Side */}
          {generatedMedia.type === "image" && hasEditingProps && (
            <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10">
              <EditingToolbar
                activeTool={activeTool}
                onToolChange={onToolChange}
                disabled={false}
              />
            </div>
          )}
          
          {/* Brush Size Control - Below Canvas */}
          {generatedMedia.type === "image" && hasEditingProps && activeTool === 'mask' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
              <BrushSizeControl
                brushSize={brushSize}
                onBrushSizeChange={onBrushSizeChange!}
              />
            </div>
          )}
          
          {/* Text Editor - Right Side */}
          {generatedMedia.type === "image" && hasEditingProps && activeTool === 'text' && (
            <div className="absolute right-6 top-6 z-10">
              <TextEditor onAddText={onTextLayerAdd!} />
            </div>
          )}
          
          {/* Image Adjustments - Right Side */}
          {generatedMedia.type === "image" && hasEditingProps && activeTool === 'adjust' && (
            <div className="absolute right-6 top-6 z-10">
              <ImageAdjustments
                adjustments={imageAdjustments}
                onAdjustmentsChange={onImageAdjustmentsChange!}
                onReset={onImageAdjustmentsReset!}
              />
            </div>
          )}
          
          {/* Image/Video Display */}
          {generatedMedia.type === "image" && hasEditingProps ? (
            <div 
              className="relative group flex items-center justify-center w-full h-full"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <div className="relative w-full h-full">
                <ImageEditorCanvas
                  imageUrl={generatedMedia.url}
                  activeTool={activeTool}
                  selection={selection}
                  maskData={maskData}
                  textLayers={textLayers}
                  imageAdjustments={imageAdjustments}
                  brushSize={brushSize}
                  onSelectionChange={onSelectionChange}
                  onMaskChange={onMaskChange}
                  onTextLayerUpdate={onTextLayerUpdate!}
                />
            
              {/* Hover Overlay with Controls */}
              <TooltipProvider delayDuration={300}>
                <div className={cn(
                  "absolute inset-0 transition-opacity duration-200 pointer-events-none",
                  isHovering ? "opacity-100" : "opacity-0"
                )}>
                  {/* Content Credentials - Top Left */}
                  <div className="absolute top-4 left-4 pointer-events-auto">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
                        >
                          <Info className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="font-medium">Image created by AI using Bria.ai</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Export and Fullscreen - Top Right */}
                  <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
                          onClick={handleExport}
                        >
                          <Download className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Export</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
                          onClick={handleFullscreen}
                        >
                          <Maximize2 className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Fullscreen</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Feedback - Bottom Middle */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant={feedback === 'up' ? 'default' : 'secondary'}
                          className={cn(
                            "h-10 w-10 rounded-full shadow-lg transition-all",
                            feedback === 'up' 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-background/90 backdrop-blur-sm hover:bg-background"
                          )}
                          onClick={() => handleFeedback('up')}
                        >
                          <ThumbsUp className={cn("h-5 w-5", feedback === 'up' && "fill-current")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Good result</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant={feedback === 'down' ? 'default' : 'secondary'}
                          className={cn(
                            "h-10 w-10 rounded-full shadow-lg transition-all",
                            feedback === 'down' 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-background/90 backdrop-blur-sm hover:bg-background"
                          )}
                          onClick={() => handleFeedback('down')}
                        >
                          <ThumbsDown className={cn("h-5 w-5", feedback === 'down' && "fill-current")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Poor result</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </TooltipProvider>
              </div>
            </div>
          ) : generatedMedia.type === "image" ? (
            <div 
              className="relative group"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <img
                src={generatedMedia.url}
                alt="Generated content"
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            
              {/* Hover Overlay with Controls */}
              <TooltipProvider delayDuration={300}>
                <div className={cn(
                  "absolute inset-0 transition-opacity duration-200 pointer-events-none",
                  isHovering ? "opacity-100" : "opacity-0"
                )}>
                  {/* Content Credentials - Top Left */}
                  <div className="absolute top-4 left-4 pointer-events-auto">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
                        >
                          <Info className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="font-medium">Image created by AI using Bria.ai</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Export and Fullscreen - Top Right */}
                  <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
                          onClick={handleExport}
                        >
                          <Download className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Export</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
                          onClick={handleFullscreen}
                        >
                          <Maximize2 className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Fullscreen</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Feedback - Bottom Middle */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant={feedback === 'up' ? 'default' : 'secondary'}
                          className={cn(
                            "h-10 w-10 rounded-full shadow-lg transition-all",
                            feedback === 'up' 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-background/90 backdrop-blur-sm hover:bg-background"
                          )}
                          onClick={() => handleFeedback('up')}
                        >
                          <ThumbsUp className={cn("h-5 w-5", feedback === 'up' && "fill-current")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Good result</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant={feedback === 'down' ? 'default' : 'secondary'}
                          className={cn(
                            "h-10 w-10 rounded-full shadow-lg transition-all",
                            feedback === 'down' 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-background/90 backdrop-blur-sm hover:bg-background"
                          )}
                          onClick={() => handleFeedback('down')}
                        >
                          <ThumbsDown className={cn("h-5 w-5", feedback === 'down' && "fill-current")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Poor result</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </TooltipProvider>
            </div>
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

