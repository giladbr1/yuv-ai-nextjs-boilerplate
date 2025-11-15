"use client";

import React, { Suspense, useState, useRef, useCallback } from "react";
import { LeftSidebar } from "@/components/bria/LeftSidebar";
import { GeminiSidebar } from "@/components/bria/GeminiSidebar";
import { useBriaGeneration } from "@/hooks/useBriaGeneration";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// Lazy load heavy components to reduce initial bundle size
const GenerationCanvas = dynamic(
  () => import("@/components/bria/GenerationCanvas").then((mod) => ({ default: mod.GenerationCanvas })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading canvas...</div>
      </div>
    ),
    ssr: false,
  }
);

const GalleryBar = dynamic(
  () => import("@/components/bria/GalleryBar").then((mod) => ({ default: mod.GalleryBar })),
  {
    loading: () => (
      <div className="h-full w-[90px] bg-background/50 border-l flex items-center justify-center">
        <div className="text-xs text-muted-foreground">Loading...</div>
      </div>
    ),
    ssr: false,
  }
);

export default function Home() {
  const {
    messages,
    params,
    generatedMedia,
    galleryItems,
    activeItemId,
    isGenerating,
    error,
    editingState,
    uploadedImageContext,
    activeOperation,
    operationLoadingName,
    batchExecution,
    updateParams,
    generate,
    uploadImageForReference,
    uploadImageForDisplay,
    surpriseMe,
    clearError,
    clearUploadedImageContext,
    setActiveItem,
    setActiveTool,
    updateSelection,
    updateMask,
    addTextLayer,
    updateTextLayer,
    updateImageAdjustments,
    setBrushSize,
    clearEditingState,
    selectOperation,
    cancelOperation,
    executeOneClickOperation,
    setInpaintingMask,
    restoreParametersFromGallery,
  } = useBriaGeneration();

  // Inpainting state
  const [shouldFocusPrompt, setShouldFocusPrompt] = React.useState(false);
  const [customPlaceholder, setCustomPlaceholder] = React.useState<string>();
  const prevIsGeneratingRef = React.useRef(isGenerating);

  // Gallery resize state
  const DEFAULT_GALLERY_WIDTH = 100;
  const MIN_GALLERY_WIDTH = 100;
  const MAX_GALLERY_WIDTH = 160;
  const [galleryWidth, setGalleryWidth] = useState(DEFAULT_GALLERY_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(DEFAULT_GALLERY_WIDTH);
  const isResizingRef = useRef(false);

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const SIDEBAR_WIDTH = 256; // 64 * 4 = 256px (w-64)
  const COLLAPSED_SIDEBAR_WIDTH = 64; // w-16 = 64px

  // Define DEFAULT_PARAMS locally since it's not exported from the hook
  const DEFAULT_PARAMS = {
    mode: "image" as const,
    model_version: "Fibo" as const,
    modelInfluence: 0.8,
    steps: 50,
    aspectRatio: "1:1",
    seed: "random",
    prompt: "",
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    
    const deltaX = resizeStartX.current - e.clientX; // Negative when dragging left (making gallery wider)
    const newWidth = Math.max(MIN_GALLERY_WIDTH, Math.min(MAX_GALLERY_WIDTH, resizeStartWidth.current + deltaX));
    setGalleryWidth(newWidth);
  }, []);

  const handleResizeEnd = useCallback(() => {
    isResizingRef.current = false;
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = galleryWidth;
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [galleryWidth, handleResizeMove, handleResizeEnd]);

  // Prevent text selection during resize
  React.useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [handleResizeMove, handleResizeEnd]);

  // Auto-focus on page load
  React.useEffect(() => {
    setShouldFocusPrompt(true);
  }, []);

  // Auto-focus after generation completes
  React.useEffect(() => {
    if (prevIsGeneratingRef.current && !isGenerating) {
      // Generation just completed
      setShouldFocusPrompt(true);
    }
    prevIsGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  React.useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // ESC key handler to close active tool or cancel operation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeOperation) {
          cancelOperation();
        } else if (editingState.activeTool !== 'none') {
          setActiveTool('none');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingState.activeTool, activeOperation, setActiveTool, cancelOperation]);

  // Reset function - clears all state
  const handleReset = useCallback(() => {
    // Reset messages to initial state
    updateParams(DEFAULT_PARAMS);
    clearUploadedImageContext();
    clearEditingState();
    setActiveItem(undefined);
    clearError();
    // Reset local state
    setShouldFocusPrompt(false);
    setCustomPlaceholder(undefined);
    // Note: We can't directly reset messages/generatedMedia/galleryItems from here
    // as they're managed by the hook. We'll need to add a reset function to the hook
    // or use window.location.reload() for a full reset
    window.location.reload();
  }, [updateParams, clearUploadedImageContext, clearEditingState, setActiveItem, clearError]);

  return (
    <div className="flex flex-col h-screen overflow-hidden relative">
      {/* Gemini Sidebar */}
      <GeminiSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onNewChat={handleReset}
      />

      {/* Main Content - Offset by sidebar width (expands in place) */}
      <div 
        className="flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out"
        style={{ 
          marginLeft: isSidebarOpen ? `${SIDEBAR_WIDTH}px` : `${COLLAPSED_SIDEBAR_WIDTH}px`
        }}
      >
        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Instructions & Controls */}
          <div className="w-[25%] border-r bg-background flex-shrink-0">
            <LeftSidebar
              messages={messages}
              params={params}
              onParamsChange={updateParams}
              onGenerate={generate}
              onImageUpload={uploadImageForReference}
              onRemoveImage={clearUploadedImageContext}
              onSurpriseMe={surpriseMe}
              isGenerating={isGenerating}
              customPlaceholder={customPlaceholder}
              shouldFocusPrompt={shouldFocusPrompt}
              onPromptFocused={() => {
                setShouldFocusPrompt(false);
                setCustomPlaceholder(undefined);
              }}
              uploadedImageContext={uploadedImageContext}
            />
          </div>

          {/* Right Canvas - Generation Area with Gallery */}
          <div className="flex-1 flex bg-muted/30">
            {/* Main Generation Display */}
            <div className="flex-1 overflow-hidden" style={{ minWidth: 0 }}>
              <GenerationCanvas
                generatedMedia={generatedMedia}
                isGenerating={isGenerating}
                batchExecution={batchExecution}
                onFileUpload={uploadImageForDisplay}
                className="h-full w-full"
                hasImage={!!generatedMedia}
                onOperationExecute={executeOneClickOperation}
                onAspectRatioChange={(aspectRatio) => updateParams({ aspectRatio })}
                onPromptFocus={() => {
                  setCustomPlaceholder("What would you like to see in the masked area?");
                  setShouldFocusPrompt(true);
                }}
                onFillMask={(maskBase64) => {
                  setInpaintingMask(maskBase64);
                }}
              />
            </div>
            
            {/* Resize Handle */}
            <div
              onMouseDown={handleResizeStart}
              className={`
                w-1 cursor-col-resize hover:w-2 hover:bg-primary/50 transition-all relative
                ${isResizing ? 'bg-primary w-2' : 'bg-transparent'}
              `}
              style={{ userSelect: 'none' }}
              title="Drag to resize gallery"
            >
              {/* Visual indicator line */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border opacity-50" />
            </div>
            
            {/* Gallery Bar - Vertical on Right */}
            <GalleryBar
              items={galleryItems}
              activeItemId={activeItemId}
              onItemClick={setActiveItem}
              onUseItem={restoreParametersFromGallery}
              width={galleryWidth}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
