"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import type {
  EditingTool,
  SelectionRect,
  TextLayer,
  ImageAdjustments,
} from "@/types/editing";
import { cn } from "@/lib/utils";

interface ImageEditorCanvasProps {
  imageUrl: string;
  activeTool: EditingTool;
  selection: SelectionRect | null;
  maskData: ImageData | null;
  textLayers: TextLayer[];
  imageAdjustments: ImageAdjustments;
  brushSize: number;
  onSelectionChange: (rect: SelectionRect | null) => void;
  onMaskChange: (imageData: ImageData | null) => void;
  onTextLayerUpdate: (id: string, updates: Partial<TextLayer>) => void;
  className?: string;
}

type ResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "none";

export function ImageEditorCanvas({
  imageUrl,
  activeTool,
  selection,
  maskData,
  textLayers,
  imageAdjustments,
  brushSize,
  onSelectionChange,
  onMaskChange,
  onTextLayerUpdate,
  className,
}: ImageEditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  
  // Interaction state
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>("none");
  const [hoveredHandle, setHoveredHandle] = useState<ResizeHandle>("none");
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [movingElement, setMovingElement] = useState<'selection' | 'mask' | 'text' | null>(null);
  const [movingTextId, setMovingTextId] = useState<string | null>(null);
  const [maskOffset, setMaskOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Setup canvas dimensions
  useEffect(() => {
    if (!image || !containerRef.current || !baseCanvasRef.current || !overlayCanvasRef.current) return;

    const container = containerRef.current;
    const baseCanvas = baseCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    // Calculate scale to fit image in container
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imageAspect = image.width / image.height;
    const containerAspect = containerWidth / containerHeight;

    let displayWidth, displayHeight;
    if (imageAspect > containerAspect) {
      displayWidth = containerWidth * 0.9;
      displayHeight = displayWidth / imageAspect;
    } else {
      displayHeight = containerHeight * 0.9;
      displayWidth = displayHeight * imageAspect;
    }

    const scale = displayWidth / image.width;
    setCanvasScale(scale);

    // Set canvas size
    baseCanvas.width = image.width;
    baseCanvas.height = image.height;
    overlayCanvas.width = image.width;
    overlayCanvas.height = image.height;

    // Center canvas
    const offsetX = (containerWidth - displayWidth) / 2;
    const offsetY = (containerHeight - displayHeight) / 2;
    setCanvasOffset({ x: offsetX, y: offsetY });

    // Initialize mask canvas if needed
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
      maskCanvasRef.current.width = image.width;
      maskCanvasRef.current.height = image.height;
    }
  }, [image]);

  // Draw base image with adjustments
  useEffect(() => {
    if (!image || !baseCanvasRef.current) return;

    const canvas = baseCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply image adjustments
    ctx.filter = `
      brightness(${100 + imageAdjustments.brightness}%)
      contrast(${100 + imageAdjustments.contrast}%)
      saturate(${100 + imageAdjustments.saturation}%)
      hue-rotate(${imageAdjustments.hue}deg)
    `;
    
    ctx.drawImage(image, 0, 0);
    ctx.filter = 'none';
  }, [image, imageAdjustments]);

  // Draw overlay (selection, mask, text)
  useEffect(() => {
    if (!overlayCanvasRef.current || !image) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw mask with offset
    if (maskData && (activeTool === 'mask' || activeTool === 'move')) {
      ctx.globalAlpha = 0.4;
      ctx.putImageData(maskData, maskOffset.x, maskOffset.y);
      ctx.globalAlpha = 1.0;
    }

    // Draw selection
    if (selection && (activeTool === 'select' || activeTool === 'move')) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2 / canvasScale;
      ctx.setLineDash([10 / canvasScale, 5 / canvasScale]);
      ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
      ctx.setLineDash([]);

      // Draw resize handles only in select mode
      if (activeTool === 'select') {
        const handleSize = 8 / canvasScale;
        ctx.fillStyle = '#3b82f6';
        const handles = getResizeHandles(selection, handleSize);
        handles.forEach((handle) => {
          ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        });
      }
    }

    // Draw text layers
    if (activeTool === 'text' || activeTool === 'move') {
      textLayers.forEach((layer) => {
        ctx.save();
        ctx.font = `${layer.bold ? 'bold ' : ''}${layer.italic ? 'italic ' : ''}${layer.fontSize}px ${layer.fontFamily}`;
        ctx.fillStyle = layer.color;
        ctx.textAlign = (layer.align || 'left') as CanvasTextAlign;
        ctx.fillText(layer.text, layer.x, layer.y);
        
        // Draw bounding box in move mode
        if (activeTool === 'move') {
          const metrics = ctx.measureText(layer.text);
          const textWidth = metrics.width;
          const textHeight = layer.fontSize;
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1 / canvasScale;
          ctx.setLineDash([5 / canvasScale, 3 / canvasScale]);
          ctx.strokeRect(layer.x, layer.y - textHeight, textWidth, textHeight * 1.2);
          ctx.setLineDash([]);
        }
        
        ctx.restore();
      });
    }

    // Draw brush cursor
    if (activeTool === 'mask' && cursorPos) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2 / canvasScale;
      ctx.beginPath();
      ctx.arc(cursorPos.x, cursorPos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [selection, maskData, textLayers, activeTool, canvasScale, brushSize, cursorPos, image, maskOffset]);

  // Helper: Get resize handles positions
  const getResizeHandles = (rect: SelectionRect, handleSize: number) => {
    return [
      { x: rect.x, y: rect.y, type: 'nw' },
      { x: rect.x + rect.width / 2, y: rect.y, type: 'n' },
      { x: rect.x + rect.width, y: rect.y, type: 'ne' },
      { x: rect.x + rect.width, y: rect.y + rect.height / 2, type: 'e' },
      { x: rect.x + rect.width, y: rect.y + rect.height, type: 'se' },
      { x: rect.x + rect.width / 2, y: rect.y + rect.height, type: 's' },
      { x: rect.x, y: rect.y + rect.height, type: 'sw' },
      { x: rect.x, y: rect.y + rect.height / 2, type: 'w' },
    ];
  };

  // Helper: Check if point is near handle
  const getHandleAtPoint = (x: number, y: number, rect: SelectionRect): ResizeHandle => {
    const handleSize = 8 / canvasScale;
    const threshold = handleSize * 2;
    const handles = getResizeHandles(rect, handleSize);
    
    for (const handle of handles) {
      const dist = Math.sqrt((x - handle.x) ** 2 + (y - handle.y) ** 2);
      if (dist < threshold) {
        return handle.type as ResizeHandle;
      }
    }
    return "none";
  };

  // Helper: Check if point is inside selection
  const isPointInSelection = (x: number, y: number, rect: SelectionRect): boolean => {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  };

  // Helper: Check if point is on text layer
  const getTextLayerAtPoint = (x: number, y: number): string | null => {
    if (!overlayCanvasRef.current) return null;
    const ctx = overlayCanvasRef.current.getContext('2d');
    if (!ctx) return null;

    for (let i = textLayers.length - 1; i >= 0; i--) {
      const layer = textLayers[i];
      ctx.font = `${layer.bold ? 'bold ' : ''}${layer.italic ? 'italic ' : ''}${layer.fontSize}px ${layer.fontFamily}`;
      const metrics = ctx.measureText(layer.text);
      const textWidth = metrics.width;
      const textHeight = layer.fontSize;
      
      if (
        x >= layer.x &&
        x <= layer.x + textWidth &&
        y >= layer.y - textHeight &&
        y <= layer.y + textHeight * 0.2
      ) {
        return layer.id;
      }
    }
    return null;
  };

  // Helper: Check if point is on mask
  const isPointOnMask = (x: number, y: number): boolean => {
    if (!maskData) return false;
    const maskX = Math.floor(x - maskOffset.x);
    const maskY = Math.floor(y - maskOffset.y);
    
    if (maskX < 0 || maskX >= maskData.width || maskY < 0 || maskY >= maskData.height) {
      return false;
    }
    
    const index = (maskY * maskData.width + maskX) * 4;
    return maskData.data[index + 3] > 0; // Check alpha channel
  };

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (screenX - rect.left - canvasOffset.x) / canvasScale;
      const y = (screenY - rect.top - canvasOffset.y) / canvasScale;
      return { x, y };
    },
    [canvasScale, canvasOffset]
  );

  // Mouse down handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = screenToCanvas(e.clientX, e.clientY);

      if (activeTool === 'move') {
        // Check what element to move
        const textId = getTextLayerAtPoint(pos.x, pos.y);
        if (textId) {
          setMovingElement('text');
          setMovingTextId(textId);
          setDragStart(pos);
          setIsDrawing(true);
          return;
        }
        
        if (selection && isPointInSelection(pos.x, pos.y, selection)) {
          setMovingElement('selection');
          setDragStart(pos);
          setIsDrawing(true);
          return;
        }
        
        if (maskData && isPointOnMask(pos.x, pos.y)) {
          setMovingElement('mask');
          setDragStart(pos);
          setIsDrawing(true);
          return;
        }
      } else if (activeTool === 'select') {
        if (selection) {
          const handle = getHandleAtPoint(pos.x, pos.y, selection);
          if (handle !== 'none') {
            setResizeHandle(handle);
            setDragStart(pos);
            setIsDrawing(true);
            return;
          }
        }
        // Start new selection
        setDragStart(pos);
        setIsDrawing(true);
        onSelectionChange({ x: pos.x, y: pos.y, width: 0, height: 0 });
      } else if (activeTool === 'mask') {
        setIsDrawing(true);
        setDragStart(pos);
        // Initialize mask if needed
        if (!maskData && maskCanvasRef.current) {
          const ctx = maskCanvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
          }
        }
        // Start painting
        paintMask(pos.x, pos.y, e.altKey);
      }
    },
    [activeTool, selection, maskData, screenToCanvas, onSelectionChange, textLayers, maskOffset]
  );

  // Mouse move handler
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setCursorPos(pos);

      if (activeTool === 'select' && selection) {
        const handle = getHandleAtPoint(pos.x, pos.y, selection);
        setHoveredHandle(handle);
      }

      if (!isDrawing || !dragStart) return;

      if (activeTool === 'move' && movingElement) {
        const dx = pos.x - dragStart.x;
        const dy = pos.y - dragStart.y;

        if (movingElement === 'selection' && selection) {
          onSelectionChange({
            ...selection,
            x: selection.x + dx,
            y: selection.y + dy,
          });
          setDragStart(pos);
        } else if (movingElement === 'mask') {
          setMaskOffset((prev) => ({
            x: prev.x + dx,
            y: prev.y + dy,
          }));
          setDragStart(pos);
        } else if (movingElement === 'text' && movingTextId) {
          onTextLayerUpdate(movingTextId, {
            x: textLayers.find((l) => l.id === movingTextId)!.x + dx,
            y: textLayers.find((l) => l.id === movingTextId)!.y + dy,
          });
          setDragStart(pos);
        }
      } else if (activeTool === 'select') {
        if (resizeHandle !== 'none' && selection) {
          // Resize selection (allow beyond image boundaries)
          const newRect = { ...selection };
          const dx = pos.x - dragStart.x;
          const dy = pos.y - dragStart.y;

          if (resizeHandle.includes('n')) {
            newRect.y += dy;
            newRect.height -= dy;
          }
          if (resizeHandle.includes('s')) {
            newRect.height += dy;
          }
          if (resizeHandle.includes('w')) {
            newRect.x += dx;
            newRect.width -= dx;
          }
          if (resizeHandle.includes('e')) {
            newRect.width += dx;
          }

          onSelectionChange(newRect);
          setDragStart(pos);
        } else {
          // Draw new selection (allow beyond image boundaries)
          const width = pos.x - dragStart.x;
          const height = pos.y - dragStart.y;
          onSelectionChange({
            x: width < 0 ? pos.x : dragStart.x,
            y: height < 0 ? pos.y : dragStart.y,
            width: Math.abs(width),
            height: Math.abs(height),
          });
        }
      } else if (activeTool === 'mask') {
        paintMask(pos.x, pos.y, e.altKey);
      }
    },
    [
      activeTool,
      isDrawing,
      dragStart,
      selection,
      resizeHandle,
      screenToCanvas,
      onSelectionChange,
      movingElement,
      movingTextId,
      textLayers,
      onTextLayerUpdate,
    ]
  );

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setDragStart(null);
    setResizeHandle('none');
    setMovingElement(null);
    setMovingTextId(null);
    
    // Update mask data
    if (activeTool === 'mask' && maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(
          0,
          0,
          maskCanvasRef.current.width,
          maskCanvasRef.current.height
        );
        onMaskChange(imageData);
      }
    }
    
    // Apply mask offset permanently when moving is done
    if (activeTool === 'move' && movingElement === 'mask' && maskData && (maskOffset.x !== 0 || maskOffset.y !== 0)) {
      const newMaskCanvas = document.createElement('canvas');
      newMaskCanvas.width = maskData.width;
      newMaskCanvas.height = maskData.height;
      const ctx = newMaskCanvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(maskData, maskOffset.x, maskOffset.y);
        const newImageData = ctx.getImageData(0, 0, newMaskCanvas.width, newMaskCanvas.height);
        onMaskChange(newImageData);
        setMaskOffset({ x: 0, y: 0 });
      }
    }
  }, [activeTool, onMaskChange, movingElement, maskData, maskOffset]);

  // Paint mask function
  const paintMask = useCallback(
    (x: number, y: number, erase: boolean) => {
      if (!maskCanvasRef.current) return;

      const ctx = maskCanvasRef.current.getContext('2d');
      if (!ctx) return;

      ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
      ctx.fillStyle = 'rgba(255, 0, 0, 255)';
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();

      // Update overlay
      const imageData = ctx.getImageData(
        0,
        0,
        maskCanvasRef.current.width,
        maskCanvasRef.current.height
      );
      if (overlayCanvasRef.current) {
        const overlayCtx = overlayCanvasRef.current.getContext('2d');
        if (overlayCtx) {
          overlayCtx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
          overlayCtx.globalAlpha = 0.4;
          overlayCtx.putImageData(imageData, 0, 0);
          overlayCtx.globalAlpha = 1.0;
        }
      }
    },
    [brushSize]
  );

  // Get cursor style
  const getCursorStyle = () => {
    if (activeTool === 'move') {
      // Show appropriate cursor based on what can be moved
      if (cursorPos) {
        const textId = getTextLayerAtPoint(cursorPos.x, cursorPos.y);
        if (textId) return 'move';
        if (selection && isPointInSelection(cursorPos.x, cursorPos.y, selection)) return 'move';
        if (maskData && isPointOnMask(cursorPos.x, cursorPos.y)) return 'move';
      }
      return 'default';
    }
    if (activeTool === 'mask') return 'crosshair';
    if (activeTool === 'text') return 'text';
    if (activeTool === 'select') {
      if (hoveredHandle !== 'none') {
        const cursorMap: Record<string, string> = {
          nw: 'nw-resize',
          n: 'n-resize',
          ne: 'ne-resize',
          e: 'e-resize',
          se: 'se-resize',
          s: 's-resize',
          sw: 'sw-resize',
          w: 'w-resize',
        };
        return cursorMap[hoveredHandle] || 'default';
      }
      return 'crosshair';
    }
    return 'default';
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden", className)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        setCursorPos(null);
      }}
      style={{ cursor: getCursorStyle() }}
    >
      {image && (
        <div
          className="absolute"
          style={{
            left: canvasOffset.x,
            top: canvasOffset.y,
            width: image.width * canvasScale,
            height: image.height * canvasScale,
          }}
        >
          <canvas
            ref={baseCanvasRef}
            className="absolute top-0 left-0"
            style={{
              width: '100%',
              height: '100%',
              imageRendering: 'auto',
            }}
          />
          <canvas
            ref={overlayCanvasRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: '100%',
              height: '100%',
              imageRendering: 'auto',
            }}
          />
        </div>
      )}
    </div>
  );
}

