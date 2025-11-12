"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Loader2, ThumbsUp, ThumbsDown, Maximize2, Download, Info, Eraser, Focus, Sparkles, Zap, Paintbrush, Trash2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/ui/dot-pattern";
import type { AIOperation } from "@/types/instructions";

interface GenerationCanvasProps {
  generatedMedia?: {
    type: "image" | "video";
    url: string;
  };
  isGenerating?: boolean;
  batchExecution?: {
    active: boolean;
    current: number;
    total: number;
    description: string;
    steps: Array<{
      step: number;
      tool: string;
      args: Record<string, any>;
      description: string;
    }>;
  } | null;
  onFileUpload?: (file: File) => void;
  className?: string;
  // Quick AI Operations props
  hasImage?: boolean;
  onOperationExecute?: (operation: AIOperation, params?: any) => void;
  onAspectRatioChange?: (aspectRatio: string) => void;
  // Inpainting props
  onPromptFocus?: () => void;
  onFillMask?: (maskBase64: string) => void;
}

const aspectRatios = [
  { label: "1:1", value: "1:1" },
  { label: "16:9", value: "16:9" },
  { label: "4:3", value: "4:3" },
];

export function GenerationCanvas({
  generatedMedia,
  isGenerating = false,
  batchExecution,
  onFileUpload,
  className,
  hasImage = false,
  onOperationExecute,
  onAspectRatioChange,
  onPromptFocus,
  onFillMask,
}: GenerationCanvasProps) {
  // File upload states
  const [isDragging, setIsDragging] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Inpainting states
  const [isInpaintingActive, setIsInpaintingActive] = useState(false);
  const [brushSize, setBrushSize] = useState(50);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastDrawPosition, setLastDrawPosition] = useState<{ x: number; y: number } | null>(null);
  const [showMaskMenu, setShowMaskMenu] = useState(false);
  const [maskMenuPosition, setMaskMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const menuTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Pan and zoom states
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [lastInteractionTime, setLastInteractionTime] = useState(0);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const panStartPos = useRef({ x: 0, y: 0 });
  const panStartOffset = useRef({ x: 0, y: 0 });
  
  // Hide controls after interaction stops
  useEffect(() => {
    if (isInteracting) {
      const timer = setTimeout(() => {
        setIsInteracting(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [lastInteractionTime, isInteracting]);

  // Calculate pan boundaries based on zoom level
  const calculatePanBoundaries = useCallback(() => {
    if (!imageContainerRef.current || zoom <= 1) return null;
    
    const container = canvasRef.current;
    if (!container) return null;
    
    const containerRect = container.getBoundingClientRect();
    const imageRect = imageContainerRef.current.getBoundingClientRect();
    
    // Calculate how much the zoomed image exceeds the viewport
    const scaledWidth = imageRect.width * zoom;
    const scaledHeight = imageRect.height * zoom;
    
    const maxPanX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const maxPanY = Math.max(0, (scaledHeight - containerRect.height) / 2);
    
    return { maxPanX, maxPanY };
  }, [zoom]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!generatedMedia || zoom <= 1) return; // Only allow panning when zoomed in
    
    setIsPanning(true);
    setIsInteracting(true);
    panStartPos.current = { x: e.clientX, y: e.clientY };
    panStartOffset.current = { ...panOffset };
  }, [generatedMedia, panOffset, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    
    const dx = e.clientX - panStartPos.current.x;
    const dy = e.clientY - panStartPos.current.y;
    
    let newX = panStartOffset.current.x + dx;
    let newY = panStartOffset.current.y + dy;
    
    // Apply boundaries
    const boundaries = calculatePanBoundaries();
    if (boundaries) {
      newX = Math.max(-boundaries.maxPanX, Math.min(boundaries.maxPanX, newX));
      newY = Math.max(-boundaries.maxPanY, Math.min(boundaries.maxPanY, newY));
    }
    
    setPanOffset({ x: newX, y: newY });
    setLastInteractionTime(Date.now());
  }, [isPanning, calculatePanBoundaries]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!generatedMedia) return;
    
    e.preventDefault();
    setIsInteracting(true);
    
    const delta = -e.deltaY * 0.001;
    // Limit zoom: minimum 1.0 (original size), maximum 5.0
    const newZoom = Math.max(1.0, Math.min(5, zoom + delta));
    
    // Only update if zoom actually changed
    if (newZoom === zoom) {
      setLastInteractionTime(Date.now());
      return;
    }
    
    // Reset pan offset when zooming back to 1.0
    if (newZoom === 1.0) {
      setPanOffset({ x: 0, y: 0 });
      setZoom(newZoom);
      setLastInteractionTime(Date.now());
      return;
    }
    
    // Zoom towards mouse cursor
    if (imageContainerRef.current) {
      const rect = imageContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      
      const zoomRatio = newZoom / zoom;
      setPanOffset({
        x: panOffset.x - mouseX * (zoomRatio - 1),
        y: panOffset.y - mouseY * (zoomRatio - 1),
      });
    }
    
    setZoom(newZoom);
    setLastInteractionTime(Date.now());
  }, [generatedMedia, zoom, panOffset]);

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

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Only trigger upload if not panning/zooming and no media is present
    if (!generatedMedia && !isGenerating && !isPanning) {
      fileInputRef.current?.click();
    }
  }, [generatedMedia, isGenerating, isPanning]);

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

  // Inpainting mask drawing handlers
  const startMaskDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isInpaintingActive || !maskCanvasRef.current) return;
    
    // Clear any existing menu timer
    if (menuTimerRef.current) {
      clearTimeout(menuTimerRef.current);
      menuTimerRef.current = null;
    }
    setShowMaskMenu(false);
    
    const canvas = maskCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setLastDrawPosition({ x, y });
    
    // Start drawing at this point
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }, [isInpaintingActive]);

  const drawMask = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !maskCanvasRef.current || !lastDrawPosition) return;
    
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#8800FF";
    
    ctx.moveTo(lastDrawPosition.x, lastDrawPosition.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    setLastDrawPosition({ x, y });
  }, [isDrawing, lastDrawPosition, brushSize]);

  const stopMaskDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    setLastDrawPosition(null);
    
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Store menu position near the last draw position
    setMaskMenuPosition({ x: e.clientX, y: e.clientY });
    
    // Start 1-second timer to show menu
    menuTimerRef.current = setTimeout(() => {
      setShowMaskMenu(true);
    }, 1000);
  }, [isDrawing]);

  // Extract mask as base64
  const extractMask = useCallback((): string | null => {
    if (!maskCanvasRef.current) return null;
    
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskCanvas = document.createElement('canvas');
    const maskContext = maskCanvas.getContext('2d');
    if (!maskContext) return null;
    
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    
    // Convert drawn pixels to white (255), empty to black (0)
    for (let i = 0; i < imageData.data.length; i += 4) {
      const isFilled = imageData.data[i + 3] !== 0;
      const maskValue = isFilled ? 255 : 0;
      
      imageData.data[i] = maskValue;
      imageData.data[i + 1] = maskValue;
      imageData.data[i + 2] = maskValue;
      imageData.data[i + 3] = 255;
    }
    
    maskContext.putImageData(imageData, 0, 0);
    
    const dataUrl = maskCanvas.toDataURL('image/png');
    const commaIdx = dataUrl.indexOf(',');
    return commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  }, []);

  return (
    <div
      ref={canvasRef}
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-neutral-50",
        className
      )}
      style={{
        cursor: generatedMedia 
          ? (isPanning ? 'grabbing' : (zoom > 1 ? 'grab' : 'default'))
          : 'default'
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      {/* Floating AI Operations Toolbox */}
      {onOperationExecute && hasImage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md rounded-full px-3 py-1.5 shadow-lg border border-neutral-200/50">
              {/* Remove BG */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-neutral-100 disabled:opacity-40"
                    onClick={() => onOperationExecute("remove-background")}
                    disabled={!hasImage}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove Background</p>
                </TooltipContent>
              </Tooltip>

              <div className="w-px h-4 bg-neutral-200" />

              {/* Blur BG */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-neutral-100 disabled:opacity-40"
                    onClick={() => onOperationExecute("blur-background")}
                    disabled={!hasImage}
                  >
                    <Focus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Blur Background</p>
                </TooltipContent>
              </Tooltip>

              <div className="w-px h-4 bg-neutral-200" />

              {/* Enhance */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-neutral-100 disabled:opacity-40"
                    onClick={() => onOperationExecute("enhance-image")}
                    disabled={!hasImage}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enhance Image</p>
                </TooltipContent>
              </Tooltip>

              <div className="w-px h-4 bg-neutral-200" />

              {/* Inpainting */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 rounded-full hover:bg-neutral-100 disabled:opacity-40",
                      isInpaintingActive && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    onClick={() => setIsInpaintingActive(!isInpaintingActive)}
                    disabled={!hasImage}
                  >
                    <Paintbrush className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Inpainting</p>
                </TooltipContent>
              </Tooltip>

              <div className="w-px h-4 bg-neutral-200" />

              {/* Upscale - with dropdown */}
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full hover:bg-neutral-100 disabled:opacity-40"
                        disabled={!hasImage}
                      >
                        <Zap className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upscale Resolution</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-28 p-2" align="center" side="bottom">
                  <div className="flex flex-col gap-1">
                    <PopoverClose asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-center h-8 text-sm font-medium"
                        onClick={() => onOperationExecute("increase-resolution", { scale: 2 })}
                      >
                        2x
                      </Button>
                    </PopoverClose>
                    <PopoverClose asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-center h-8 text-sm font-medium"
                        onClick={() => onOperationExecute("increase-resolution", { scale: 4 })}
                      >
                        4x
                      </Button>
                    </PopoverClose>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="w-px h-4 bg-neutral-200" />

              {/* Expand - with dropdown */}
              {onAspectRatioChange && (
                <Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full hover:bg-neutral-100 disabled:opacity-40"
                          disabled={!hasImage}
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Expand Image</p>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-28 p-2" align="center" side="bottom">
                    <div className="flex flex-col gap-1">
                      {aspectRatios.map((ratio) => (
                        <PopoverClose key={ratio.value} asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-center h-8 text-sm font-medium"
                            onClick={() => {
                              onAspectRatioChange(ratio.value);
                              onOperationExecute("expand", { target_aspect_ratio: ratio.value });
                            }}
                          >
                            {ratio.label}
                          </Button>
                        </PopoverClose>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* Animated Dot Pattern Background - moves opposite to pan */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${-panOffset.x}px, ${-panOffset.y}px)`,
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        <DotPattern
          width={20}
          height={20}
          cx={1}
          cy={1}
          cr={1}
          className="text-neutral-400/50"
        />
      </div>
      {/* Loading State */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground">
            Generating your creation...
          </p>
          
          {/* Batch Progress Indicator */}
          {batchExecution && (
            <div className="w-80 space-y-2 mt-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress: {batchExecution.current} / {batchExecution.total}</span>
                <span>{Math.round((batchExecution.current / batchExecution.total) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{width: `${(batchExecution.current / batchExecution.total) * 100}%`}}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {batchExecution.description}
              </p>
            </div>
          )}
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
        <div 
          className="relative w-full h-full flex items-center justify-center"
          style={{
            pointerEvents: 'none'
          }}
        >
          <div
            ref={imageContainerRef}
            className="relative"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out',
              maxWidth: 'calc(100% - 8rem)',
              maxHeight: 'calc(100% - 8rem)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {generatedMedia.type === "image" ? (
              <div className="relative group" style={{ pointerEvents: 'auto' }}>
                <img
                  src={generatedMedia.url}
                  alt="Generated content"
                  className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-lg"
                  style={{
                    maxWidth: '55vw',
                    maxHeight: '60vh',
                  }}
                  draggable={false}
                  onLoad={(e) => {
                    // Sync mask canvas size with image
                    if (isInpaintingActive && maskCanvasRef.current) {
                      const img = e.currentTarget;
                      maskCanvasRef.current.width = img.clientWidth;
                      maskCanvasRef.current.height = img.clientHeight;
                    }
                  }}
                />

                {/* Mask Canvas Overlay for Inpainting */}
                {isInpaintingActive && (
                  <canvas
                    ref={maskCanvasRef}
                    className="absolute top-0 left-0 rounded-lg cursor-crosshair"
                    style={{
                      opacity: 0.6,
                      pointerEvents: 'auto',
                    }}
                    onMouseDown={startMaskDrawing}
                    onMouseMove={drawMask}
                    onMouseUp={stopMaskDrawing}
                    onMouseLeave={() => {
                      if (isDrawing) {
                        setIsDrawing(false);
                        setLastDrawPosition(null);
                      }
                    }}
                  />
                )}

                {/* Toolbar - Top Right corner of image, only visible when fully zoomed out */}
                {zoom === 1 && (
                  <TooltipProvider delayDuration={200}>
                    <div 
                      className={cn(
                        "absolute -bottom-8 right-0 flex items-center transition-opacity duration-200",
                        isInteracting ? "opacity-0" : "opacity-100"
                      )}
                      style={{ 
                        pointerEvents: 'auto',
                        zIndex: 10
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseMove={(e) => e.stopPropagation()}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="p-2 bg-neutral-50/50 text-foreground/60 hover:text-foreground transition-colors"
                            aria-label="Content Credentials"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Image created by AI using Bria.ai</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleExport}
                            className="p-2 bg-neutral-50/50 text-foreground/60 hover:text-foreground transition-colors"
                            aria-label="Download"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleFullscreen}
                            className="p-2 bg-neutral-50/50 text-foreground/60 hover:text-foreground transition-colors"
                            aria-label="Fullscreen"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Fullscreen</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleFeedback('up')}
                            className={cn(
                              "p-2 bg-neutral-50/50 transition-colors",
                              feedback === 'up' 
                                ? "text-primary" 
                                : "text-foreground/60 hover:text-foreground"
                            )}
                            aria-label="Good result"
                          >
                            <ThumbsUp className={cn("h-3.5 w-3.5", feedback === 'up' && "fill-current")} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Good result</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleFeedback('down')}
                            className={cn(
                              "p-2 bg-neutral-50/50 transition-colors",
                              feedback === 'down' 
                                ? "text-primary" 
                                : "text-foreground/60 hover:text-foreground"
                            )}
                            aria-label="Poor result"
                          >
                            <ThumbsDown className={cn("h-3.5 w-3.5", feedback === 'down' && "fill-current")} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Poor result</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                )}
              </div>
            ) : (
              <video
                src={generatedMedia.url}
                controls
                className="max-w-full max-h-full rounded-lg shadow-lg"
                style={{
                  maxWidth: '55vw',
                  maxHeight: '60vh',
                  pointerEvents: 'auto'
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/5 border-4 border-dashed border-primary pointer-events-none" />
      )}

      {/* Mask Action Menu - Appears after drawing */}
      {showMaskMenu && isInpaintingActive && (
        <div 
          className="absolute z-50"
          style={{
            left: `${maskMenuPosition.x}px`,
            top: `${maskMenuPosition.y + 10}px`,
            transform: 'translate(-50%, 0)',
          }}
        >
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-full px-3 py-2 shadow-lg border border-neutral-200/50">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2 hover:bg-neutral-100"
              onClick={() => {
                const maskBase64 = extractMask();
                if (maskBase64 && onOperationExecute) {
                  onOperationExecute("object-eraser", { mask: maskBase64 });
                  // Clear mask and exit inpainting mode
                  if (maskCanvasRef.current) {
                    const ctx = maskCanvasRef.current.getContext('2d');
                    if (ctx) {
                      ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
                    }
                  }
                  setIsInpaintingActive(false);
                  setShowMaskMenu(false);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-sm font-medium">Erase</span>
            </Button>
            <div className="w-px h-6 bg-neutral-200" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2 hover:bg-neutral-100"
              onClick={() => {
                const maskBase64 = extractMask();
                if (maskBase64) {
                  // Store mask data via callback
                  if (onFillMask) {
                    onFillMask(maskBase64);
                  }
                  // Exit inpainting mode
                  setIsInpaintingActive(false);
                  setShowMaskMenu(false);
                  // Clear mask canvas
                  if (maskCanvasRef.current) {
                    const ctx = maskCanvasRef.current.getContext('2d');
                    if (ctx) {
                      ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
                    }
                  }
                  // Focus prompt
                  if (onPromptFocus) {
                    onPromptFocus();
                  }
                }
              }}
            >
              <Wand2 className="h-4 w-4" />
              <span className="text-sm font-medium">Fill</span>
            </Button>
          </div>
        </div>
      )}

      {/* Brush Size Slider - Sticky Bottom */}
      {isInpaintingActive && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-neutral-200/50">
            <label htmlFor="brush-size" className="text-sm font-medium text-neutral-700 whitespace-nowrap">
              Brush Size:
            </label>
            <input
              id="brush-size"
              type="range"
              min="1"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-32 h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="text-sm font-medium text-neutral-700 w-8 text-right">
              {brushSize}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

